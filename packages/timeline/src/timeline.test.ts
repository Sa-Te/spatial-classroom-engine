import { describe, expect, it } from 'vitest';
import { sortTimeline, type TimelineEntry } from './timeline.js';

// Compile-time fixture: annotated as TimelineEntry so a renamed, missing or
// mistyped field fails `pnpm typecheck` here, before a resolver in T10 can
// consume the wrong shape.
const lockOffCue: TimelineEntry = {
  cueId: 'c-lock-off',
  atMs: 1_200,
  primitive: 'camera.lockOff',
  track: 'camera',
  durationMs: 0,
  approximate: false,
};

function entry(
  cueId: string,
  atMs: number,
  primitive: TimelineEntry['primitive'],
  track: TimelineEntry['track'],
  approximate = false,
): TimelineEntry {
  return { cueId, atMs, primitive, track, durationMs: 0, approximate };
}

describe('sortTimeline', () => {
  it('orders entries by ascending atMs, whatever their input order', () => {
    const late = entry('c-late', 12_400, 'teacher.point', 'teacher');
    const early = entry('a-early', 400, 'scene.setParam', 'scene');
    const middle = entry('b-middle', 2_400, 'light.keyFromSun', 'light');

    const sorted = sortTimeline([late, early, middle]);

    expect(sorted.map((cue) => cue.cueId)).toEqual(['a-early', 'b-middle', 'c-late']);
    expect(sorted.map((cue) => cue.atMs)).toEqual([400, 2_400, 12_400]);
  });

  it('keeps input order for entries sharing one atMs, because the sort is stable', () => {
    // Deliberately not alphabetical: an accidental cueId tie-break would reorder
    // these three, and the sorter must not invent precedence between tracks.
    const camera = entry('z-camera', 1_000, 'camera.cut', 'camera');
    const teacher = entry('a-teacher', 1_000, 'teacher.lookAt', 'teacher', true);
    const scene = entry('m-scene', 1_000, 'scene.setParam', 'scene');

    const sorted = sortTimeline([camera, teacher, scene]);

    expect(sorted.map((cue) => cue.cueId)).toEqual(['z-camera', 'a-teacher', 'm-scene']);
  });

  it('does not mutate a frozen input array and returns a new array', () => {
    const input = Object.freeze([
      entry('c-first', 3_000, 'teacher.point', 'teacher'),
      entry('a-second', 1_000, 'camera.lockOff', 'camera'),
      entry('b-third', 2_000, 'learner.holdSilence', 'learner'),
    ]);

    // A sorter that called .sort() on the argument would throw here, because
    // sorting a frozen array assigns to its indices.
    const sorted = sortTimeline(input);

    expect(input.map((cue) => cue.cueId)).toEqual(['c-first', 'a-second', 'b-third']);
    expect(sorted).not.toBe(input);
    expect(sorted.map((cue) => cue.cueId)).toEqual(['a-second', 'b-third', 'c-first']);
  });

  it('returns an empty array for an empty timeline', () => {
    expect(sortTimeline([])).toEqual([]);
  });

  it('returns a single-entry timeline holding that exact entry', () => {
    expect(sortTimeline([lockOffCue])).toEqual([lockOffCue]);
  });
});
