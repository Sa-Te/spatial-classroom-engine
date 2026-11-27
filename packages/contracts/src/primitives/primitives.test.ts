import type { ZodType } from 'zod';
import { describe, expect, it } from 'vitest';
import {
  CameraCutSchema,
  CameraFramingSchema,
  CameraLockOffSchema,
  PrimitiveIdSchema,
  TeacherLookAtSchema,
  TeacherPointSchema,
  type PrimitiveId,
} from './index.js';

function issuePaths(schema: ZodType, payload: unknown): string[] {
  const result = schema.safeParse(payload);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

function unrecognizedKeys(schema: ZodType, payload: unknown): string[] {
  const result = schema.safeParse(payload);
  return result.success
    ? []
    : result.error.issues.flatMap((issue) =>
        issue.code === 'unrecognized_keys' ? issue.keys : [],
      );
}

// Q1/Q2: the closed nine. This fixture lives in the test only — production has
// one `z.enum` and no ids array (docs/ROADMAP.md Q1, Q2).
const coreIds = [
  'camera.lockOff',
  'camera.cut',
  'teacher.lookAt',
  'teacher.point',
  'scene.setParam',
  'scene.animateParam',
  'light.keyFromSun',
  'learner.holdSilence',
  'learner.enableGrab',
] as const;

// The seven ids §9 lists but P1 does not ship. They must be absent from
// PrimitiveId, not present and unvalidated (Q1).
type DeferredId =
  | 'camera.diveThrough'
  | 'camera.pushIn'
  | 'camera.pullOut'
  | 'camera.orbitArc'
  | 'teacher.gesture'
  | 'scene.spawn'
  | 'board.showStill';

// Compile-time: resolves to `true` only while no deferred id is in PrimitiveId.
type NoneAssignable = Extract<DeferredId, PrimitiveId> extends never ? true : false;
const noneAssignable: NoneAssignable = true;

describe('PrimitiveIdSchema', () => {
  it('accepts the nine core ids and rejects an id that is not in the closed set', () => {
    for (const id of coreIds) {
      expect(PrimitiveIdSchema.safeParse(id).success).toBe(true);
    }

    // Not a deferred id — it was never in §9 either. A typo must not parse.
    expect(PrimitiveIdSchema.safeParse('camera.dolly').success).toBe(false);
  });

  it('keeps every deferred primitive out of PrimitiveId', () => {
    // The assertion here is the assignment of `true` to `NoneAssignable` above,
    // which `tsc` rejects the moment a deferred id joins the union. This
    // `expect` only gives the compile-time proof a runtime home; it cannot fail
    // on its own.
    expect(noneAssignable).toBe(true);
  });

  it('holds exactly nine ids, so an invented tenth cannot slip in', () => {
    expect(PrimitiveIdSchema.options).toHaveLength(9);
  });
});

describe('CameraFramingSchema', () => {
  it('accepts every framing in the signed set, so a typo in one cannot hide', () => {
    for (const framing of [
      'wideSideProfile',
      'mediumFront',
      'closeUpFace',
      'wideHighAngle',
      'overShoulderBoard',
    ]) {
      expect(CameraFramingSchema.safeParse(framing).success).toBe(true);
    }
  });
});

describe('CameraLockOffSchema', () => {
  it('parses a framing and nothing else', () => {
    const parsed = CameraLockOffSchema.parse({ framing: 'wideSideProfile' });

    expect(parsed).toEqual({ framing: 'wideSideProfile' });
  });

  it('rejects a framing outside the signed five, with the issue on framing', () => {
    const lockedOff = { framing: 'heroShot' };

    expect(CameraLockOffSchema.safeParse(lockedOff).success).toBe(false);
    expect(issuePaths(CameraLockOffSchema, lockedOff)).toContain('framing');
  });

  it('rejects a sunSide, because Q5 derives it from the key light', () => {
    // Two authoring sites for one number is the bug T4-Q2 exists to prevent; a
    // cue that states the sun side would also be wrong the moment the key light
    // moves.
    const lockedOff = { framing: 'wideSideProfile', sunSide: 'left' };

    expect(CameraLockOffSchema.safeParse(lockedOff).success).toBe(false);
    expect(unrecognizedKeys(CameraLockOffSchema, lockedOff)).toContain('sunSide');
  });
});

describe('CameraCutSchema', () => {
  it('parses a framing and nothing else', () => {
    const parsed = CameraCutSchema.parse({ framing: 'mediumFront' });

    expect(parsed).toEqual({ framing: 'mediumFront' });
  });

  it('rejects a durationMs, because a cut is instantaneous', () => {
    // §9:333 gives the cut no duration. Strictness is the check; there is no
    // hand-written duration rule to keep in sync.
    const cut = { framing: 'mediumFront', durationMs: 800 };

    expect(CameraCutSchema.safeParse(cut).success).toBe(false);
    expect(unrecognizedKeys(CameraCutSchema, cut)).toContain('durationMs');
  });

  it('rejects a to field, because a cut target arrives with Q7 and is absent', () => {
    const cut = { framing: 'mediumFront', to: 'closeUpFace' };

    expect(CameraCutSchema.safeParse(cut).success).toBe(false);
    expect(unrecognizedKeys(CameraCutSchema, cut)).toContain('to');
  });
});

describe('TeacherLookAtSchema', () => {
  it('parses a target anchor name', () => {
    const parsed = TeacherLookAtSchema.parse({ target: 'earth.patch' });

    expect(parsed).toEqual({ target: 'earth.patch' });
  });

  it('rejects an empty target, because nobody looks at nothing', () => {
    const lookAt = { target: '' };

    expect(TeacherLookAtSchema.safeParse(lookAt).success).toBe(false);
    expect(issuePaths(TeacherLookAtSchema, lookAt)).toContain('target');
  });

  it('rejects an extra key, because the schema is strict', () => {
    // The anchor is not validated against a scene here: T15 does that when
    // SceneSpec becomes a scene graph, so an unknown field is the only thing
    // this schema can still refuse.
    const lookAt = { target: 'earth.patch', anchor: 'earth.patch' };

    expect(TeacherLookAtSchema.safeParse(lookAt).success).toBe(false);
    expect(unrecognizedKeys(TeacherLookAtSchema, lookAt)).toContain('anchor');
  });
});

describe('TeacherPointSchema', () => {
  it('parses a hand and a target anchor name', () => {
    const parsed = TeacherPointSchema.parse({ hand: 'right', target: 'earth.patch' });

    expect(parsed).toEqual({ hand: 'right', target: 'earth.patch' });
  });

  it('rejects a third hand, because the rig has two', () => {
    const point = { hand: 'both', target: 'earth.patch' };

    expect(TeacherPointSchema.safeParse(point).success).toBe(false);
    expect(issuePaths(TeacherPointSchema, point)).toContain('hand');
  });

  it('rejects an empty target, because a point with no target is a wave', () => {
    const point = { hand: 'right', target: '' };

    expect(TeacherPointSchema.safeParse(point).success).toBe(false);
    expect(issuePaths(TeacherPointSchema, point)).toContain('target');
  });
});
