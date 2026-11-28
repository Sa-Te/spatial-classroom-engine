import type { ZodType } from 'zod';
import { describe, expect, it } from 'vitest';
import { AudienceProfileSchema, LessonPlanSchema, SceneBriefSchema } from './lesson.js';

// Declared concretely rather than read back out of the plan: under
// noUncheckedIndexedAccess an indexed read is `SceneBrief | undefined`, and
// spreading `undefined` still compiles, so rejection tests could pass for the
// wrong reason if the plan's scenes array were ever emptied.
const sceneBriefExample = {
  index: 0,
  idea: 'Closer to the Sun does not mean warmer',
  misconception: 'Seasons come from distance to the Sun',
  evidenceClaimIds: ['c1'],
  participation: 'guess',
  durationTargetSec: 75,
};

// A plan in the shape of docs/TECHNICAL_DESIGN.md §7, with concrete values.
const lessonPlanExample = {
  schemaVersion: 1,
  id: 'lsn_01j9z5c7n3',
  evidencePacketId: 'pkt_01j9z4k2m8',
  topic: { id: 't_01j9z3r8q1', rawText: 'Why is January cold in the northern hemisphere?' },
  audience: {
    ageBand: '16+',
    readingLevel: 'intermediate',
    priorKnowledge: 'some',
    pace: 'standard',
  },
  title: 'Why January is cold in the north',
  objective: 'Explain why northern winter happens while Earth is nearest the Sun.',
  estimatedMinutes: 8,
  arc: {
    setup: ['Earth is closer in January', 'Yet the north is colder'],
    confrontation: ['Sunlight lands at a steeper angle', 'Spread over more ground'],
    resolution: ['Tilt, not distance, sets the seasons'],
  },
  scenes: [sceneBriefExample],
};

function issuePaths(schema: ZodType, payload: unknown): string[] {
  const result = schema.safeParse(payload);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

function unrecognizedKeys(schema: ZodType, payload: unknown): string[] {
  const result = schema.safeParse(payload);
  return result.success
    ? []
    : result.error.issues.flatMap((issue) =>
        issue.code === 'unrecognized_keys' ? issue.keys : [],
      );
}

describe('LessonPlanSchema', () => {
  it('parses a §7 lesson plan with one scene brief unchanged', () => {
    const parsed = LessonPlanSchema.parse(lessonPlanExample);

    expect(parsed).toEqual(lessonPlanExample);
    expect(parsed.scenes).toHaveLength(1);
  });

  it('rejects estimatedMinutes of 4, under the 5 to 12 range', () => {
    const plan = { ...lessonPlanExample, estimatedMinutes: 4 };

    expect(LessonPlanSchema.safeParse(plan).success).toBe(false);
    expect(issuePaths(LessonPlanSchema, plan)).toContain('estimatedMinutes');
  });

  it('rejects estimatedMinutes of 13, over the 5 to 12 range', () => {
    const plan = { ...lessonPlanExample, estimatedMinutes: 13 };

    expect(LessonPlanSchema.safeParse(plan).success).toBe(false);
    expect(issuePaths(LessonPlanSchema, plan)).toContain('estimatedMinutes');
  });

  it('rejects an arc missing the resolution section', () => {
    const plan = {
      ...lessonPlanExample,
      arc: { setup: ['Closer in January'], confrontation: ['Steeper sunlight'] },
    };

    expect(LessonPlanSchema.safeParse(plan).success).toBe(false);
    expect(issuePaths(LessonPlanSchema, plan)).toContain('arc.resolution');
  });

  it('rejects a topic with no rawText, because the learner words are what the lesson echoes', () => {
    const plan = { ...lessonPlanExample, topic: { id: 't_01j9z3r8q1' } };

    expect(LessonPlanSchema.safeParse(plan).success).toBe(false);
    expect(issuePaths(LessonPlanSchema, plan)).toContain('topic.rawText');
  });

  it('rejects a plan with no topic at all, because a lesson must state what it covers', () => {
    const { topic: _topic, ...planWithoutTopic } = lessonPlanExample;

    expect(LessonPlanSchema.safeParse(planWithoutTopic).success).toBe(false);
    expect(issuePaths(LessonPlanSchema, planWithoutTopic)).toContain('topic');
  });
});

describe('AudienceProfileSchema', () => {
  it('rejects a readingLevel outside the closed set', () => {
    const audience = { ...lessonPlanExample.audience, readingLevel: 'expert' };

    expect(AudienceProfileSchema.safeParse(audience).success).toBe(false);
    expect(issuePaths(AudienceProfileSchema, audience)).toContain('readingLevel');
  });

  it('rejects an audience with no pace, proving pace is required', () => {
    const { pace: _pace, ...audienceWithoutPace } = lessonPlanExample.audience;

    expect(AudienceProfileSchema.safeParse(audienceWithoutPace).success).toBe(false);
    expect(issuePaths(AudienceProfileSchema, audienceWithoutPace)).toContain('pace');
  });
});

describe('SceneBriefSchema', () => {
  it('rejects durationTargetSec of 59, under the 60 to 90 range', () => {
    const scene = { ...sceneBriefExample, durationTargetSec: 59 };

    expect(SceneBriefSchema.safeParse(scene).success).toBe(false);
    expect(issuePaths(SceneBriefSchema, scene)).toContain('durationTargetSec');
  });

  it('rejects durationTargetSec of 91, over the 60 to 90 range', () => {
    const scene = { ...sceneBriefExample, durationTargetSec: 91 };

    expect(SceneBriefSchema.safeParse(scene).success).toBe(false);
    expect(issuePaths(SceneBriefSchema, scene)).toContain('durationTargetSec');
  });

  it('rejects a participation outside watch, guess and do', () => {
    const scene = { ...sceneBriefExample, participation: 'debate' };

    expect(SceneBriefSchema.safeParse(scene).success).toBe(false);
    expect(issuePaths(SceneBriefSchema, scene)).toContain('participation');
  });

  it('accepts a scene brief that omits misconception and participation', () => {
    const scene = {
      index: 1,
      idea: 'The Sun is highest in June',
      evidenceClaimIds: ['c1', 'c2'],
      durationTargetSec: 90,
    };

    expect(SceneBriefSchema.safeParse(scene).success).toBe(true);
  });

  it('rejects an unknown key on a scene brief', () => {
    const scene = { ...sceneBriefExample, cameraMove: 'pushIn' };

    expect(SceneBriefSchema.safeParse(scene).success).toBe(false);
    expect(unrecognizedKeys(SceneBriefSchema, scene)).toContain('cameraMove');
  });
});
