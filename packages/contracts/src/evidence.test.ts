import type { ZodType } from 'zod';
import { describe, expect, it } from 'vitest';
import {
  ClaimSchema,
  EvidencePacketSchema,
  MisconceptionSchema,
  SourceSchema,
} from './evidence.js';

// A packet in the shape of docs/TECHNICAL_DESIGN.md §6, with concrete values.
const evidencePacketExample = {
  schemaVersion: 1,
  id: 'pkt_01j9z4k2m8',
  topic: { id: 'topic_sun_distance', rawText: 'why Earth is closer to the Sun in January' },
  researchedAt: '2026-11-27T10:00:00.000Z',
  claims: [
    {
      id: 'c1',
      text: 'Earth is about 147.1 million km from the Sun in early January.',
      numericValue: 147.1,
      unit: 'km',
      websiteRefs: ['https://example.org/perihelion'],
      confidence: 'verified',
    },
  ],
  sources: [
    {
      id: 's1',
      url: 'https://example.org/perihelion',
      title: 'Earth at perihelion',
      publisher: 'Example Observatory',
      retrievedAt: '2026-11-27T09:58:00.000Z',
      excerpt: 'Perihelion falls in early January, at roughly 147.1 million km.',
      licence: 'CC BY 4.0',
    },
  ],
  misconceptions: [
    {
      id: 'm1',
      text: 'Seasons are caused by distance from the Sun.',
      correctedByClaimIds: ['c1'],
    },
  ],
  unresolved: ['Whether the 147.1 million km figure holds for 2027'],
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

describe('EvidencePacketSchema', () => {
  it('parses a §6 packet with a claim, a source and a misconception unchanged', () => {
    const parsed = EvidencePacketSchema.parse(evidencePacketExample);

    expect(parsed).toEqual(evidencePacketExample);
  });

  it('rejects a claim whose websiteRefs is empty, at the claim path', () => {
    const claim = { ...evidencePacketExample.claims[0], websiteRefs: [] };
    const packet = { ...evidencePacketExample, claims: [claim] };

    expect(EvidencePacketSchema.safeParse(packet).success).toBe(false);
    expect(issuePaths(EvidencePacketSchema, packet)).toContain('claims.0.websiteRefs');
    expect(ClaimSchema.safeParse(claim).success).toBe(false);
    expect(issuePaths(ClaimSchema, claim)).toContain('websiteRefs');
  });

  it('rejects a researchedAt that is not ISO 8601', () => {
    const packet = { ...evidencePacketExample, researchedAt: '27 November 2026' };

    expect(EvidencePacketSchema.safeParse(packet).success).toBe(false);
    expect(issuePaths(EvidencePacketSchema, packet)).toContain('researchedAt');
  });

  it('rejects a schemaVersion other than 1', () => {
    const packet = { ...evidencePacketExample, schemaVersion: 2 };

    expect(EvidencePacketSchema.safeParse(packet).success).toBe(false);
    expect(issuePaths(EvidencePacketSchema, packet)).toContain('schemaVersion');
  });

  it('rejects a source whose url is not a URL', () => {
    const source = { ...evidencePacketExample.sources[0], url: 'example.org/perihelion' };
    const packet = { ...evidencePacketExample, sources: [source] };

    expect(EvidencePacketSchema.safeParse(packet).success).toBe(false);
    expect(issuePaths(EvidencePacketSchema, packet)).toContain('sources.0.url');
  });
});

describe('ClaimSchema', () => {
  it('rejects a confidence outside the closed set', () => {
    const claim = { ...evidencePacketExample.claims[0], confidence: 'probably' };

    expect(ClaimSchema.safeParse(claim).success).toBe(false);
    expect(issuePaths(ClaimSchema, claim)).toContain('confidence');
  });

  it('rejects a unit outside the closed set', () => {
    const claim = { ...evidencePacketExample.claims[0], unit: 'lightyears' };

    expect(ClaimSchema.safeParse(claim).success).toBe(false);
    expect(issuePaths(ClaimSchema, claim)).toContain('unit');
  });

  it('rejects an unknown key on a claim', () => {
    const claim = { ...evidencePacketExample.claims[0], citedBy: 'c2' };

    const result = ClaimSchema.safeParse(claim);

    expect(result.success).toBe(false);
    expect(unrecognizedKeys(ClaimSchema, claim)).toContain('citedBy');
  });

  it('accepts a claim that omits the optional numericValue and unit', () => {
    const claim = {
      id: 'c2',
      text: 'Earth reaches perihelion in early January.',
      websiteRefs: ['https://example.org/perihelion'],
      confidence: 'single-source',
    };

    expect(ClaimSchema.safeParse(claim).success).toBe(true);
  });
});

describe('MisconceptionSchema', () => {
  it('accepts a list of claim ids in correctedByClaimIds', () => {
    const misconception = {
      id: 'm1',
      text: 'Seasons are caused by distance from the Sun.',
      correctedByClaimIds: ['c1', 'c2'],
    };

    const parsed = MisconceptionSchema.parse(misconception);

    expect(parsed).toEqual(misconception);
  });

  it('rejects correctedByClaimIds that is not an array', () => {
    const misconception = {
      id: 'm1',
      text: 'Seasons are caused by distance from the Sun.',
      correctedByClaimIds: 'c1',
    };

    expect(MisconceptionSchema.safeParse(misconception).success).toBe(false);
    expect(issuePaths(MisconceptionSchema, misconception)).toContain('correctedByClaimIds');
  });
});

describe('SourceSchema', () => {
  it('parses a source on its own and keeps every field', () => {
    const source = {
      id: 's2',
      url: 'https://example.org/insolation',
      title: 'Insolation and latitude',
      publisher: 'Example Observatory',
      retrievedAt: '2026-11-27T09:58:00.000Z',
      excerpt: 'Same sunlight, same amount; it lands at a steeper angle in July.',
    };

    const parsed = SourceSchema.parse(source);

    expect(parsed).toEqual(source);
  });
});
