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

export interface PrimitiveEntry<T extends ZodType = ZodType> {
  readonly schema: T;
  readonly track: PrimitiveTrack;
}

// A total object, checked by `satisfies`: a PrimitiveId without an entry is a
// compile error, and each entry keeps its literal schema type so the cue union
// can derive that branch's params type instead of erasing it to ZodType.
//
// Imported from the sibling files rather than from ./index.js: index re-exports this
// module, and a runtime cycle would read the schemas before they are initialised.
export const primitiveRegistry = {
  'camera.lockOff': { schema: CameraLockOffSchema, track: 'camera' },
  'camera.cut': { schema: CameraCutSchema, track: 'camera' },
  'teacher.lookAt': { schema: TeacherLookAtSchema, track: 'teacher' },
  'teacher.point': { schema: TeacherPointSchema, track: 'teacher' },
  'scene.setParam': { schema: SceneSetParamSchema, track: 'scene' },
  'scene.animateParam': { schema: SceneAnimateParamSchema, track: 'scene' },
  'light.keyFromSun': { schema: LightKeyFromSunSchema, track: 'light' },
  'learner.holdSilence': { schema: LearnerHoldSilenceSchema, track: 'learner' },
  'learner.enableGrab': { schema: LearnerEnableGrabSchema, track: 'learner' },
} as const satisfies Record<PrimitiveId, PrimitiveEntry>;

// The parameters belonging to one primitive id, read from that registry entry.
export type PrimitiveParams<Id extends PrimitiveId> = z.infer<
  (typeof primitiveRegistry)[Id]['schema']
>;

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
