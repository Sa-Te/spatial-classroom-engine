import { describe, expect, it } from 'vitest';
import { ManualClock, type Clock } from './clock.js';

describe('ManualClock', () => {
  it('starts at zero and reads the same value twice without advancement', () => {
    const clock = new ManualClock();

    expect(clock.now()).toBe(0);
    expect(clock.now()).toBe(0);
  });

  it('advance(500) returns exactly 500 and leaves now() at exactly 500', () => {
    const clock = new ManualClock();

    expect(clock.advance(500)).toBe(500);
    expect(clock.now()).toBe(500);
  });

  it('accumulates a second 250ms advance to exactly 750', () => {
    const clock = new ManualClock();
    clock.advance(500);
    clock.advance(250);

    expect(clock.now()).toBe(750);
  });

  it('serves consumers typed against the Clock interface', () => {
    const clock: Clock = new ManualClock();

    expect(clock.now()).toBe(0);
  });
});
