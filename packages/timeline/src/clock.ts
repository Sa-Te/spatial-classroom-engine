/**
 * Time source handed to the player and to anything that needs to know how much
 * time has passed. Production injects the real monotonic source; tests inject
 * ManualClock. Code that reads the wall clock directly is a defect
 * (AGENTS.md §1 invariant 4: the player is clock-injected).
 */
export interface Clock {
  /** Current time in milliseconds. Monotonic within one clock's lifetime. */
  now(): number;
}

/**
 * Deterministic clock for tests and for replay: time only moves when advance()
 * is called, so a resolved timeline can be asserted to the millisecond.
 */
export class ManualClock implements Clock {
  private currentMs = 0;

  now(): number {
    return this.currentMs;
  }

  /** Advances by deltaMs and returns the new time in milliseconds. */
  advance(deltaMs: number): number {
    this.currentMs += deltaMs;
    return this.currentMs;
  }
}
