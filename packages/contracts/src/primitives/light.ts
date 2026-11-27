import { z } from 'zod';

// The light track's P1 vocabulary (docs/TECHNICAL_DESIGN.md §9).
//
// The sun is the key light, so its elevation is both the lighting and the lesson's
// subject. 0 puts it on the horizon and 90 straight overhead; Q11 bounds the
// authored window to 1–90 so neither degenerate case is authorable.
export const LightKeyFromSunSchema = z
  .object({ sunElevationDeg: z.number().min(1).max(90) })
  .strict();

export type LightKeyFromSun = z.infer<typeof LightKeyFromSunSchema>;
