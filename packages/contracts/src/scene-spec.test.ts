import type { ZodType } from 'zod';
import { describe, expect, it } from 'vitest';
import {
  LightSpecSchema,
  ManipulableSchema,
  SceneObjectSchema,
  SceneSpecSchema,
} from './scene-spec.js';

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

const manipulableExample = {
  parameter: 'axisTiltDeg',
  min: 0,
  max: 45,
  default: 23.4,
  unit: 'degrees',
  affordance: 'grab',
};

const sceneObjectExample = { id: 'earth-surface', kind: 'sphere' };
const lightExample = { id: 'sun-key', kind: 'sun' };

// A scene in the shape of docs/TECHNICAL_DESIGN.md §8.1, with concrete values.
const sceneSpecExample = {
  schemaVersion: 1,
  sceneId: 'hot-in-july/s4',
  anchors: ['sun', 'earth', 'earth.patch'],
  objects: [sceneObjectExample],
  lights: [lightExample],
  manipulables: [manipulableExample],
};

describe('SceneSpecSchema', () => {
  it('parses a scene spec with one object, one light and one manipulable unchanged', () => {
    const parsed = SceneSpecSchema.parse(sceneSpecExample);

    expect(parsed).toEqual(sceneSpecExample);
    expect(parsed.objects).toHaveLength(1);
    expect(parsed.lights).toHaveLength(1);
    expect(parsed.manipulables).toHaveLength(1);
  });

  it('rejects schemaVersion 2, because only version 1 is defined', () => {
    const spec = { ...sceneSpecExample, schemaVersion: 2 };

    expect(SceneSpecSchema.safeParse(spec).success).toBe(false);
    expect(issuePaths(SceneSpecSchema, spec)).toContain('schemaVersion');
  });

  it('rejects an empty anchors array, because a scene with no anchor cannot be authored against', () => {
    const spec = { ...sceneSpecExample, anchors: [] };

    expect(SceneSpecSchema.safeParse(spec).success).toBe(false);
    expect(issuePaths(SceneSpecSchema, spec)).toContain('anchors');
  });

  it('accepts an anchor name outside the signed ten, because membership is not schema-enforced', () => {
    // Deliberately not a member of the OPEN-7 set: the schema accepts any name,
    // and T14 rejects unknown names when the scene graph loads, where the graph
    // exists to check them against.
    const spec = { ...sceneSpecExample, anchors: ['mars.surface'] };

    const parsed = SceneSpecSchema.parse(spec);

    expect(parsed.anchors).toEqual(['mars.surface']);
  });

  it('parses two lights, because the one-key-light rule belongs to the light.keyFromSun validator', () => {
    // The scene-spec schema checks identity, not lighting intent. T7's
    // light.keyFromSun validator is the single authoring site for elevation and
    // the one that rejects a second key light.
    const spec = {
      ...sceneSpecExample,
      lights: [lightExample, { id: 'fill-bounce', kind: 'sun' }],
    };

    const parsed = SceneSpecSchema.parse(spec);

    expect(parsed.lights).toHaveLength(2);
  });
});

describe('ManipulableSchema', () => {
  it('rejects a minimum above the maximum, with the issue on min', () => {
    const manipulable = { ...manipulableExample, min: 90, max: 0, default: 45 };

    expect(ManipulableSchema.safeParse(manipulable).success).toBe(false);
    expect(issuePaths(ManipulableSchema, manipulable)).toContain('min');

    // The refinement returns after the range issue: an inverted range must not
    // also report a default that was never meaningfully checked.
    expect(issuePaths(ManipulableSchema, manipulable)).not.toContain('default');
  });

  it('points the min-above-max issue at manipulables.0.min when nested', () => {
    const spec = {
      ...sceneSpecExample,
      manipulables: [{ ...manipulableExample, min: 90, max: 0, default: 45 }],
    };

    expect(SceneSpecSchema.safeParse(spec).success).toBe(false);
    expect(issuePaths(SceneSpecSchema, spec)).toContain('manipulables.0.min');
  });

  it('rejects a default outside [min, max] on either side', () => {
    const aboveMax = { ...manipulableExample, default: 46 };
    const belowMin = { ...manipulableExample, default: -1 };

    expect(ManipulableSchema.safeParse(aboveMax).success).toBe(false);
    expect(issuePaths(ManipulableSchema, aboveMax)).toContain('default');
    expect(ManipulableSchema.safeParse(belowMin).success).toBe(false);
    expect(issuePaths(ManipulableSchema, belowMin)).toContain('default');
  });

  it('points the out-of-range default issue at manipulables.0.default when nested', () => {
    const spec = {
      ...sceneSpecExample,
      manipulables: [{ ...manipulableExample, default: 46 }],
    };

    expect(SceneSpecSchema.safeParse(spec).success).toBe(false);
    expect(issuePaths(SceneSpecSchema, spec)).toContain('manipulables.0.default');
  });

  it('rejects a parameter outside the closed three', () => {
    const manipulable = { ...manipulableExample, parameter: 'semiMajorAxis' };

    expect(ManipulableSchema.safeParse(manipulable).success).toBe(false);
    expect(issuePaths(ManipulableSchema, manipulable)).toContain('parameter');
  });

  it('rejects an empty unit, because a range without a unit cannot be interpreted', () => {
    const manipulable = { ...manipulableExample, unit: '' };

    expect(ManipulableSchema.safeParse(manipulable).success).toBe(false);
    expect(issuePaths(ManipulableSchema, manipulable)).toContain('unit');
  });
});

describe('SceneObjectSchema', () => {
  it('rejects a kind outside the closed four', () => {
    const object = { ...sceneObjectExample, kind: 'torus' };

    expect(SceneObjectSchema.safeParse(object).success).toBe(false);
    expect(issuePaths(SceneObjectSchema, object)).toContain('kind');
  });

  it('rejects an object with no id', () => {
    const { id: _id, ...objectWithoutId } = sceneObjectExample;

    expect(SceneObjectSchema.safeParse(objectWithoutId).success).toBe(false);
    expect(issuePaths(SceneObjectSchema, objectWithoutId)).toContain('id');
  });

  it('rejects an extra key, because the schema is strict', () => {
    // T4-Q1: per-kind payload lands in P3. A radius here is a guess the contract
    // must not absorb, so strictness makes its absence testable.
    const object = { ...sceneObjectExample, radiusM: 1 };

    expect(SceneObjectSchema.safeParse(object).success).toBe(false);
    expect(unrecognizedKeys(SceneObjectSchema, object)).toContain('radiusM');
  });
});

describe('LightSpecSchema', () => {
  it('rejects a kind other than sun, because P1 models one key light', () => {
    const light = { id: 'fill-bounce', kind: 'fill' };

    expect(LightSpecSchema.safeParse(light).success).toBe(false);
    expect(issuePaths(LightSpecSchema, light)).toContain('kind');
  });
});
