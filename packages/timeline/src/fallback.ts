import type { WordTiming } from '@sce/contracts';

/**
 * One utterance's measured speech (TECHNICAL_DESIGN §10.2). `wordTimings` is
 * utterance-relative — `WordTiming.startMs` counts from this utterance's own
 * start (§8.2) — so every placement adds `startMs` before the number is used.
 * `null` and an empty array both mean "not measured word by word", and
 * `durationMs` is the measured length, `0` when nothing was measured.
 */
export interface UtteranceMeasurement {
  readonly startMs: number;
  readonly durationMs: number;
  readonly wordTimings: WordTiming[] | null;
}

/** Why the fallback could not place a cue. The resolver maps this to a ProblemCode. */
export type FallbackRefusal = 'NO_DURATION_MS' | 'NO_WORDS' | 'WORD_INDEX_OUT_OF_RANGE';

export type FallbackPlacement =
  | { readonly ok: true; readonly atMs: number }
  | { readonly ok: false; readonly refusal: FallbackRefusal };

/**
 * The number of words in an utterance's script text: the only word count there
 * is when the word timings are absent.
 */
export function wordCountOf(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * Places a word of an utterance that has no word timings (TECHNICAL_DESIGN
 * §10.3, adopted by instruction — the design states no formula):
 *
 *   atMs = startMs + round((wordIndex / wordCount) * durationMs)
 *
 * The words are spread evenly across the measured duration, because that is the
 * only measurement there is. This is a guess about speech, so the entry it feeds
 * is typed `approximate: true`. There is no "place it at zero" branch: a cue the
 * data cannot place is refused, since a silent zero is a plausible-looking lie.
 */
export function placeByFallback(
  measurement: UtteranceMeasurement,
  wordIndex: number,
  text: string,
): FallbackPlacement {
  // Both refusals are checked before the index: an empty text has no word count
  // to range-check against, and 0/0 is NaN rather than a time.
  if (measurement.durationMs <= 0) return { ok: false, refusal: 'NO_DURATION_MS' };
  const wordCount = wordCountOf(text);
  if (wordCount === 0) return { ok: false, refusal: 'NO_WORDS' };
  if (wordIndex < 0 || wordIndex >= wordCount) {
    return { ok: false, refusal: 'WORD_INDEX_OUT_OF_RANGE' };
  }
  return {
    ok: true,
    atMs: measurement.startMs + Math.round((wordIndex / wordCount) * measurement.durationMs),
  };
}
