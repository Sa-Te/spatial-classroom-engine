import { describe, expect, it } from 'vitest';
import type { Cue, CueSheet, WordTiming } from '@sce/contracts';
import { resolve } from './resolve.js';
import type { ResolveResult, ResolutionProblem } from './result.js';
import type { Timeline, TimelineEntry } from './timeline.js';

// Fixtures are built as concrete Cue/CueSheet values so every field is checked
// against the real contract shapes, not a hand-written lookalike.

function timing(word: string, startMs: number, endMs: number): WordTiming {
  return { word, startMs, endMs };
}

// Three utterances, six words: enough for three word-anchored cues in different
// utterances at different word indexes, all with distinct startMs.
const u1Words = [timing('the', 0, 300), timing('sun', 300, 800), timing('burns', 800, 1_400)];
const u2Words = [timing('earth', 1_400, 2_000), timing('tilts', 2_000, 2_600)];
const u3Words = [timing('the', 2_600, 3_000), timing('shadow', 3_000, 3_800)];

const allTimings: Record<string, WordTiming[] | null> = {
  u1: u1Words,
  u2: u2Words,
  u3: u3Words,
};

function sheet(cues: readonly Cue[], utteranceIds: readonly string[]): CueSheet {
  return {
    schemaVersion: 1,
    sceneId: 'solar-system',
    utterances: utteranceIds.map((id) => ({
      id,
      text: `${id} is spoken`,
      voiceId: 'voice-teacher',
    })),
    cues: [...cues],
  };
}

function pointCueWithAt(at: Cue['at']): Cue {
  return {
    id: 'c-point-earth',
    track: 'teacher',
    primitive: 'teacher.point',
    at,
    params: { hand: 'right', target: 'earth.patch' },
  };
}

const lockOffCue: Cue = {
  id: 'c-lock-off',
  track: 'camera',
  primitive: 'camera.lockOff',
  at: { utteranceId: 'u2', wordIndex: 0 },
  params: { framing: 'mediumFront' },
  motivation: 'hold the framing while the axis is explained',
};

const animateCue: Cue = {
  id: 'c-animate-tilt',
  track: 'scene',
  primitive: 'scene.animateParam',
  at: { utteranceId: 'u3', wordIndex: 1 },
  params: { parameter: 'axisTiltDeg', from: 0, to: 23.4, durationMs: 900 },
};

// Explicit offset, not speech: a pause the timeline declares (§1.7.1).
const holdCue: Cue = {
  id: 'c-hold',
  track: 'learner',
  primitive: 'learner.holdSilence',
  at: { offsetMs: 12_400 },
  params: { ms: 1_500 },
};

function expectOk(result: ResolveResult): Timeline {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`resolve rejected: ${JSON.stringify(result.problems)}`);
  return result.timeline;
}

function expectSingleProblem(result: ResolveResult): ResolutionProblem {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('expected a rejection, got a timeline');
  expect(result.problems).toHaveLength(1);
  const [problem] = result.problems;
  if (problem === undefined) throw new Error('expected one problem');
  return problem;
}

function entryAt(timeline: Timeline, cueId: string): TimelineEntry {
  const found = timeline.entries.find((candidate) => candidate.cueId === cueId);
  if (found === undefined) throw new Error(`no entry for cue ${cueId}`);
  return found;
}

describe('resolve — word-anchored placement', () => {
  it('places three word-anchored cues in three utterances at exactly their word startMs', () => {
    const result = resolve({
      cueSheet: sheet(
        [pointCueWithAt({ utteranceId: 'u1', wordIndex: 1 }), lockOffCue, animateCue],
        ['u1', 'u2', 'u3'],
      ),
      wordTimings: allTimings,
    });

    const timeline = expectOk(result);

    // Exact, not a range: a millisecond of drift is the bug this resolver exists
    // to prevent (§1.7.1).
    expect(entryAt(timeline, 'c-point-earth').atMs).toBe(300);
    expect(entryAt(timeline, 'c-lock-off').atMs).toBe(1_400);
    expect(entryAt(timeline, 'c-animate-tilt').atMs).toBe(3_000);
  });

  it('passes an explicit offsetMs through unchanged', () => {
    const timeline = expectOk(
      resolve({
        cueSheet: sheet([holdCue, pointCueWithAt({ utteranceId: 'u1', wordIndex: 0 })], ['u1']),
        wordTimings: allTimings,
      }),
    );

    // The word-anchored cue still reads the timing array, so a resolver that used
    // the offset for everything would fail the second assertion.
    expect(entryAt(timeline, 'c-hold').atMs).toBe(12_400);
    expect(entryAt(timeline, 'c-point-earth').atMs).toBe(0);
  });

  it('takes each entry durationMs from the parameter that carries one, and zero otherwise', () => {
    const timeline = expectOk(
      resolve({
        cueSheet: sheet(
          [pointCueWithAt({ utteranceId: 'u1', wordIndex: 1 }), animateCue, holdCue],
          ['u1', 'u2', 'u3'],
        ),
        wordTimings: allTimings,
      }),
    );

    expect(entryAt(timeline, 'c-point-earth').durationMs).toBe(0);
    expect(entryAt(timeline, 'c-animate-tilt').durationMs).toBe(900);
    expect(entryAt(timeline, 'c-hold').durationMs).toBe(1_500);
  });

  it('sorts entries by ascending atMs when the cues arrive out of order', () => {
    const timeline = expectOk(
      resolve({
        cueSheet: sheet(
          [animateCue, holdCue, pointCueWithAt({ utteranceId: 'u1', wordIndex: 1 })],
          ['u1', 'u2', 'u3'],
        ),
        wordTimings: allTimings,
      }),
    );

    expect(timeline.entries.map((entry) => entry.cueId)).toEqual([
      'c-point-earth',
      'c-animate-tilt',
      'c-hold',
    ]);
  });

  it('marks every entry exact, because the fallback path is T11', () => {
    const timeline = expectOk(
      resolve({
        cueSheet: sheet(
          [pointCueWithAt({ utteranceId: 'u1', wordIndex: 1 }), lockOffCue, animateCue],
          ['u1', 'u2', 'u3'],
        ),
        wordTimings: allTimings,
      }),
    );

    expect(timeline.entries.map((entry) => entry.approximate)).toEqual([false, false, false]);
  });
});

describe('resolve — timeline durationMs', () => {
  it('is the later of the last entry end and the final word of the last utterance', () => {
    // Speech outlasts every entry: u3's final word ends at 3800.
    const speechLed = expectOk(
      resolve({
        cueSheet: sheet(
          [pointCueWithAt({ utteranceId: 'u1', wordIndex: 1 }), lockOffCue],
          ['u1', 'u2', 'u3'],
        ),
        wordTimings: allTimings,
      }),
    );
    expect(speechLed.durationMs).toBe(3_800);

    // An entry outlasts the speech: the hold at 12400 runs 1500 ms.
    const entryLed = expectOk(
      resolve({
        cueSheet: sheet(
          [pointCueWithAt({ utteranceId: 'u1', wordIndex: 1 }), holdCue],
          ['u1', 'u2', 'u3'],
        ),
        wordTimings: allTimings,
      }),
    );
    expect(entryLed.durationMs).toBe(13_900);
  });

  it('contributes nothing for a last utterance with no timings, and does not reject for it', () => {
    // u3 is last and has no timings, but no cue addresses it, so it is not a
    // problem: only the arrays a cue actually references are validated.
    const timeline = expectOk(
      resolve({
        cueSheet: sheet([pointCueWithAt({ utteranceId: 'u1', wordIndex: 1 })], ['u1', 'u3']),
        wordTimings: { u1: u1Words },
      }),
    );

    expect(timeline.durationMs).toBe(300);
  });

  it('does not reject a malformed timing array that no cue references', () => {
    // Validation is per referenced array: a bad array for an utterance this sheet
    // never addresses cannot move a cue, so it is not this sheet's problem.
    const timeline = expectOk(
      resolve({
        cueSheet: sheet([pointCueWithAt({ utteranceId: 'u1', wordIndex: 1 })], ['u1', 'u2']),
        wordTimings: { u1: u1Words, u2: [timing('earth', 900, 1_000), timing('axis', 100, 500)] },
      }),
    );

    expect(timeline.entries.map((entry) => entry.cueId)).toEqual(['c-point-earth']);
  });
});

describe('resolve — rejections', () => {
  it('rejects a word index below zero, naming the cue', () => {
    // Trust-boundary probe: a *parsed* sheet cannot carry a negative wordIndex
    // (wordAnchoredAtSchema is .int().min(0)), so this cast is the only way to
    // reach the resolver's own guard. It must be a named problem, not a throw.
    const negativeIndexCue = {
      id: 'c-point-earth',
      track: 'teacher',
      primitive: 'teacher.point',
      at: { utteranceId: 'u1', wordIndex: -1 },
      params: { hand: 'right', target: 'earth.patch' },
    };
    const badSheet = {
      ...sheet([pointCueWithAt({ utteranceId: 'u1', wordIndex: 1 })], ['u1']),
      cues: [negativeIndexCue],
    } as unknown as CueSheet;

    expect(() => resolve({ cueSheet: badSheet, wordTimings: allTimings })).not.toThrow();

    const problem = expectSingleProblem(resolve({ cueSheet: badSheet, wordTimings: allTimings }));
    expect(problem.code).toBe('WORD_INDEX_OUT_OF_RANGE');
    expect(problem.cueId).toBe('c-point-earth');
  });

  it('rejects a word index at the timing array length', () => {
    const badSheet = sheet([pointCueWithAt({ utteranceId: 'u1', wordIndex: 3 })], ['u1']);

    expect(() => resolve({ cueSheet: badSheet, wordTimings: allTimings })).not.toThrow();

    const problem = expectSingleProblem(resolve({ cueSheet: badSheet, wordTimings: allTimings }));
    expect(problem.code).toBe('WORD_INDEX_OUT_OF_RANGE');
    expect(problem.cueId).toBe('c-point-earth');
  });

  it('rejects a word-anchored cue whose utterance has no timing entry', () => {
    const badSheet = sheet([pointCueWithAt({ utteranceId: 'u1', wordIndex: 1 })], ['u1']);

    expect(() => resolve({ cueSheet: badSheet, wordTimings: {} })).not.toThrow();

    const problem = expectSingleProblem(resolve({ cueSheet: badSheet, wordTimings: {} }));
    expect(problem.code).toBe('TIMINGS_MISSING');
    expect(problem.cueId).toBe('c-point-earth');
  });

  it('rejects a word-anchored cue whose utterance timings are null', () => {
    const badSheet = sheet([pointCueWithAt({ utteranceId: 'u2', wordIndex: 0 })], ['u1', 'u2']);

    expect(() => resolve({ cueSheet: badSheet, wordTimings: { u2: null } })).not.toThrow();

    const problem = expectSingleProblem(resolve({ cueSheet: badSheet, wordTimings: { u2: null } }));
    expect(problem.code).toBe('TIMINGS_MISSING');
    expect(problem.cueId).toBe('c-point-earth');
  });

  it('rejects timings whose startMs values are not strictly ascending', () => {
    const outOfOrder = [timing('sun', 0, 300), timing('rose', 600, 900), timing('early', 500, 800)];
    const badSheet = sheet([pointCueWithAt({ utteranceId: 'u1', wordIndex: 0 })], ['u1']);

    expect(() => resolve({ cueSheet: badSheet, wordTimings: { u1: outOfOrder } })).not.toThrow();

    const problem = expectSingleProblem(
      resolve({ cueSheet: badSheet, wordTimings: { u1: outOfOrder } }),
    );
    expect(problem.code).toBe('TIMINGS_OUT_OF_ORDER');
    expect(problem.cueId).toBe('c-point-earth');
  });

  it('rejects timings where a word ends after the next word starts', () => {
    // Starts ascend strictly (0 < 300), so overlap is the only rule broken: this
    // array must not be reported as out of order.
    const overlapping = [timing('sun', 0, 400), timing('rose', 300, 900)];
    const badSheet = sheet([pointCueWithAt({ utteranceId: 'u2', wordIndex: 1 })], ['u1', 'u2']);

    expect(() => resolve({ cueSheet: badSheet, wordTimings: { u2: overlapping } })).not.toThrow();

    const problem = expectSingleProblem(
      resolve({ cueSheet: badSheet, wordTimings: { u2: overlapping } }),
    );
    expect(problem.code).toBe('TIMINGS_OVERLAP');
    expect(problem.cueId).toBe('c-point-earth');
  });
});
