import type { ZodType } from 'zod';
import { describe, expect, it } from 'vitest';
import { CueSchema, CueSheetSchema, WordTimingSchema } from './cue-sheet.js';

type IssueLike = {
  path: PropertyKey[];
  code: string;
  message: string;
  errors?: IssueLike[][];
  keys?: string[];
};

// Zod reports a union failure as one `invalid_union` issue carrying the branch
// issues underneath, with paths relative to the union input. Flattening keeps
// both the union's own path and the full path of the branch that failed.
function flattenIssues(issues: readonly IssueLike[], prefix: PropertyKey[] = []): IssueLike[] {
  return issues.flatMap((issue) => {
    const path = [...prefix, ...issue.path];
    const children = issue.errors === undefined ? [] : flattenIssues(issue.errors.flat(), path);
    return [{ ...issue, path }, ...children];
  });
}

function issuesOf(schema: ZodType, payload: unknown): IssueLike[] {
  const result = schema.safeParse(payload);
  return result.success ? [] : flattenIssues(result.error.issues);
}

function issuePaths(schema: ZodType, payload: unknown): string[] {
  return issuesOf(schema, payload).map((issue) => issue.path.join('.'));
}

function issuesAt(schema: ZodType, payload: unknown, path: string): IssueLike[] {
  return issuesOf(schema, payload).filter((issue) => issue.path.join('.') === path);
}

function unrecognizedKeys(schema: ZodType, payload: unknown): string[] {
  return issuesOf(schema, payload).flatMap((issue) => issue.keys ?? []);
}

// docs/TECHNICAL_DESIGN.md §8.3, character for character. If this fixture ever
// needs editing to parse, the schema has drifted from the prose.
const realFragment = {
  schemaVersion: 1,
  sceneId: 'hot-in-july/s4',
  utterances: [
    {
      id: 'u4',
      text: 'Same sunlight, same amount. In July it lands steep and concentrated.',
      voiceId: 'teacher.maya',
    },
  ],
  cues: [
    {
      id: 'c4.1',
      track: 'teacher',
      primitive: 'teacher.point',
      params: { hand: 'right', target: 'earth.patch' },
      at: { utteranceId: 'u4', wordIndex: 2 },
    },
    {
      id: 'c4.2',
      track: 'camera',
      primitive: 'camera.lockOff',
      params: { framing: 'wideSideProfile', sunSide: 'left' },
      at: { utteranceId: 'u4', wordIndex: 0 },
      motivation: 'hold the frame so the two patches can be compared',
    },
  ],
};

const teacherCue = {
  id: 'c5.1',
  track: 'teacher',
  primitive: 'teacher.point',
  params: { hand: 'right', target: 'earth.patch' },
  at: { utteranceId: 'u4', wordIndex: 2 },
};

const cameraCue = {
  id: 'c5.2',
  track: 'camera',
  primitive: 'camera.lockOff',
  params: { framing: 'wideSideProfile', sunSide: 'left' },
  at: { utteranceId: 'u4', wordIndex: 0 },
  motivation: 'hold the frame so the two patches can be compared',
};

const wordTiming = { word: 'sunlight', startMs: 0, endMs: 420 };

describe('CueSheetSchema', () => {
  it('parses the §8.3 worked fragment unchanged, including the teacher.maya voice', () => {
    const parsed = CueSheetSchema.parse(realFragment);

    expect(parsed).toEqual(realFragment);
    expect(parsed.utterances[0]?.voiceId).toBe('teacher.maya');
    expect(parsed.cues).toHaveLength(2);
  });

  it('parses an utterance carrying the optional style block', () => {
    const sheet = {
      ...realFragment,
      utterances: [
        {
          ...realFragment.utterances[0],
          style: { pace: 'slow', emphasis: ['steep', 'concentrated'] },
        },
      ],
    };

    expect(CueSheetSchema.parse(sheet).utterances[0]?.style).toEqual({
      pace: 'slow',
      emphasis: ['steep', 'concentrated'],
    });
  });

  it('rejects an unknown key inside style, because the nested object is strict', () => {
    const sheet = {
      ...realFragment,
      utterances: [{ ...realFragment.utterances[0], style: { pace: 'slow', pitch: 'high' } }],
    };

    expect(CueSheetSchema.safeParse(sheet).success).toBe(false);
    expect(unrecognizedKeys(CueSheetSchema, sheet)).toContain('pitch');
  });

  it('rejects a pace outside slow and normal', () => {
    const sheet = {
      ...realFragment,
      utterances: [{ ...realFragment.utterances[0], style: { pace: 'fast' } }],
    };

    expect(CueSheetSchema.safeParse(sheet).success).toBe(false);
    expect(issuePaths(CueSheetSchema, sheet)).toContain('utterances.0.style.pace');
  });
});

describe('CueSchema timing', () => {
  it('rejects a cue that carries both utteranceId and offsetMs, because the forms are exclusive', () => {
    const cue = { ...teacherCue, at: { utteranceId: 'u4', wordIndex: 2, offsetMs: 1200 } };

    expect(CueSchema.safeParse(cue).success).toBe(false);
    expect(issuePaths(CueSchema, cue)).toContain('at');
  });

  it('rejects a cue with no at, because a cue with no time cannot be resolved', () => {
    const { at: _at, ...cueWithoutAt } = teacherCue;

    expect(CueSchema.safeParse(cueWithoutAt).success).toBe(false);
    expect(issuePaths(CueSchema, cueWithoutAt)).toContain('at');
  });

  it('rejects an empty at object, because it names no time at all', () => {
    const cue = { ...teacherCue, at: {} };

    expect(CueSchema.safeParse(cue).success).toBe(false);
    expect(issuePaths(CueSchema, cue)).toContain('at');
  });

  it('rejects wordIndex -1, because there is no word before the first', () => {
    const cue = { ...teacherCue, at: { utteranceId: 'u4', wordIndex: -1 } };

    expect(CueSchema.safeParse(cue).success).toBe(false);
    expect(issuePaths(CueSchema, cue)).toContain('at.wordIndex');
  });

  it('rejects a fractional wordIndex, because a word is addressed whole', () => {
    const cue = { ...teacherCue, at: { utteranceId: 'u4', wordIndex: 1.5 } };

    expect(CueSchema.safeParse(cue).success).toBe(false);
    expect(issuePaths(CueSchema, cue)).toContain('at.wordIndex');
  });

  it('accepts an explicit offsetMs for a cue independent of speech', () => {
    const cue = { ...teacherCue, at: { offsetMs: 0 } };

    expect(CueSchema.parse(cue).at).toEqual({ offsetMs: 0 });
  });

  it('rejects a negative offsetMs', () => {
    const cue = { ...teacherCue, at: { offsetMs: -250 } };

    expect(CueSchema.safeParse(cue).success).toBe(false);
    expect(issuePaths(CueSchema, cue)).toContain('at.offsetMs');
  });
});

describe('CueSchema motivation', () => {
  it('rejects a camera cue with no motivation, naming the cue in the issue', () => {
    const { motivation: _motivation, ...cue } = cameraCue;

    expect(CueSchema.safeParse(cue).success).toBe(false);

    const motivationIssues = issuesAt(CueSchema, cue, 'motivation');
    expect(motivationIssues).toHaveLength(1);
    expect(motivationIssues[0]?.message).toContain('c5.2');
  });

  it('rejects an empty-string motivation on a camera cue', () => {
    const cue = { ...cameraCue, motivation: '' };

    expect(CueSchema.safeParse(cue).success).toBe(false);
    expect(issuePaths(CueSchema, cue)).toContain('motivation');
  });

  it('accepts a camera cue that declares its motivation', () => {
    const parsed = CueSchema.parse(cameraCue);

    expect(parsed.motivation).toBe('hold the frame so the two patches can be compared');
  });

  it('accepts a teacher cue with no motivation, because only camera moves must be motivated', () => {
    const parsed = CueSchema.parse(teacherCue);

    expect(parsed.motivation).toBeUndefined();
    expect(parsed.track).toBe('teacher');
  });
});

describe('CueSchema shape', () => {
  it('rejects a track outside the closed seven', () => {
    const cue = { ...teacherCue, track: 'spotlight' };

    expect(CueSchema.safeParse(cue).success).toBe(false);
    expect(issuePaths(CueSchema, cue)).toContain('track');
  });

  it('rejects an unknown key on a cue, because the schema is strict', () => {
    const cue = { ...teacherCue, priority: 3 };

    expect(CueSchema.safeParse(cue).success).toBe(false);
    expect(unrecognizedKeys(CueSchema, cue)).toContain('priority');
  });

  it('accepts arbitrary nested params, because primitive schemas validate them later', () => {
    const cue = {
      ...teacherCue,
      params: { nested: { deep: [1, 'two', null, { three: true }] }, flag: false },
    };

    const parsed = CueSchema.parse(cue);

    expect(parsed.params).toEqual({
      nested: { deep: [1, 'two', null, { three: true }] },
      flag: false,
    });
  });

  it('rejects an empty primitive id', () => {
    const cue = { ...teacherCue, primitive: '' };

    expect(CueSchema.safeParse(cue).success).toBe(false);
    expect(issuePaths(CueSchema, cue)).toContain('primitive');
  });
});

describe('WordTimingSchema', () => {
  it('parses a word whose end is after its start', () => {
    expect(WordTimingSchema.parse(wordTiming)).toEqual(wordTiming);
  });

  it('rejects a zero-length word, with the issue on endMs', () => {
    const timing = { word: 'sunlight', startMs: 420, endMs: 420 };

    expect(WordTimingSchema.safeParse(timing).success).toBe(false);
    expect(issuePaths(WordTimingSchema, timing)).toContain('endMs');
  });

  it('rejects a word whose end precedes its start', () => {
    const timing = { word: 'sunlight', startMs: 420, endMs: 100 };

    expect(WordTimingSchema.safeParse(timing).success).toBe(false);
    expect(issuePaths(WordTimingSchema, timing)).toContain('endMs');
  });

  it('rejects a negative startMs and an empty word', () => {
    const negativeStart = { ...wordTiming, startMs: -1 };
    const emptyWord = { ...wordTiming, word: '' };

    expect(WordTimingSchema.safeParse(negativeStart).success).toBe(false);
    expect(issuePaths(WordTimingSchema, negativeStart)).toContain('startMs');
    expect(WordTimingSchema.safeParse(emptyWord).success).toBe(false);
    expect(issuePaths(WordTimingSchema, emptyWord)).toContain('word');
  });
});
