import { z } from 'zod';

// The evidence packet (docs/TECHNICAL_DESIGN.md §6): the frozen, cited truth a
// lesson is built from. Schema only — resolution rules live in the lesson builder.

// Closed sets, not free strings: a new confidence or unit is a schema change with
// a compatibility note, because a claim's unit is shown to the learner.
const confidenceSchema = z.enum(['verified', 'single-source', 'contested']);
const unitSchema = z.enum(['km', 'deg', 'percent', 's']);

export const TopicRefSchema = z
  .object({
    id: z.string(),
    // The learner's words, kept so the lesson can echo them back.
    rawText: z.string(),
  })
  .strict();

export const ClaimSchema = z
  .object({
    id: z.string(),
    text: z.string(),
    // A claim may be qualitative (no number) or quantitative. The unit is optional
    // for the same reason: "Seasons are caused by tilt" has nothing to measure.
    numericValue: z.number().optional(),
    unit: unitSchema.optional(),
    // Non-empty is required by §6 and enforced here, so no downstream check exists.
    websiteRefs: z.array(z.string()).min(1),
    confidence: confidenceSchema,
  })
  .strict();

export const SourceSchema = z
  .object({
    id: z.string(),
    url: z.url(),
    title: z.string(),
    publisher: z.string(),
    retrievedAt: z.iso.datetime(),
    // The sentence the claim came from, not a summary of it.
    excerpt: z.string(),
    licence: z.string().optional(),
  })
  .strict();

export const MisconceptionSchema = z
  .object({
    id: z.string(),
    text: z.string(),
    // Claim ids, resolved by the lesson builder; an unresolvable id is a hard failure there.
    correctedByClaimIds: z.array(z.string()),
  })
  .strict();

export const EvidencePacketSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string(),
    topic: TopicRefSchema,
    researchedAt: z.iso.datetime(),
    claims: z.array(ClaimSchema),
    sources: z.array(SourceSchema),
    misconceptions: z.array(MisconceptionSchema),
    // Displayed, never hidden: "I could not verify X" is a feature (§6).
    unresolved: z.array(z.string()),
  })
  .strict();

export type TopicRef = z.infer<typeof TopicRefSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Misconception = z.infer<typeof MisconceptionSchema>;
export type EvidencePacket = z.infer<typeof EvidencePacketSchema>;
