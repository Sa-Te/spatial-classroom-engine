import { describe, expect, it } from 'vitest';
import {
  placeByFallback,
  wordCountOf,
  type FallbackPlacement,
  type UtteranceMeasurement,
} from './fallback.js';

function measured(overrides: Partial<UtteranceMeasurement> = {}): UtteranceMeasurement {
  return { startMs: 0, durationMs: 0, wordTimings: null, ...overrides };
}

function placementAt(placement: FallbackPlacement): number {
  if (!placement.ok) throw new Error(`expected a placement, got ${placement.refusal}`);
  return placement.atMs;
}

function refusalOf(placement: FallbackPlacement): string {
  if (placement.ok) throw new Error(`expected a refusal, got a placement at ${placement.atMs}`);
  return placement.refusal;
}

describe('placeByFallback', () => {
  it('spreads a word evenly across the measured duration, offset by the utterance start', () => {
    // 'the sun burns' is three words: 500 + round(0/3 * 1000) = 500,
    // 500 + round(1/3 * 1000) = 500 + 333 = 833, 500 + round(2/3 * 1000) = 1167.
    const measurement = measured({ startMs: 500, durationMs: 1_000 });

    expect(placementAt(placeByFallback(measurement, 0, 'the sun burns'))).toBe(500);
    expect(placementAt(placeByFallback(measurement, 1, 'the sun burns'))).toBe(833);
    expect(placementAt(placeByFallback(measurement, 2, 'the sun burns'))).toBe(1_167);
  });

  it('refuses an unmeasured utterance instead of placing the word at its start', () => {
    // durationMs 0 means nothing was measured, so there is no spread to compute.
    const placement = placeByFallback(measured({ startMs: 500 }), 0, 'the sun');

    expect(refusalOf(placement)).toBe('NO_DURATION_MS');
  });

  it('refuses rather than dividing by zero when the script text has no words', () => {
    // An empty text is the absent-text case: wordCount 0, and 0/0 is NaN.
    expect(refusalOf(placeByFallback(measured({ durationMs: 1_000 }), 0, ''))).toBe('NO_WORDS');
    expect(refusalOf(placeByFallback(measured({ durationMs: 1_000 }), 0, '   '))).toBe('NO_WORDS');
  });

  it('refuses a word index outside the script text, at both ends', () => {
    const measurement = measured({ durationMs: 1_000 });

    expect(refusalOf(placeByFallback(measurement, -1, 'the sun burns'))).toBe(
      'WORD_INDEX_OUT_OF_RANGE',
    );
    expect(refusalOf(placeByFallback(measurement, 3, 'the sun burns'))).toBe(
      'WORD_INDEX_OUT_OF_RANGE',
    );
  });
});

describe('wordCountOf', () => {
  it('counts words by whitespace and ignores padding, repeated spaces and newlines', () => {
    expect(wordCountOf('the sun burns')).toBe(3);
    expect(wordCountOf('  the   sun\nburns \t')).toBe(3);
    expect(wordCountOf('')).toBe(0);
    expect(wordCountOf(' \n\t ')).toBe(0);
  });
});
