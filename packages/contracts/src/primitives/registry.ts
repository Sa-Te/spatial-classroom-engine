import { z } from 'zod';
import type { ZodType } from 'zod';
import { CameraCutSchema, CameraLockOffSchema } from './camera.js';
import type { PrimitiveId } from './index.js';
import { LearnerEnableGrabSchema, LearnerHoldSilenceSchema } from './learner.js';
import { LightKeyFromSunSchema } from './light.js';
import { SceneAnimateParamSchema, SceneSetParamSchema } from './scene.js';
import { TeacherLookAtSchema, TeacherPointSchema } from './teacher.js';

// §9's track column. The track is the player group a primitive belongs to, so the cue
// sheet, the executor (P3) and the tests agree on one closed set.
export const PrimitiveTrackSchema = z.enum(['camera', 'teacher', 'scene', 'light', 'learner']);

export type PrimitiveTrack = z.infer<typeof PrimitiveTrackSchema>;

export interface PrimitiveEntry {
  readonly schema: ZodType;
  readonly track: PrimitiveTrack;
}

// A total Record, not Partial: a PrimitiveId without an entry is a compile error, so
// the registry cannot fall behind the closed set (Q1/Q2) and no fallback entry exists
// to swallow an unknown id.
//
// Imported from the sibling files rather than from ./index.js: index re-exports this
// module, and a runtime cycle would read the schemas before they are initialised.
export const primitiveRegistry: Readonly<Record<PrimitiveId, PrimitiveEntry>> = {
  'camera.lockOff': { schema: CameraLockOffSchema, track: 'camera' },
  'camera.cut': { schema: CameraCutSchema, track: 'camera' },
  'teacher.lookAt': { schema: TeacherLookAtSchema, track: 'teacher' },
  'teacher.point': { schema: TeacherPointSchema, track: 'teacher' },
  'scene.setParam': { schema: SceneSetParamSchema, track: 'scene' },
  'scene.animateParam': { schema: SceneAnimateParamSchema, track: 'scene' },
  'light.keyFromSun': { schema: LightKeyFromSunSchema, track: 'light' },
  'learner.holdSilence': { schema: LearnerHoldSilenceSchema, track: 'learner' },
  'learner.enableGrab': { schema: LearnerEnableGrabSchema, track: 'learner' },
};

// A miss carries the id back: the caller has to embarrass an unknown primitive in a
// validation message, and "unknown primitive" without the name is unactionable.
export type PrimitiveLookup =
  | { readonly ok: true; readonly entry: PrimitiveEntry }
  | { readonly ok: false; readonly id: string };

// Takes a plain string because the id on a composed cue is model output, which is
// untrusted. A miss is a typed result, never a default entry and never a throw.
export function lookupPrimitive(id: string): PrimitiveLookup {
  for (const [knownId, entry] of Object.entries(primitiveRegistry)) {
    if (knownId === id) return { ok: true, entry };
  }
  return { ok: false, id };
}
