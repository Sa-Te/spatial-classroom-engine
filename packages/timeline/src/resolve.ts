import { primitiveRegistry, type Cue, type CueSheet, type WordTiming } from '@sce/contracts';
import { placeByFallback, type FallbackRefusal, type UtteranceMeasurement } from './fallback.js';
import type { ProblemCode, ResolutionProblem, ResolveResult } from './result.js';
import { sortTimeline, type TimelineEntry } from './timeline.js';

/**
 * Everything the resolver needs about the speech, in one table keyed by
 * utterance id (TECHNICAL_DESIGN §10.2). An absent key is an utterance nobody
 * measured; there is no second, parallel map of word timings (T11).
 */
export interface ResolveInput {
  cueSheet: CueSheet;
  utterances: Record<string, UtteranceMeasurement>;
}

/** A cue placed by a word timing. `approximate` is a type here, not a flag. */
export type ExactEntry = TimelineEntry & { approximate: false };

/** A cue placed by the fallback. It cannot be built without saying so. */
export type ApproximateEntry = TimelineEntry & { approximate: true };

/**
 * Turns authored intent into time. Pure: no clock, no I/O, no randomness
 * (AGENTS.md §1.1 invariant 3). A word-anchored cue lands on that word's exact
 * `startMs`; an explicit cue keeps its `offsetMs`. A word-anchored cue whose
 * utterance has no word timings falls back to an even spread across the measured
 * duration and is marked approximate. There is no third path: a cue the data
 * cannot place is a named problem, never a default instant.
 *
 * Invalid authoring data is a typed rejection, never a throw: the caller decides
 * what to do with a sheet that cannot be played.
 */
export function resolve(input: ResolveInput): ResolveResult {
  const problems: ResolutionProblem[] = [];
  const builtEntries: TimelineEntry[] = [];

  for (const cue of input.cueSheet.cues) {
    if ('offsetMs' in cue.at) {
      builtEntries.push(exactEntry(cue, cue.at.offsetMs));
      continue;
    }

    const { utteranceId, wordIndex } = cue.at;
    const measurement = input.utterances[utteranceId];

    if (measurement === undefined) {
      problems.push({
        cueId: cue.id,
        code: 'TIMINGS_MISSING',
        detail: `cue ${cue.id} is anchored to word ${wordIndex} of utterance '${utteranceId}', which has no measurement`,
      });
      continue;
    }

    // Null and an empty array both mean "no word timings". A present, non-empty
    // array is validated before this cue reads it: an ordering defect is not a
    // reason to fall back, it is a reason to refuse.
    const timings = measurement.wordTimings;
    if (timings !== null && timings.length > 0) {
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

      // WordTiming.startMs is utterance-relative (§8.2), so the utterance's own
      // start is added. T10's numbers are unchanged because those utterances
      // start at 0.
      builtEntries.push(exactEntry(cue, measurement.startMs + word.startMs));
      continue;
    }

    const placement = placeByFallback(
      measurement,
      wordIndex,
      textOfUtterance(input.cueSheet, utteranceId),
    );
    if (!placement.ok) {
      problems.push(fallbackProblem(cue.id, utteranceId, wordIndex, placement.refusal));
      continue;
    }

    builtEntries.push(approximateEntry(cue, placement.atMs));
  }

  if (problems.length > 0) return { ok: false, problems };

  const entries = sortTimeline(builtEntries);
  return {
    ok: true,
    timeline: {
      entries,
      // Read from the entries themselves, in the order the player sees them, so
      // this list cannot drift from the markers it reports.
      approximateCueIds: entries.flatMap((entry) => (entry.approximate ? [entry.cueId] : [])),
      // Silence is content (§1.7.1): the timeline covers the last utterance even
      // when no cue reaches it, and an entry that outlasts the speech extends it.
      durationMs: entries.reduce(
        (latestMs, entry) => Math.max(latestMs, entry.atMs + entry.durationMs),
        finalUtteranceEndMs(input.cueSheet, input.utterances),
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
 * The refusal on the fallback path, as a named problem. Two of the three are
 * `TIMINGS_MISSING` because there is nothing to measure; an index beyond the
 * script text's words is the code the exact path already uses (T10).
 */
function fallbackProblem(
  cueId: string,
  utteranceId: string,
  wordIndex: number,
  refusal: FallbackRefusal,
): ResolutionProblem {
  const anchoredTo = `cue ${cueId} is anchored to word ${wordIndex} of utterance '${utteranceId}'`;
  switch (refusal) {
    case 'NO_DURATION_MS':
      return {
        cueId,
        code: 'TIMINGS_MISSING',
        detail: `${anchoredTo}, which has no word timings and no measured duration`,
      };
    case 'NO_WORDS':
      return {
        cueId,
        code: 'TIMINGS_MISSING',
        detail: `${anchoredTo}, whose script text has no words, so there is no word count to place it against`,
      };
    case 'WORD_INDEX_OUT_OF_RANGE':
      return {
        cueId,
        code: 'WORD_INDEX_OUT_OF_RANGE',
        detail: `${anchoredTo}, which is past the last word of its script text`,
      };
  }
}

/** An utterance's script text, or `''` when the sheet does not carry that id. */
function textOfUtterance(cueSheet: CueSheet, utteranceId: string): string {
  return cueSheet.utterances.find((utterance) => utterance.id === utteranceId)?.text ?? '';
}

/**
 * Where the speech of the last utterance ends, or 0 when that utterance is
 * unmeasured — a silent tail contributes nothing to the lesson's length. A
 * measured but untimed utterance still ends at `startMs + durationMs`, so a
 * fallback-placed lesson is as long as the speech it was built from.
 */
function finalUtteranceEndMs(
  cueSheet: CueSheet,
  utterances: Record<string, UtteranceMeasurement>,
): number {
  const lastUtterance = cueSheet.utterances.at(-1);
  if (lastUtterance === undefined) return 0;
  const measurement = utterances[lastUtterance.id];
  if (measurement === undefined) return 0;
  const lastWord = measurement.wordTimings?.at(-1);
  if (lastWord !== undefined) return measurement.startMs + lastWord.endMs;
  return measurement.durationMs > 0 ? measurement.startMs + measurement.durationMs : 0;
}

export function exactEntry(cue: Cue, atMs: number): ExactEntry {
  return { ...entryBody(cue, atMs), approximate: false };
}

export function approximateEntry(cue: Cue, atMs: number): ApproximateEntry {
  return { ...entryBody(cue, atMs), approximate: true };
}

/** Everything an entry carries except the placement marker, built once for both paths. */
function entryBody(cue: Cue, atMs: number): Omit<TimelineEntry, 'approximate'> {
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
