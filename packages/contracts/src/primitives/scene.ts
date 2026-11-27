import { z } from 'zod';

// The scene track's P1 vocabulary (docs/TECHNICAL_DESIGN.md §9).
//
// Q10 freezes the manipulable parameter set to these three names. §9's table says
// only "parameter"; a free string would make learner.enableGrab's "parameter
// declared manipulable" rule uncheckable, because there would be nothing to
// compare the declaration against.
export const AxisParameterSchema = z.enum(['axisTiltDeg', 'orbitSpeed', 'sunElevationDeg']);

// Value *within* a scene's declared Manipulable range is T15's scene-aware check: a
// schema cannot see a scene. The window-overlap rule for a second setParam on one
// parameter is T12's.
export const SceneSetParamSchema = z
  .object({ parameter: AxisParameterSchema, value: z.number() })
  .strict();

export const SceneAnimateParamSchema = z
  .object({
    parameter: AxisParameterSchema,
    from: z.number(),
    to: z.number(),
    // A zero-length interpolation divides by zero; a fractional millisecond is not
    // a duration any clock can honour.
    durationMs: z.number().int().positive(),
  })
  .strict();

export type AxisParameter = z.infer<typeof AxisParameterSchema>;
export type SceneSetParam = z.infer<typeof SceneSetParamSchema>;
export type SceneAnimateParam = z.infer<typeof SceneAnimateParamSchema>;
