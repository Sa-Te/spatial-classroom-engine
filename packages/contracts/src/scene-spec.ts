import { z } from 'zod';

// The scene spec (docs/TECHNICAL_DESIGN.md §8.1): what is on screen, before a cue
// sheet exists. P1 defines identity only — see
// docs/adr/0015-scene-object-and-light-identity-minimal.md. Per-kind payload
// (radius, endpoints, text, still reference) lands in P3 with the renderer that
// consumes it.

// Non-empty: a cue addresses an object by id, so an empty id is not addressable.
const idSchema = z.string().min(1);

export const SceneObjectSchema = z
  .object({
    id: idSchema,
    kind: z.enum(['sphere', 'line', 'label', 'still']),
  })
  .strict();

export const LightSpecSchema = z
  .object({
    id: idSchema,
    kind: z.enum(['sun']),
  })
  .strict();

export const ManipulableSchema = z
  .object({
    parameter: z.enum(['axisTiltDeg', 'orbitSpeed', 'sunElevationDeg']),
    min: z.number(),
    max: z.number(),
    default: z.number(),
    // Open string on purpose (T4-Q4): the design never states the unit of
    // orbitSpeed, so a closed enum here would invent a decision.
    unit: z.string().min(1),
    affordance: z.enum(['grab', 'slider', 'both']),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.min > value.max) {
      ctx.addIssue({
        code: 'custom',
        message: 'min must not exceed max',
        path: ['min'],
      });
      // The range test below is meaningless on an inverted range.
      return;
    }
    if (value.default < value.min || value.default > value.max) {
      ctx.addIssue({
        code: 'custom',
        message: 'default must lie within [min, max]',
        path: ['default'],
      });
    }
  });

export const SceneSpecSchema = z
  .object({
    schemaVersion: z.literal(1),
    sceneId: idSchema,
    // Any non-empty name; membership is deliberately not schema-enforced
    // (T4-Q3). T14 rejects unknown names when the scene graph loads, where the
    // graph exists to check them against.
    anchors: z.array(z.string()).min(1),
    objects: z.array(SceneObjectSchema),
    lights: z.array(LightSpecSchema),
    manipulables: z.array(ManipulableSchema),
  })
  .strict();

export type SceneObject = z.infer<typeof SceneObjectSchema>;
export type LightSpec = z.infer<typeof LightSpecSchema>;
export type Manipulable = z.infer<typeof ManipulableSchema>;
export type SceneSpec = z.infer<typeof SceneSpecSchema>;
