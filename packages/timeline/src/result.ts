import type { Timeline } from './timeline.js';

/**
 * Every way the resolver can refuse an authored cue sheet. The names live in
 * packages/timeline rather than packages/contracts because they describe this
 * resolver's behaviour, not a stored shape (T10).
 *
 * `TIMINGS_MISSING` is deliberately temporary: T11 replaces that rejection with
 * approximate resolution, so a later test that expects a timeline instead is not
 * a regression (TECHNICAL_DESIGN §10.3).
 */
export type ProblemCode =
  'WORD_INDEX_OUT_OF_RANGE' | 'TIMINGS_MISSING' | 'TIMINGS_OUT_OF_ORDER' | 'TIMINGS_OVERLAP';

/** One refused cue, named. Authoring data is untrusted, so a problem is data, not a throw. */
export interface ResolutionProblem {
  cueId: string;
  code: ProblemCode;
  detail: string;
}

/**
 * The resolver's single return shape: a timeline, or every problem found. Never
 * a throw and never undefined — "something went wrong" is not a state a caller
 * can act on.
 */
export type ResolveResult =
  { ok: true; timeline: Timeline } | { ok: false; problems: ReadonlyArray<ResolutionProblem> };
