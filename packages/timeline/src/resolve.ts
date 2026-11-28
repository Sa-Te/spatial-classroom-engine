import { primitiveRegistry, type Cue, type CueSheet, type WordTiming } from '@sce/contracts';
import type { ProblemCode, ResolutionProblem, ResolveResult } from './result.js';
import { sortTimeline, type TimelineEntry } from './timeline.js';

export interface ResolveInput {
  cueSheet: CueSheet;
  wordTimings: Record<string, WordTiming[] | null>;
}

/**
 * Turns authored intent into time. Pure: no clock, no I/O, no randomness
 * (AGENTS.md §1.1 invariant 3). A word-anchored cue lands on that word's exact
 * `startMs`; an explicit cue keeps its `offsetMs`.
 *
 * Invalid authoring data is a typed rejection, never a throw: the caller decides
 * what to do with a sheet that cannot be played.
 */
export function resolve(input: ResolveInput): ResolveResult {
  const problems: ResolutionProblem[] = [];
  const builtEntries: TimelineEntry[] = [];

  for (const cue of input.cueSheet.cues) {
    if ('offsetMs' in cue.at) {
      builtEntries.push(entryFor(cue, cue.at.offsetMs));
      continue;
    }

    const { utteranceId, wordIndex } = cue.at;
    const timings = input.wordTimings[utteranceId];

    if (timings === null || timings === undefined) {
      problems.push({
        cueId: cue.id,
        code: 'TIMINGS_MISSING',
        detail: `cue ${cue.id} is anchored to word ${wordIndex} of utterance '${utteranceId}', which has no word timings`,
      });
      continue;
    }

    const arrayProblem = timingArrayProblem(timings);
    if (arrayProblem !== null) {
      problems.push({
        cueId: cue.id,
        code: arrayProblem,
        detail:
          arrayProblem === 'TIMINGS_OUT_OF_ORDER'
            ? `cue ${cue.id} reads the timings for utterance '${utteranceId}', whose startMs values are not strictly ascending`
            : `cue ${cue.id} reads the timings for utterance '${utteranceId}', where a word ends after the next word starts`,
      });
      continue;
    }

    const outOfRange = (): ResolutionProblem => ({
      cueId: cue.id,
      code: 'WORD_INDEX_OUT_OF_RANGE',
      detail: `cue ${cue.id} is anchored to word ${wordIndex} of utterance '${utteranceId}', which has ${timings.length} words`,
    });

    if (wordIndex < 0 || wordIndex >= timings.length) {
      problems.push(outOfRange());
      continue;
    }

    const word = timings[wordIndex];
    if (word === undefined) {
      // Unreachable after the range check above; it keeps the indexed read honest
      // without a non-null assertion on a caller-supplied array.
      problems.push(outOfRange());
      continue;
    }

    builtEntries.push(entryFor(cue, word.startMs));
  }

  if (problems.length > 0) return { ok: false, problems };

  const finalWordEndMs = finalWordEnd(input.cueSheet, input.wordTimings);
  return {
    ok: true,
    timeline: {
      entries: sortTimeline(builtEntries),
      // Silence is content (§1.7.1): the timeline covers the last word even when
      // no cue reaches it, and an entry that outlasts the speech extends it.
      durationMs: builtEntries.reduce(
        (latestMs, entry) => Math.max(latestMs, entry.atMs + entry.durationMs),
        finalWordEndMs,
      ),
    },
  };
}

/**
 * The first timing-array defect that makes every cue reading this array
 * unplaceable. Only arrays a cue actually references are checked, so an unused
 * bad array is not this sheet's problem.
 */
function timingArrayProblem(timings: readonly WordTiming[]): ProblemCode | null {
  for (let index = 1; index < timings.length; index += 1) {
    const previous = timings[index - 1];
    const current = timings[index];
    if (previous === undefined || current === undefined) continue;
    if (current.startMs <= previous.startMs) return 'TIMINGS_OUT_OF_ORDER';
    if (previous.endMs > current.startMs) return 'TIMINGS_OVERLAP';
  }
  return null;
}

/**
 * The end of the last word of the last utterance, or 0 when that utterance has no
 * timings — a silent tail contributes nothing to the lesson's length.
 */
function finalWordEnd(
  cueSheet: CueSheet,
  wordTimings: Record<string, WordTiming[] | null>,
): number {
  const lastUtterance = cueSheet.utterances.at(-1);
  if (lastUtterance === undefined) return 0;
  const lastWord = wordTimings[lastUtterance.id]?.at(-1);
  return lastWord === undefined ? 0 : lastWord.endMs;
}

function entryFor(cue: Cue, atMs: number): TimelineEntry {
  return {
    cueId: cue.id,
    atMs,
    primitive: cue.primitive,
    // The primitive's registry track, not the cue's own `track` field: the cue
    // sheet also admits board and audio, which TimelineEntry does not, and this
    // lookup is total over the closed nine. Whether the two agree is a
    // scene-aware rule for T12/T15, not the resolver's.
    track: primitiveRegistry[cue.primitive].track,
    durationMs: durationOf(cue),
    // Exactness is a claim about placement; only T11's fallback may set true.
    approximate: false,
  };
}

/**
 * A cue's declared length, in milliseconds, from the one parameter that carries a
 * duration. Every other primitive is instantaneous: a cut, a look, a point.
 */
function durationOf(cue: Cue): number {
  switch (cue.primitive) {
    case 'scene.animateParam':
      return cue.params.durationMs;
    case 'learner.holdSilence':
      return cue.params.ms;
    default:
      return 0;
  }
}
