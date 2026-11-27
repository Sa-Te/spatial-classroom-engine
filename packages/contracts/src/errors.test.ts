import { describe, expect, it } from 'vitest';
import { ApiErrorSchema } from './errors.js';

// The payload from docs/TECHNICAL_DESIGN.md §14, with a concrete requestId.
const apiErrorExample = {
  error: {
    code: 'EVIDENCE_UNRESOLVED',
    message: 'Two claims could not be verified.',
    requestId: 'req_01j9z4k2m8',
    retryable: false,
  },
};

function issuesOf(payload: unknown) {
  const result = ApiErrorSchema.safeParse(payload);
  return result.success ? [] : result.error.issues;
}

function issuePaths(payload: unknown): string[] {
  return issuesOf(payload).map((issue) => issue.path.join('.'));
}

function unrecognizedKeys(payload: unknown): string[] {
  return issuesOf(payload).flatMap((issue) =>
    issue.code === 'unrecognized_keys' ? issue.keys : [],
  );
}

describe('ApiErrorSchema', () => {
  it('parses the §14 error envelope and returns it unchanged', () => {
    const result = ApiErrorSchema.safeParse(apiErrorExample);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(apiErrorExample);
  });

  it('rejects an envelope whose error object omits requestId', () => {
    const { code, message, retryable } = apiErrorExample.error;
    const payload = { error: { code, message, retryable } };

    expect(ApiErrorSchema.safeParse(payload).success).toBe(false);
    expect(issuePaths(payload)).toContain('error.requestId');
  });

  it('rejects a retryable that is not a boolean', () => {
    const asString = { error: { ...apiErrorExample.error, retryable: 'false' } };
    const asNumber = { error: { ...apiErrorExample.error, retryable: 0 } };

    expect(ApiErrorSchema.safeParse(asString).success).toBe(false);
    expect(issuePaths(asString)).toContain('error.retryable');
    expect(ApiErrorSchema.safeParse(asNumber).success).toBe(false);
    expect(issuePaths(asNumber)).toContain('error.retryable');
  });

  it('rejects an error code that does not match ^[A-Z][A-Z0-9_]*$', () => {
    const lowercase = { error: { ...apiErrorExample.error, code: 'evidence_unresolved' } };
    const hyphenated = { error: { ...apiErrorExample.error, code: 'EVIDENCE-UNRESOLVED' } };

    expect(issuePaths(lowercase)).toContain('error.code');
    expect(issuePaths(hyphenated)).toContain('error.code');
  });

  it('accepts a code containing a digit', () => {
    const payload = { error: { ...apiErrorExample.error, code: 'AUTH2_REQUIRED' } };

    expect(ApiErrorSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects an empty error message', () => {
    const payload = { error: { ...apiErrorExample.error, message: '' } };

    expect(issuePaths(payload)).toContain('error.message');
  });

  it('rejects an unknown key inside the error object', () => {
    const payload = { error: { ...apiErrorExample.error, stack: 'Error: boom' } };

    expect(unrecognizedKeys(payload)).toContain('stack');
  });

  it('rejects an unknown key beside the error object', () => {
    const payload = { ...apiErrorExample, traceId: 'abc' };

    expect(unrecognizedKeys(payload)).toContain('traceId');
  });
});
