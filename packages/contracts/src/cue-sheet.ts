import { z } from 'zod';
import {
  PrimitiveIdSchema,
  lookupPrimitive,
  primitiveRegistry,
  type PrimitiveId,
} from './primitives/index.js';

// The cue sheet (docs/TECHNICAL_DESIGN.md §8.2): what is said, and which
// primitive fires on which word. Field names are fixed by §8.2 and by the
// worked fragment in §8.3, which parses verbatim in the test file.

// Non-empty: a cue addresses an utterance by id, and an anchor or scene is
// named, so an empty id names nothing.
const idSchema = z.string().min(1);

export const UtteranceScriptSchema = z
  .object({
    id: idSchema,
    text: z.string(),
    voiceId: z.string(),
    // Both keys strict: an unrecognised style field is a contract change, not
    // something to silently drop on the way to the TTS adapter.
    style: z
      .object({
        pace: z.enum(['slow', 'normal']),
        emphasis: z.array(z.string()).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

// Word-anchored — the preferred form (§8.2:291). Addresses one word of one
// utterance; the resolver turns it into a millisecond.
const wordAnchoredAtSchema = z
  .object({
    utteranceId: idSchema,
    wordIndex: z.number().int().min(0),
  })
  .strict();

// Explicit offset — allowed only for a cue genuinely independent of speech: a
// hold, a world event, a pre-roll.
const explicitAtSchema = z
  .object({
    offsetMs: z.number().int().min(0),
  })
  .strict();

// Strictness on both branches is what rejects a cue carrying both timing forms:
// it matches neither branch, so the union fails. No hand-written exclusivity
// check is needed or wanted.
const cueAtSchema = z.union([wordAnchoredAtSchema, explicitAtSchema]);

// The fields every branch shares, written once: the branch list below spreads
// this rather than restating five field names nine times.
const cueSharedShape = {
  id: idSchema,
  track: z.enum(['camera', 'teacher', 'scene', 'board', 'light', 'learner', 'audio']),
  at: cueAtSchema,
  // §1.7.4: every camera move names the idea it follows.
  motivation: z.string().min(1).optional(),
};

// One branch per closed primitive id: `primitive` is the literal and `params` is
// the schema that registry entry already owns, so no parameter shape is declared
// twice (ADR 0016). The branch *type* is written from the registry rather than
// inferred from the map below: a `.map` callback is typed once with `id` widened
// to PrimitiveId, and `primitiveRegistry[id]['schema']` there is already the
// union of all nine.
type CueBranch = {
  [Id in PrimitiveId]: z.ZodObject<
    typeof cueSharedShape & {
      primitive: z.ZodLiteral<Id>;
      params: (typeof primitiveRegistry)[Id]['schema'];
    }
  >;
}[PrimitiveId];

// The runtime array is exactly one branch per id, generated rather than written
// out; the assertion attaches the per-id types the map cannot infer.
const cueBranches = PrimitiveIdSchema.options.map((id) =>
  z
    .object({
      ...cueSharedShape,
      primitive: z.literal(id),
      params: primitiveRegistry[id].schema,
    })
    .strict(),
) as unknown as CueBranch[];

// A discriminated union takes a non-empty tuple; primitiveRegistry is a total
// object over the closed nine, so the generated array is never empty.
const cueUnion = z.discriminatedUnion('primitive', cueBranches as [CueBranch, ...CueBranch[]]);

// The pre-check exists only because zod's own union issue does not carry the
// primitive id, and zod stops at the first failure — a branch that fails on its
// params never reaches a later refine. Naming the primitive is this base
// object's job; the union above is what the parsed value becomes.
const cuePreCheck = z
  .object({
    ...cueSharedShape,
    // A plain non-empty string rather than the closed enum: a miss has to be
    // reported with the offending id in the message, which an enum cannot do.
    primitive: z.string().min(1),
    // Accepted here, then validated against the entry's schema below.
    params: z.unknown(),
  })
  .strict()
  .superRefine((cue, ctx) => {
    // §1.7.4: every camera move names the idea it follows. A move that cannot
    // state its motivation fails here rather than in review.
    if (cue.track === 'camera' && cue.motivation === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['motivation'],
        message: `cue ${cue.id} is on the camera track and must declare a motivation`,
      });
    }

    const lookup = lookupPrimitive(cue.primitive);
    if (!lookup.ok) {
      ctx.addIssue({
        code: 'custom',
        path: ['primitive'],
        message: `cue ${cue.id}: unknown primitive '${cue.primitive}'`,
      });
      return;
    }

    if (!lookup.entry.schema.safeParse(cue.params).success) {
      ctx.addIssue({
        code: 'custom',
        path: ['params'],
        message: `cue ${cue.id}: params do not match primitive '${cue.primitive}'`,
      });
    }
  });

export const CueSchema = cuePreCheck.pipe(cueUnion);

export const CueSheetSchema = z
  .object({
    schemaVersion: z.literal(1),
    sceneId: idSchema,
    utterances: z.array(UtteranceScriptSchema),
    cues: z.array(CueSchema),
  })
  .strict();

// Whether a word is on the timeline is a fact, not an opinion: a word that ends
// before it starts (or ends where it starts) makes the timeline unbuildable.
export const WordTimingSchema = z
  .object({
    word: z.string().min(1),
    startMs: z.number().int().min(0),
    endMs: z.number().int().min(0),
  })
  .strict()
  .superRefine((timing, ctx) => {
    if (timing.endMs <= timing.startMs) {
      ctx.addIssue({
        code: 'custom',
        path: ['endMs'],
        message: `endMs (${timing.endMs}) must be greater than startMs (${timing.startMs})`,
      });
    }
  });

export type UtteranceScript = z.infer<typeof UtteranceScriptSchema>;
export type Cue = z.infer<typeof CueSchema>;
export type CueSheet = z.infer<typeof CueSheetSchema>;
export type WordTiming = z.infer<typeof WordTimingSchema>;
