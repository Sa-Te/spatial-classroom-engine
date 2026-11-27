import { z } from 'zod';
import { AxisParameterSchema } from './scene.js';

// The learner track's P1 vocabulary (docs/TECHNICAL_DESIGN.md §9).
//
// Whether objectId exists and whether parameter is declared manipulable on that
// object is T15's scene-aware check, for the same reason as scene.setParam: a
// schema cannot see a scene graph.

// The silence is a real pause the timeline declares (§1.7.1), so it needs a floor
// long enough to answer and a ceiling that is still a pause rather than a stall.
export const LearnerHoldSilenceSchema = z
  .object({ ms: z.number().int().min(500).max(4000) })
  .strict();

export const LearnerEnableGrabSchema = z
  .object({
    // Addressable: an empty id names no object.
    objectId: z.string().min(1),
    parameter: AxisParameterSchema,
  })
  .strict();

export type LearnerHoldSilence = z.infer<typeof LearnerHoldSilenceSchema>;
export type LearnerEnableGrab = z.infer<typeof LearnerEnableGrabSchema>;
