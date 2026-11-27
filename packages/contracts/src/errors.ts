import { z } from 'zod';

// Codes are stable identifiers (docs/TECHNICAL_DESIGN.md §14), not prose. Only the
// pattern is contracted — there is deliberately no enum, so a new code is not a schema change.
const errorCodeSchema = z.string().regex(/^[A-Z][A-Z0-9_]*$/);

/**
 * The whole error envelope, so a §14 payload parses without unwrapping.
 * Strict on both objects: an unknown key at an API trust boundary is a defect,
 * not something to silently drop.
 */
export const ApiErrorSchema = z
  .object({
    error: z
      .object({
        code: errorCodeSchema,
        message: z.string().min(1),
        requestId: z.string().min(1),
        retryable: z.boolean(),
      })
      .strict(),
  })
  .strict();

export type ApiError = z.infer<typeof ApiErrorSchema>;
