import type { PrimitiveId } from '@sce/contracts';

/**
 * One resolved cue, positioned on the lesson's single time axis. `atMs` is
 * milliseconds from the lesson start.
 *
 * Adopted by instruction at T9 and given `durationMs` at T10, where the resolver
 * makes both derived.
 */
export interface TimelineEntry {
  cueId: string;
  atMs: number;
  primitive: PrimitiveId;
  /** The track the cue acts on; tie-break precedence between tracks is T12's. */
  track: 'camera' | 'teacher' | 'scene' | 'light' | 'learner';
  /**
   * How long the cue runs, in milliseconds. Taken from the primitive's own
   * parameter (`scene.animateParam` → `durationMs`, `learner.holdSilence` → `ms`)
   * and 0 for an instantaneous cue.
   */
  durationMs: number;
  /** True when the cue was placed by the fallback path, not by a word timing. */
  approximate: boolean;
}

/** The resolved lesson: ordered entries and the whole thing's length (TECHNICAL_DESIGN §10.1). */
export interface Timeline {
  readonly entries: readonly TimelineEntry[];
  readonly durationMs: number;
}

/**
 * Returns a new array of the same entries ordered by ascending `atMs`. Sorting
 * a copy keeps the input untouched, and the native sort is stable, so entries
 * sharing an instant keep their input order. No track tie-break is applied:
 * T12's ordering rules reject illegal sequences instead of inventing precedence.
 */
export function sortTimeline(entries: readonly TimelineEntry[]): readonly TimelineEntry[] {
  return [...entries].sort((a, b) => a.atMs - b.atMs);
}
