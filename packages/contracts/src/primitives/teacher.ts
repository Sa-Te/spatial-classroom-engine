import { z } from 'zod';

// The teacher track's P1 vocabulary (docs/TECHNICAL_DESIGN.md §9).
//
// target is an anchor name and is NOT validated against a scene here. §9's
// "anchor exists" rule belongs to T15, where SceneSpec resolves to a scene graph
// and the graph exists to check the name against. A schema cannot see a scene,
// and doing so here would make the cue sheet depend on a scene it does not own.
const anchorNameSchema = z.string().min(1);

export const TeacherLookAtSchema = z.object({ target: anchorNameSchema }).strict();

export const TeacherPointSchema = z
  .object({
    // The rig has two hands; "both" is not a deixis target.
    hand: z.enum(['left', 'right']),
    target: anchorNameSchema,
  })
  .strict();

export type TeacherLookAt = z.infer<typeof TeacherLookAtSchema>;
export type TeacherPoint = z.infer<typeof TeacherPointSchema>;
