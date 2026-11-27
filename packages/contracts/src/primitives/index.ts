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

// Q1/Q2: the closed nine, dotted. Deferred primitives are absent from the type
// rather than present and unvalidated — adding one means shipping its schema and
// validator in the same change.
//
// ponytail: a lookup from id to parameter schema arrives at T6B with the
// Cue.params discriminated union, which is the first consumer of that lookup.
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
