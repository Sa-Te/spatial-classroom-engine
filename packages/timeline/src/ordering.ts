import { primitiveRegistry, type Cue } from '@sce/contracts';
import type { ResolveInput } from './resolve.js';
import type { ProblemCode, ResolutionProblem, ResolveResult } from './result.js';
import type { Timeline, TimelineEntry } from './timeline.js';

/**
 * The ordering and structural pass over an already-resolved timeline
 * (TECHNICAL_DESIGN §10.4, T12). It consumes the timeline `resolve` produced —
 * it never calls `resolve`, never re-sorts the entries and returns that same
 * object on success — and it reports refusals in the shared `ResolveResult`
 * shape rather than a second result type.
 *
 * Pure like the resolver: no clock, no I/O, no randomness. Authored data is
 * untrusted, so every refusal is a named problem, never a throw.
 */

/** The five codes this pass owns; the resolver's four are not in its vocabulary. */
type OrderingCode = Extract<
  ProblemCode,
  | 'TRACK_MISMATCH'
  | 'POINT_WITHOUT_LOOKAT'
  | 'POINT_AFTER_WORD'
  | 'SETPARAM_OVERLAP'
  | 'NON_CAMERA_IN_SILENCE'
>;

/**
 * One stable phrase per rule, carried as `ResolutionProblem.rule` so a report can
 * say what was violated without the reader holding a code table. `code` stays
 * the machine-checked identifier.
 */
const RULE_NAMES: Record<OrderingCode, string> = {
  TRACK_MISMATCH: 'cue track matches its primitive track',
  POINT_WITHOUT_LOOKAT: 'look at the target before pointing at it',
  POINT_AFTER_WORD: 'point on or before the word that names the target',
  SETPARAM_OVERLAP: 'an animateParam bridges two setParams on one parameter',
  NON_CAMERA_IN_SILENCE: 'only camera cues run during a silence',
};

/** A problem with the instant that orders it: `ResolutionProblem` carries no time. */
interface TimedProblem {
  readonly atMs: number;
  readonly problem: ResolutionProblem;
}

/** Records a problem against the offending entry; the entry supplies `cueId` and `atMs`. */
type Emit = (entry: TimelineEntry, code: OrderingCode, detail: string) => void;

export function checkOrdering(input: ResolveInput, timeline: Timeline): ResolveResult {
  // The cue sheet is read for `cue.track` and `cue.params`, which the timeline
  // entry does not carry. An id the sheet does not know is skipped: the timeline
  // was resolved from this sheet, so there is no rule to apply to a stranger.
  const cues = new Map(input.cueSheet.cues.map((cue) => [cue.id, cue] as const));
  const found: TimedProblem[] = [];
  const emit: Emit = (entry, code, detail) => {
    found.push({
      atMs: entry.atMs,
      problem: { cueId: entry.cueId, code, rule: RULE_NAMES[code], detail },
    });
  };

  checkTrack(timeline.entries, cues, emit);
  checkPointLookAt(timeline.entries, cues, emit);
  checkPointAfterWord(timeline.entries, cues, input, emit);
  checkSetParamOverlap(timeline.entries, cues, emit);
  checkSilence(timeline.entries, emit);

  if (found.length === 0) return { ok: true, timeline };
  return { ok: false, problems: orderedProblems(found) };
}

/**
 * TRACK_MISMATCH: the cue's declared track must equal its primitive's registry
 * track. The cue sheet admits `board` and `audio`, which no primitive is on, and
 * a mislabelled cue lands in the wrong player group. This rule is T12's alone;
 * T15 does not own it.
 */
function checkTrack(
  entries: readonly TimelineEntry[],
  cues: ReadonlyMap<string, Cue>,
  emit: Emit,
): void {
  for (const entry of entries) {
    const cue = cues.get(entry.cueId);
    if (cue === undefined) continue;
    const expected = primitiveRegistry[cue.primitive].track;
    if (cue.track === expected) continue;
    emit(
      entry,
      'TRACK_MISMATCH',
      `cue ${cue.id} declares track '${cue.track}', but '${cue.primitive}' is on the '${expected}' track`,
    );
  }
}

/**
 * POINT_WITHOUT_LOOKAT: §1.7.2's deixis order. A point on target `t` at `T` needs
 * a lookAt on exactly the same `t` at or before `T`; equality at `T` satisfies
 * it, and a lookAt on a different anchor never does.
 */
function checkPointLookAt(
  entries: readonly TimelineEntry[],
  cues: ReadonlyMap<string, Cue>,
  emit: Emit,
): void {
  const looks: { atMs: number; target: string }[] = [];
  for (const entry of entries) {
    const cue = cues.get(entry.cueId);
    if (cue === undefined) continue;
    if (entry.primitive !== 'teacher.lookAt' || cue.primitive !== 'teacher.lookAt') continue;
    looks.push({ atMs: entry.atMs, target: cue.params.target });
  }

  for (const entry of entries) {
    const cue = cues.get(entry.cueId);
    if (cue === undefined) continue;
    if (entry.primitive !== 'teacher.point' || cue.primitive !== 'teacher.point') continue;
    const target = cue.params.target;
    const looked = looks.some((look) => look.target === target && look.atMs <= entry.atMs);
    if (looked) continue;
    emit(
      entry,
      'POINT_WITHOUT_LOOKAT',
      `cue ${cue.id} points at '${target}' at ${entry.atMs}ms with no teacher.lookAt on '${target}' at or before that instant`,
    );
  }
}

/**
 * POINT_AFTER_WORD: the point must not trail the spoken word that names its
 * target. Measured against the point cue's own utterance only, and only when
 * that utterance has word timings — with none, nothing is known about when the
 * word was said, so the rule passes vacuously rather than guessing.
 */
function checkPointAfterWord(
  entries: readonly TimelineEntry[],
  cues: ReadonlyMap<string, Cue>,
  input: ResolveInput,
  emit: Emit,
): void {
  for (const entry of entries) {
    const cue = cues.get(entry.cueId);
    if (cue === undefined) continue;
    if (entry.primitive !== 'teacher.point' || cue.primitive !== 'teacher.point') continue;
    // An explicitly offset point is not anchored to speech, so no word of the
    // sheet is "the word that names it".
    if (!('utteranceId' in cue.at)) continue;

    const measurement = input.utterances[cue.at.utteranceId];
    const timings = measurement?.wordTimings;
    if (measurement === undefined || timings === null || timings === undefined) continue;
    if (timings.length === 0) continue;

    const named = namingForm(cue.params.target);
    if (named === '') continue;

    const early = timings.find(
      (timing) =>
        namingForm(timing.word) === named && measurement.startMs + timing.startMs < entry.atMs,
    );
    if (early === undefined) continue;
    emit(
      entry,
      'POINT_AFTER_WORD',
      `cue ${cue.id} points at '${cue.params.target}' at ${entry.atMs}ms, after the word '${early.word}' that names it began at ${measurement.startMs + early.startMs}ms`,
    );
  }
}

/**
 * The naming form of an anchor or a spoken word, adopted by instruction at T12
 * (§10.4): the last dotted segment, lowercased, with every non-letter removed.
 * 'sun.Earth' and 'Earth,' both become 'earth'. A target with no letters left
 * names nothing, so it can never match a word.
 */
function namingForm(name: string): string {
  const lastSegment = name.split('.').at(-1) ?? '';
  return lastSegment.toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * SETPARAM_OVERLAP: a second `scene.setParam` on one parameter needs an
 * intervening `scene.animateParam` on that same parameter. The window opens at
 * the earlier setParam and closes at an animateParam after it and at or before
 * the later setParam; without one, the later write lands mid-interpolation and
 * the earlier one is silently overwritten.
 */
function checkSetParamOverlap(
  entries: readonly TimelineEntry[],
  cues: ReadonlyMap<string, Cue>,
  emit: Emit,
): void {
  const writes: { entry: TimelineEntry; parameter: string }[] = [];
  const animations: { atMs: number; parameter: string }[] = [];
  for (const entry of entries) {
    const cue = cues.get(entry.cueId);
    if (cue === undefined) continue;
    if (entry.primitive === 'scene.animateParam' && cue.primitive === 'scene.animateParam') {
      animations.push({ atMs: entry.atMs, parameter: cue.params.parameter });
      continue;
    }
    if (entry.primitive === 'scene.setParam' && cue.primitive === 'scene.setParam') {
      writes.push({ entry, parameter: cue.params.parameter });
    }
  }

  const byParameter = new Map<string, { entry: TimelineEntry; parameter: string }[]>();
  for (const write of writes) {
    const group = byParameter.get(write.parameter);
    if (group === undefined) byParameter.set(write.parameter, [write]);
    else group.push(write);
  }

  for (const group of byParameter.values()) {
    const inOrder = [...group].sort(
      (a, b) => a.entry.atMs - b.entry.atMs || compareCueIds(a.entry.cueId, b.entry.cueId),
    );
    for (let index = 1; index < inOrder.length; index += 1) {
      const earlier = inOrder[index - 1];
      const later = inOrder[index];
      if (earlier === undefined || later === undefined) continue;
      const bridged = animations.some(
        (animation) =>
          animation.parameter === later.parameter &&
          animation.atMs > earlier.entry.atMs &&
          animation.atMs <= later.entry.atMs,
      );
      if (bridged) continue;
      emit(
        later.entry,
        'SETPARAM_OVERLAP',
        `cue ${later.entry.cueId} sets '${later.parameter}' at ${later.entry.atMs}ms with no scene.animateParam on it between ${earlier.entry.cueId} at ${earlier.entry.atMs}ms and this cue`,
      );
    }
  }
}

/**
 * NON_CAMERA_IN_SILENCE: a declared silence is the learner's turn, so only the
 * camera may act inside it. The window is `[T, T + ms)` — a cue at exactly `T`
 * is inside, one at exactly `T + ms` is outside — adopted by instruction at T12
 * (§10.4). The hold itself is inside its own window and is excluded by id.
 */
function checkSilence(entries: readonly TimelineEntry[], emit: Emit): void {
  for (const hold of entries) {
    if (hold.primitive !== 'learner.holdSilence') continue;
    // `entry.durationMs` is the hold's `params.ms` (§10.2), so the window uses the
    // same number the player will.
    const endMs = hold.atMs + hold.durationMs;
    for (const other of entries) {
      if (other.cueId === hold.cueId) continue;
      if (other.track === 'camera') continue;
      if (other.atMs < hold.atMs || other.atMs >= endMs) continue;
      emit(
        other,
        'NON_CAMERA_IN_SILENCE',
        `cue ${other.cueId} on the '${other.track}' track falls at ${other.atMs}ms inside the silence cue ${hold.cueId} declares from ${hold.atMs}ms to ${endMs}ms`,
      );
    }
  }
}

/**
 * Ascending by the offending entry's `atMs`, then by `cueId`, so one sheet always
 * reports the same list. Two holds can name the same offending cue, so an
 * identical code and cue id is reported once, at its earliest instant.
 */
function orderedProblems(found: readonly TimedProblem[]): ResolutionProblem[] {
  const sorted = [...found].sort(
    (a, b) => a.atMs - b.atMs || compareCueIds(a.problem.cueId, b.problem.cueId),
  );
  const seen = new Set<string>();
  const problems: ResolutionProblem[] = [];
  for (const timed of sorted) {
    const key = `${timed.problem.code}:${timed.problem.cueId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    problems.push(timed.problem);
  }
  return problems;
}

/** Code-unit comparison rather than localeCompare: the order must not depend on the machine. */
function compareCueIds(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
