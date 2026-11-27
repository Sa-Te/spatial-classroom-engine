import type { ZodType } from 'zod';
import { describe, expect, it } from 'vitest';
import {
  LearnerEnableGrabSchema,
  LearnerHoldSilenceSchema,
  LightKeyFromSunSchema,
  SceneAnimateParamSchema,
  SceneSetParamSchema,
  type PrimitiveId,
  type PrimitiveTrack,
} from './index.js';
import { lookupPrimitive, primitiveRegistry } from './registry.js';

const accepts = (schema: ZodType, payload: unknown): boolean => schema.safeParse(payload).success;

// §9's nine, restated rather than read from `PrimitiveIdSchema.options`: a test that
// borrows its expectation from the code under test cannot notice a lost id. Typed as
// PrimitiveId so a removal on either side is a compile error, not a silent green.
const nineIds: PrimitiveId[] = [
  'camera.lockOff',
  'camera.cut',
  'teacher.lookAt',
  'teacher.point',
  'scene.setParam',
  'scene.animateParam',
  'light.keyFromSun',
  'learner.holdSilence',
  'learner.enableGrab',
];

// §9's track column, spelled out per id so a swapped track fails instead of passing.
const tracks: { id: PrimitiveId; track: PrimitiveTrack }[] = [
  { id: 'camera.lockOff', track: 'camera' },
  { id: 'camera.cut', track: 'camera' },
  { id: 'teacher.lookAt', track: 'teacher' },
  { id: 'teacher.point', track: 'teacher' },
  { id: 'scene.setParam', track: 'scene' },
  { id: 'scene.animateParam', track: 'scene' },
  { id: 'light.keyFromSun', track: 'light' },
  { id: 'learner.holdSilence', track: 'learner' },
  { id: 'learner.enableGrab', track: 'learner' },
];

describe('primitiveRegistry', () => {
  it('holds exactly the nine §9 ids and no extras', () => {
    expect(Object.keys(primitiveRegistry).sort()).toEqual([...nineIds].sort());
  });

  it('gives every entry a track from the closed set and a schema that can parse', () => {
    for (const [id, entry] of Object.entries(primitiveRegistry)) {
      expect(['camera', 'teacher', 'scene', 'light', 'learner'], id).toContain(entry.track);
      expect(typeof entry.schema.safeParse, id).toBe('function');
    }
  });

  it.each(tracks)('maps $id to the $track track', ({ id, track }) => {
    expect(primitiveRegistry[id].track).toBe(track);
  });
});

describe('lookupPrimitive', () => {
  it('reports an id outside the closed set as ok: false, never a default entry', () => {
    expect(lookupPrimitive('camera.dolly')).toEqual({ ok: false, id: 'camera.dolly' });
  });

  it('returns the matching entry for a known id', () => {
    const result = lookupPrimitive('scene.setParam');
    expect(result.ok && result.entry.track).toBe('scene');
    expect(result.ok && accepts(result.entry.schema, { parameter: 'orbitSpeed', value: 1 })).toBe(
      true,
    );
  });

  it('reports a prototype key as unknown, because the table is own keys only', () => {
    expect(lookupPrimitive('constructor')).toEqual({ ok: false, id: 'constructor' });
    expect(lookupPrimitive('__proto__')).toEqual({ ok: false, id: '__proto__' });
  });
});

describe('scene.setParam', () => {
  it('parses a declared axis parameter with a numeric value', () => {
    expect(accepts(SceneSetParamSchema, { parameter: 'axisTiltDeg', value: 23 })).toBe(true);
  });

  it('rejects a string value, which is what a model emits when it quotes a number', () => {
    expect(accepts(SceneSetParamSchema, { parameter: 'axisTiltDeg', value: '23' })).toBe(false);
  });

  // The non-finite guard is the schema's plain `z.number()`: zod 4 rejects NaN and
  // ±Infinity there, so an extra `.finite()` would be redundant, not defensive.
  it('rejects NaN', () => {
    expect(accepts(SceneSetParamSchema, { parameter: 'axisTiltDeg', value: Number.NaN })).toBe(
      false,
    );
  });

  it('rejects Infinity, which would collapse the rendered tilt to a degenerate value', () => {
    expect(
      accepts(SceneSetParamSchema, { parameter: 'axisTiltDeg', value: Number.POSITIVE_INFINITY }),
    ).toBe(false);
  });

  it('rejects a parameter outside the Q10 closed set', () => {
    expect(accepts(SceneSetParamSchema, { parameter: 'semiMajorAxis', value: 1 })).toBe(false);
  });

  it('rejects an extra key, because a strict schema is what stops a stray unit sneaking in', () => {
    expect(accepts(SceneSetParamSchema, { parameter: 'orbitSpeed', value: 1, unit: 'deg' })).toBe(
      false,
    );
  });

  it('accepts a value outside any scene range, because the range is T15s to check', () => {
    // §9: a Manipulable's min/max lives in the SceneSpec, which this schema cannot
    // see. A guard here would reject legal cues in scenes with a wider range.
    const payload = { parameter: 'sunElevationDeg', value: 400 };

    expect(SceneSetParamSchema.safeParse(payload).success).toBe(true);
  });
});

describe('scene.animateParam', () => {
  it('parses a from/to pair with a positive integer durationMs', () => {
    expect(
      accepts(SceneAnimateParamSchema, {
        parameter: 'orbitSpeed',
        from: 0.5,
        to: 2,
        durationMs: 1500,
      }),
    ).toBe(true);
  });

  it('rejects durationMs 0, which would divide a zero-length interpolation', () => {
    expect(
      accepts(SceneAnimateParamSchema, {
        parameter: 'orbitSpeed',
        from: 0,
        to: 1,
        durationMs: 0,
      }),
    ).toBe(false);
  });

  it('rejects a negative durationMs', () => {
    expect(
      accepts(SceneAnimateParamSchema, {
        parameter: 'orbitSpeed',
        from: 0,
        to: 1,
        durationMs: -500,
      }),
    ).toBe(false);
  });

  it('rejects a fractional durationMs, since a millisecond count is a whole number', () => {
    expect(
      accepts(SceneAnimateParamSchema, {
        parameter: 'orbitSpeed',
        from: 0,
        to: 1,
        durationMs: 1500.5,
      }),
    ).toBe(false);
  });
});

describe('light.keyFromSun', () => {
  it('accepts both ends of the 1–90 elevation window', () => {
    for (const sunElevationDeg of [1, 90]) {
      expect(accepts(LightKeyFromSunSchema, { sunElevationDeg }), String(sunElevationDeg)).toBe(
        true,
      );
    }
  });

  it('rejects 0 and 91, where the sun is on the horizon or behind the camera', () => {
    for (const sunElevationDeg of [0, 91]) {
      expect(accepts(LightKeyFromSunSchema, { sunElevationDeg }), String(sunElevationDeg)).toBe(
        false,
      );
    }
  });
});

describe('learner.holdSilence', () => {
  it('accepts both ends of the 500–4000 window', () => {
    for (const ms of [500, 4000]) {
      expect(accepts(LearnerHoldSilenceSchema, { ms }), String(ms)).toBe(true);
    }
  });

  it('rejects 499 and 4001, just outside the declared window', () => {
    for (const ms of [499, 4001]) {
      expect(accepts(LearnerHoldSilenceSchema, { ms }), String(ms)).toBe(false);
    }
  });

  it('rejects a fractional ms, which no clock can wait out exactly', () => {
    expect(accepts(LearnerHoldSilenceSchema, { ms: 750.5 })).toBe(false);
  });
});

describe('learner.enableGrab', () => {
  it('parses an object id with a declared axis parameter', () => {
    expect(accepts(LearnerEnableGrabSchema, { objectId: 'earth', parameter: 'axisTiltDeg' })).toBe(
      true,
    );
  });

  it('rejects an empty objectId, which addresses no object', () => {
    expect(accepts(LearnerEnableGrabSchema, { objectId: '', parameter: 'axisTiltDeg' })).toBe(
      false,
    );
  });

  it('rejects an empty parameter', () => {
    expect(accepts(LearnerEnableGrabSchema, { objectId: 'earth', parameter: '' })).toBe(false);
  });

  it('rejects a parameter outside the Q10 closed set', () => {
    expect(
      accepts(LearnerEnableGrabSchema, { objectId: 'earth', parameter: 'semiMajorAxis' }),
    ).toBe(false);
  });
});
