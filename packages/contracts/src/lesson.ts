import { z } from 'zod';
import { TopicRefSchema } from './evidence.js';

// The lesson plan (docs/TECHNICAL_DESIGN.md §7): what the planner emits before a
// scene or a cue exists. Schema only — idea quality and scope are validator work.

// Closed sets, not free strings: each is a decision the lesson builder branches on
// (pacing, vocabulary, how much prior knowledge it may assume).
const ageBandSchema = z.enum(['16+']);
const readingLevelSchema = z.enum(['intro', 'intermediate', 'advanced']);
const priorKnowledgeSchema = z.enum(['none', 'some', 'strong']);
const paceSchema = z.enum(['slower', 'standard', 'brisker']);

export const AudienceProfileSchema = z
  .object({
    ageBand: ageBandSchema,
    readingLevel: readingLevelSchema,
    priorKnowledge: priorKnowledgeSchema,
    pace: paceSchema,
  })
  .strict();

export const SceneBriefSchema = z
  .object({
    // Order within the lesson; the planner writes the array, the index is authority.
    index: z.number().int().min(0),
    idea: z.string(),
    // The wrong belief this scene overturns, when the packet names one.
    misconception: z.string().optional(),
    // Claim ids, resolved by the lesson builder; an unresolvable id is a hard failure there.
    evidenceClaimIds: z.array(z.string()),
    participation: z.enum(['watch', 'guess', 'do']).optional(),
    // Seconds. §7 allows 60–90 per scene and one idea per scene.
    durationTargetSec: z.number().int().min(60).max(90),
  })
  .strict();

export const LessonPlanSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string(),
    evidencePacketId: z.string(),
    // §6 defines TopicRef. The lesson states its own topic rather than being
    // reachable only through the packet's.
    topic: TopicRefSchema,
    audience: AudienceProfileSchema,
    title: z.string(),
    // One sentence the learner should be able to say afterwards.
    objective: z.string(),
    // Minutes, integer. §7 says "5–7 or 8–12": one continuous 5–12 range, no branch.
    estimatedMinutes: z.number().int().min(5).max(12),
    arc: z
      .object({
        setup: z.array(z.string()),
        confrontation: z.array(z.string()),
        resolution: z.array(z.string()),
      })
      .strict(),
    scenes: z.array(SceneBriefSchema),
    // Present when this lesson came from a CoursePlan split.
    splitRationale: z.string().optional(),
  })
  .strict();

export type AudienceProfile = z.infer<typeof AudienceProfileSchema>;
export type SceneBrief = z.infer<typeof SceneBriefSchema>;
export type LessonPlan = z.infer<typeof LessonPlanSchema>;
