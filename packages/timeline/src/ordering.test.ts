import { describe, expect, it } from 'vitest';
import type { Cue, CueSheet, WordTiming } from '@sce/contracts';
import type { UtteranceMeasurement } from './fallback.js';
import { checkOrdering } from './ordering.js';
import { resolve, type ResolveInput } from './resolve.js';
import type { ResolutionProblem, ResolveResult } from './result.js';
import type { Timeline } from './timeline.js';

// Fixtures are concrete Cue/CueSheet/Timeline values, so a field rename in the
// contract breaks this file at compile time rather than at runtime.
type Parameter = 'axisTiltDeg' | 'orbitSpeed' | 'sunElevationDeg';

function timing(word: string, startMs: number, endMs: number): WordTiming {
  return { word, startMs, endMs };
}

// "the earth tilts over time", timed so a point can land before (300), after
// (1,800) and on (300) the word that names 'earth'.
const defaultWords: WordTiming[] = [
  timing('the', 0, 300),
  timing('earth', 300, 800),
  timing('tilts', 800, 1_400),
  timing('over', 1_400, 1_800),
  timing('time', 1_800, 2_200),
];

const defaultSpeech: Record<string, UtteranceMeasurement> = {
  u1: { startMs: 0, durationMs: 2_200, wordTimings: defaultWords },
};

const defaultTexts: Record<string, string> = { u1: 'the earth tilts over time' };

function sheetWith(cues: readonly Cue[], texts: Record<string, string> = defaultTexts): CueSheet {
  return {
    schemaVersion: 1,
    sceneId: 'solar-system',
    utterances: Object.entries(texts).map(([id, text]) => ({ id, text, voiceId: 'voice-teacher' })),
    cues: [...cues],
  };
}

function inputFor(
  cues: readonly Cue[],
  speech: Record<string, UtteranceMeasurement> = defaultSpeech,
  texts: Record<string, string> = defaultTexts,
): ResolveInput {
  return { cueSheet: sheetWith(cues, texts), utterances: speech };
}

/** The timeline `resolve` produces for this sheet; the pass under test never builds one. */
function timelineFor(input: ResolveInput): Timeline {
  const result = resolve(input);
  if (!result.ok)
    throw new Error(`resolve refused the fixture: ${JSON.stringify(result.problems)}`);
  return result.timeline;
}

function lookAtCue(id: string, at: Cue['at'], target: string): Cue {
  return { id, track: 'teacher', primitive: 'teacher.lookAt', at, params: { target } };
}

function pointCue(id: string, at: Cue['at'], target: string): Cue {
  return {
    id,
    track: 'teacher',
    primitive: 'teacher.point',
    at,
    params: { hand: 'right', target },
  };
}

function lockOffCue(id: string, at: Cue['at']): Cue {
  return {
    id,
    track: 'camera',
    primitive: 'camera.lockOff',
    at,
    params: { framing: 'mediumFront' },
    motivation: 'hold the framing while the axis is explained',
  };
}

function cutCue(id: string, at: Cue['at']): Cue {
  return {
    id,
    track: 'camera',
    primitive: 'camera.cut',
    at,
    params: { framing: 'closeUpFace' },
    motivation: 'cut to the face for the conclusion',
  };
}

function holdCue(id: string, offsetMs: number, ms: number): Cue {
  return {
    id,
    track: 'learner',
    primitive: 'learner.holdSilence',
    at: { offsetMs },
    params: { ms },
  };
}

function setParamCue(id: string, offsetMs: number, parameter: Parameter, value: number): Cue {
  return {
    id,
    track: 'scene',
    primitive: 'scene.setParam',
    at: { offsetMs },
    params: { parameter, value },
  };
}

function animateCue(id: string, offsetMs: number, parameter: Parameter, durationMs: number): Cue {
  return {
    id,
    track: 'scene',
    primitive: 'scene.animateParam',
    at: { offsetMs },
    params: { parameter, from: 0, to: 23.4, durationMs },
  };
}

function expectOkTimeline(result: ResolveResult): Timeline {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`checkOrdering rejected: ${JSON.stringify(result.problems)}`);
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

describe('checkOrdering — the timeline it consumes', () => {
  it('returns the timeline it was given, untouched, and never resolves a second one', () => {
    const input = inputFor([lockOffCue('c-lock-off', { offsetMs: 0 })]);
    const timeline = timelineFor(input);

    const result = checkOrdering(input, timeline);

    // Identity, not equality: a second resolve or a re-sort would produce an
    // equal-but-different object.
    expect(expectOkTimeline(result)).toBe(timeline);
  });
});

describe('checkOrdering — TRACK_MISMATCH', () => {
  it('passes a cue whose declared track matches its primitive track', () => {
    const input = inputFor([
      lockOffCue('c-lock-off', { offsetMs: 0 }),
      cutCue('c-cut', { offsetMs: 100 }),
    ]);

    const result = checkOrdering(input, timelineFor(input));

    expect(expectOkTimeline(result).entries.map((entry) => entry.cueId)).toEqual([
      'c-lock-off',
      'c-cut',
    ]);
  });

  it('rejects a cue declaring the camera track with a teacher primitive', () => {
    // A camera-track label on a teacher primitive passes the schema (the label is
    // legal on every branch) and misroutes the cue in the player.
    const miscast: Cue = {
      id: 'c-miscast',
      track: 'camera',
      primitive: 'teacher.lookAt',
      at: { offsetMs: 1_000 },
      params: { target: 'earth.patch' },
      motivation: 'the track label is the defect under test',
    };
    const input = inputFor([miscast]);

    expect(() => checkOrdering(input, timelineFor(input))).not.toThrow();

    const problem = expectSingleProblem(checkOrdering(input, timelineFor(input)));
    expect(problem.code).toBe('TRACK_MISMATCH');
    expect(problem.cueId).toBe('c-miscast');
    expect(problem.rule).toBe('cue track matches its primitive track');
  });
});

describe('checkOrdering — POINT_WITHOUT_LOOKAT', () => {
  it('passes a lookAt that precedes the point on the same target', () => {
    const input = inputFor([
      lookAtCue('c-look', { utteranceId: 'u1', wordIndex: 0 }, 'earth.patch'),
      pointCue('c-point', { utteranceId: 'u1', wordIndex: 2 }, 'earth.patch'),
    ]);

    const timeline = timelineFor(input);
    expect(expectOkTimeline(checkOrdering(input, timeline))).toBe(timeline);
  });

  it('passes a lookAt at exactly the point’s instant', () => {
    // §1.7.2 requires the look before the point; simultaneous is the boundary and
    // it is satisfied, so the rule is `<=` and not `<`.
    const input = inputFor([
      lookAtCue('c-look', { utteranceId: 'u1', wordIndex: 2 }, 'earth.patch'),
      pointCue('c-point', { utteranceId: 'u1', wordIndex: 2 }, 'earth.patch'),
    ]);

    const timeline = timelineFor(input);
    expect(expectOkTimeline(checkOrdering(input, timeline))).toBe(timeline);
  });

  it('rejects a point that precedes its own lookAt', () => {
    const input = inputFor([
      pointCue('c-point', { utteranceId: 'u1', wordIndex: 2 }, 'earth.patch'),
      lookAtCue('c-look', { utteranceId: 'u1', wordIndex: 4 }, 'earth.patch'),
    ]);

    expect(() => checkOrdering(input, timelineFor(input))).not.toThrow();

    const problem = expectSingleProblem(checkOrdering(input, timelineFor(input)));
    expect(problem.code).toBe('POINT_WITHOUT_LOOKAT');
    expect(problem.cueId).toBe('c-point');
    expect(problem.rule).toBe('look at the target before pointing at it');
  });

  it('does not accept a simultaneous lookAt on a different target', () => {
    const input = inputFor([
      lookAtCue('c-look', { utteranceId: 'u1', wordIndex: 2 }, 'earth.axis'),
      pointCue('c-point', { utteranceId: 'u1', wordIndex: 2 }, 'earth.patch'),
    ]);

    const problem = expectSingleProblem(checkOrdering(input, timelineFor(input)));
    expect(problem.code).toBe('POINT_WITHOUT_LOOKAT');
    expect(problem.cueId).toBe('c-point');
  });
});

describe('checkOrdering — POINT_AFTER_WORD', () => {
  it('passes a point at exactly the word that names its target', () => {
    // 'earth' starts at 300, the point lands at 300: strict `<` means the naming
    // word itself never rejects its own point.
    const input = inputFor([
      lookAtCue('c-look', { offsetMs: 0 }, 'earth'),
      pointCue('c-point', { utteranceId: 'u1', wordIndex: 1 }, 'earth'),
    ]);

    const timeline = timelineFor(input);
    expect(expectOkTimeline(checkOrdering(input, timeline))).toBe(timeline);
  });

  it('rejects a point that comes after the word naming its target', () => {
    // T = 1,800 ('time'); 'earth' began at 300, so the teacher gestures 1.5s late.
    const input = inputFor([
      lookAtCue('c-look', { offsetMs: 0 }, 'earth'),
      pointCue('c-point', { utteranceId: 'u1', wordIndex: 4 }, 'earth'),
    ]);

    expect(() => checkOrdering(input, timelineFor(input))).not.toThrow();

    const problem = expectSingleProblem(checkOrdering(input, timelineFor(input)));
    expect(problem.code).toBe('POINT_AFTER_WORD');
    expect(problem.cueId).toBe('c-point');
    expect(problem.rule).toBe('point on or before the word that names the target');
  });

  it('passes when no word in the utterance names the target', () => {
    // 'scene.sky' normalises to 'sky', which this utterance never says: the rule
    // has nothing to be late against.
    const input = inputFor([
      lookAtCue('c-look', { offsetMs: 0 }, 'scene.sky'),
      pointCue('c-point', { utteranceId: 'u1', wordIndex: 4 }, 'scene.sky'),
    ]);

    const timeline = timelineFor(input);
    expect(expectOkTimeline(checkOrdering(input, timeline))).toBe(timeline);
  });

  it('passes vacuously when the point’s own utterance has no word timings', () => {
    // The fallback places this cue approximately; the offset utterance start is
    // the only thing known about its words, so nothing can be late.
    const input = inputFor(
      [
        lookAtCue('c-look', { offsetMs: 0 }, 'earth'),
        pointCue('c-point', { utteranceId: 'u2', wordIndex: 1 }, 'earth'),
      ],
      { u2: { startMs: 0, durationMs: 2_000, wordTimings: null } },
      { u2: 'the shadow falls here' },
    );

    const timeline = timelineFor(input);
    expect(timeline.entries.map((entry) => entry.approximate)).toEqual([false, true]);
    expect(expectOkTimeline(checkOrdering(input, timeline))).toBe(timeline);
  });

  it('matches the naming word after lowercasing and stripping punctuation', () => {
    // target 'sun.Earth' → last segment 'Earth' → lowercase, letters only →
    // 'earth'; the spoken word 'Earth,' normalises the same way. The word starts
    // at 300, the point at 1,400.
    const input = inputFor(
      [
        lookAtCue('c-look', { offsetMs: 0 }, 'sun.Earth'),
        pointCue('c-point', { utteranceId: 'u5', wordIndex: 3 }, 'sun.Earth'),
      ],
      {
        u5: {
          startMs: 0,
          durationMs: 1_800,
          wordTimings: [
            timing('Look', 0, 300),
            timing('Earth,', 300, 800),
            timing('tilts', 800, 1_400),
            timing('again', 1_400, 1_800),
          ],
        },
      },
      { u5: 'Look Earth, tilts again' },
    );

    const problem = expectSingleProblem(checkOrdering(input, timelineFor(input)));
    expect(problem.code).toBe('POINT_AFTER_WORD');
    expect(problem.cueId).toBe('c-point');
  });
});

describe('checkOrdering — SETPARAM_OVERLAP', () => {
  it('passes two setParams on one parameter when an animateParam lies between them', () => {
    // The window opens at 1,000 and the animate at 1,500 closes it, so the
    // setParam at 2,000 opens a fresh one. A different parameter never interacts.
    const input = inputFor([
      setParamCue('c-set-a', 1_000, 'axisTiltDeg', 5),
      animateCue('c-animate', 1_500, 'axisTiltDeg', 400),
      setParamCue('c-set-b', 2_000, 'axisTiltDeg', 10),
      setParamCue('c-set-other', 3_000, 'orbitSpeed', 2),
    ]);

    const timeline = timelineFor(input);
    expect(expectOkTimeline(checkOrdering(input, timeline))).toBe(timeline);
  });

  it('rejects the later of two setParams on one parameter with no animateParam between', () => {
    const input = inputFor([
      setParamCue('c-set-a', 1_000, 'axisTiltDeg', 5),
      setParamCue('c-set-b', 2_000, 'axisTiltDeg', 10),
    ]);

    expect(() => checkOrdering(input, timelineFor(input))).not.toThrow();

    const problem = expectSingleProblem(checkOrdering(input, timelineFor(input)));
    expect(problem.code).toBe('SETPARAM_OVERLAP');
    expect(problem.cueId).toBe('c-set-b');
    expect(problem.rule).toBe('an animateParam bridges two setParams on one parameter');
  });

  it('accepts an animateParam at exactly the later setParam’s instant', () => {
    // The design says the window closes at an animateParam at or before the later
    // setParam, so equality bridges.
    const input = inputFor([
      setParamCue('c-set-a', 1_000, 'axisTiltDeg', 5),
      animateCue('c-animate', 2_000, 'axisTiltDeg', 400),
      setParamCue('c-set-b', 2_000, 'axisTiltDeg', 10),
    ]);

    const timeline = timelineFor(input);
    expect(expectOkTimeline(checkOrdering(input, timeline))).toBe(timeline);
  });

  it('does not count an animateParam at exactly the earlier setParam’s instant', () => {
    // The window opens at the earlier setParam, so an animate at that same instant
    // is not "after" it and cannot bridge.
    const input = inputFor([
      setParamCue('c-set-a', 1_000, 'axisTiltDeg', 5),
      animateCue('c-animate', 1_000, 'axisTiltDeg', 400),
      setParamCue('c-set-b', 2_000, 'axisTiltDeg', 10),
    ]);

    const problem = expectSingleProblem(checkOrdering(input, timelineFor(input)));
    expect(problem.code).toBe('SETPARAM_OVERLAP');
    expect(problem.cueId).toBe('c-set-b');
  });
});

describe('checkOrdering — NON_CAMERA_IN_SILENCE', () => {
  it('rejects a non-camera cue at exactly T, and passes one at T + ms and a camera cue inside', () => {
    // The hold declares [12,400, 13,900). The setParam at 12,400 is inside, the
    // one at 13,900 is outside, and the camera cut at 13,000 is the only track a
    // silence admits. The hold itself is a learner cue inside its own window and
    // must not reject itself.
    const input = inputFor([
      holdCue('c-hold', 12_400, 1_500),
      setParamCue('c-inside', 12_400, 'axisTiltDeg', 5),
      cutCue('c-camera', { offsetMs: 13_000 }),
      setParamCue('c-outside', 13_900, 'orbitSpeed', 2),
    ]);

    expect(() => checkOrdering(input, timelineFor(input))).not.toThrow();

    const problem = expectSingleProblem(checkOrdering(input, timelineFor(input)));
    expect(problem.code).toBe('NON_CAMERA_IN_SILENCE');
    expect(problem.cueId).toBe('c-inside');
    expect(problem.rule).toBe('only camera cues run during a silence');
  });

  it('passes a silence that only camera cues enter', () => {
    const input = inputFor([
      holdCue('c-hold', 4_000, 1_000),
      cutCue('c-camera', { offsetMs: 4_500 }),
    ]);

    const timeline = timelineFor(input);
    expect(expectOkTimeline(checkOrdering(input, timeline))).toBe(timeline);
  });
});

describe('checkOrdering — problem order', () => {
  it('orders problems by atMs then cueId, not by track', () => {
    // Both problems share atMs 1,000. Sorted by cueId they are a-scene then
    // z-teacher, but the fixture's declared tracks run against the declaration
    // order camera, teacher, scene, light, learner: a track-based sort would put
    // z-teacher ('camera') first. The later problem must sort last regardless.
    const miscastScene: Cue = {
      id: 'a-scene',
      track: 'teacher',
      primitive: 'scene.setParam',
      at: { offsetMs: 1_000 },
      params: { parameter: 'axisTiltDeg', value: 5 },
    };
    const miscastTeacher: Cue = {
      id: 'z-teacher',
      track: 'camera',
      primitive: 'teacher.lookAt',
      at: { offsetMs: 1_000 },
      params: { target: 'earth.patch' },
      motivation: 'the track label is the defect under test',
    };
    const latePoint = pointCue('b-point', { offsetMs: 2_000 }, 'earth');

    const input = inputFor([latePoint, miscastTeacher, miscastScene]);

    expect(() => checkOrdering(input, timelineFor(input))).not.toThrow();

    const result = checkOrdering(input, timelineFor(input));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a rejection, got a timeline');
    expect(result.problems.map((problem) => [problem.cueId, problem.code])).toEqual([
      ['a-scene', 'TRACK_MISMATCH'],
      ['z-teacher', 'TRACK_MISMATCH'],
      ['b-point', 'POINT_WITHOUT_LOOKAT'],
    ]);
  });
});
