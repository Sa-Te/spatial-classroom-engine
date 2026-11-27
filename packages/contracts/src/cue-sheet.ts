import { z } from 'zod';

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

export const CueSchema = z
  .object({
    id: idSchema,
    track: z.enum(['camera', 'teacher', 'scene', 'board', 'light', 'learner', 'audio']),
    // PrimitiveId is named in §8.2 but defined nowhere. P1 keeps the field a
    // string; Q1 narrows it to the closed nine-id union at T6.
    primitive: z.string().min(1),
    // Deliberately unvalidated here: §8.2 validates params against the
    // primitive's own schema. ADR 0016 replaces this record with a
    // discriminated union keyed on `primitive` at T6.
    params: z.record(z.string(), z.unknown()),
    at: cueAtSchema,
    motivation: z.string().min(1).optional(),
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
  });

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
