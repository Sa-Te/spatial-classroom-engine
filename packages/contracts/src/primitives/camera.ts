import { z } from 'zod';

// The camera track's P1 vocabulary (docs/TECHNICAL_DESIGN.md §9). Q4 freezes the
// framing enum, Q5 drops sunSide, and Q7 defers every camera target.

export const CameraFramingSchema = z.enum([
  'wideSideProfile',
  'mediumFront',
  'closeUpFace',
  'wideHighAngle',
  'overShoulderBoard',
]);

// framing only. The sun side is derived from the key light (Q5), so authoring it
// on a cue would make the cue wrong the moment the light moves.
export const CameraLockOffSchema = z.object({ framing: CameraFramingSchema }).strict();

// `to` arrives with Q7 and is deliberately absent; durationMs is rejected by
// strictness because a cut is instantaneous (§9:333).
export const CameraCutSchema = z.object({ framing: CameraFramingSchema }).strict();

export type CameraFraming = z.infer<typeof CameraFramingSchema>;
export type CameraLockOff = z.infer<typeof CameraLockOffSchema>;
export type CameraCut = z.infer<typeof CameraCutSchema>;
