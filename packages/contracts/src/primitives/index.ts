import { z } from 'zod';

export {
  CameraCutSchema,
  CameraFramingSchema,
  CameraLockOffSchema,
  type CameraCut,
  type CameraFraming,
  type CameraLockOff,
} from './camera.js';
export {
  TeacherLookAtSchema,
  TeacherPointSchema,
  type TeacherLookAt,
  type TeacherPoint,
} from './teacher.js';
export {
  AxisParameterSchema,
  SceneAnimateParamSchema,
  SceneSetParamSchema,
  type AxisParameter,
  type SceneAnimateParam,
  type SceneSetParam,
} from './scene.js';
export { LightKeyFromSunSchema, type LightKeyFromSun } from './light.js';
export {
  LearnerEnableGrabSchema,
  LearnerHoldSilenceSchema,
  type LearnerEnableGrab,
  type LearnerHoldSilence,
} from './learner.js';
export {
  PrimitiveTrackSchema,
  lookupPrimitive,
  primitiveRegistry,
  type PrimitiveEntry,
  type PrimitiveLookup,
  type PrimitiveParams,
  type PrimitiveTrack,
} from './registry.js';

// Q1/Q2: the closed nine, dotted. Deferred primitives are absent from the type
// rather than present and unvalidated — adding one means shipping its schema and
// validator in the same change.
//
// registry.ts maps each id to its schema and track (T7); Cue.params consumes
// that registry in cue-sheet.ts (ADR 0016).
export const PrimitiveIdSchema = z.enum([
  'camera.lockOff',
  'camera.cut',
  'teacher.lookAt',
  'teacher.point',
  'scene.setParam',
  'scene.animateParam',
  'light.keyFromSun',
  'learner.holdSilence',
  'learner.enableGrab',
]);

export type PrimitiveId = z.infer<typeof PrimitiveIdSchema>;
