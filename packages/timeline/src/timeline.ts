import type { PrimitiveId } from '@sce/contracts';

/**
 * One resolved cue, positioned on the lesson's single time axis. `atMs` is
 * milliseconds from the lesson start.
 *
 * Adopted by instruction at T9: TECHNICAL_DESIGN §10.1–§10.2 name
 * TimelineEntry without defining it, so this is the shape until the resolver
 * (T10) makes it derived.
 */
export interface TimelineEntry {
  cueId: string;
  atMs: number;
  primitive: PrimitiveId;
  /** The track the cue acts on; tie-break precedence between tracks is T12's. */
  track: 'camera' | 'teacher' | 'scene' | 'light' | 'learner';
  /** True when the cue was placed by the fallback path, not by a word timing. */
  approximate: boolean;
}

/** The ordered entries for a lesson. At T9 the timeline is exactly this array. */
export type Timeline = readonly TimelineEntry[];

/**
 * Returns a new array of the same entries ordered by ascending `atMs`. Sorting
 * a copy keeps the input untouched, and the native sort is stable, so entries
 * sharing an instant keep their input order. No track tie-break is applied:
 * T12's ordering rules reject illegal sequences instead of inventing precedence.
 */
export function sortTimeline(entries: Timeline): Timeline {
  return [...entries].sort((a, b) => a.atMs - b.atMs);
}
