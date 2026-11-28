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
  /**
   * True when the cue was placed by the fallback path rather than by a word
   * timing. The resolver builds such an entry through a constructor typed
   * `approximate: true`, so an approximate cue cannot be produced unmarked (T11).
   */
  approximate: boolean;
}

/** The resolved lesson: ordered entries, the whole thing's length, and the approximate cues. */
export interface Timeline {
  readonly entries: readonly TimelineEntry[];
  readonly durationMs: number;
  /**
   * The cue ids whose `atMs` came from the fallback, in sorted-entry order; `[]`
   * when every cue landed on a measured word. A known debt, kept separate from
   * the entries so T13's drift report can report those cues apart from a late
   * exact cue (TECHNICAL_DESIGN §10.2, §10.3).
   */
  readonly approximateCueIds: readonly string[];
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
