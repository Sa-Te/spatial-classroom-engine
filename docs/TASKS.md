# TASKS

Phase: **P1 — contracts and pure core**

Phase definition of done: `docs/ROADMAP.md` P1 — `pnpm verify`, the named tests and test names, the purity check output, and ADRs 0003, 0004, 0006, 0007, 0008 accepted. The frozen decisions that govern every task below are recorded in `docs/ROADMAP.md` P1 "Frozen decisions (human, 2026-11-27)".

## In flight

(nothing)

## Ready

### T6B — Cue.params discriminated union, ADR 0016, and LessonPlan.topic

- **Status:** ready
- **Note:** T5's existing cue-sheet tests will need updating because the contract changes shape. That is expected and is part of this task, not a regression.
- **Files:** `packages/contracts/src/cue-sheet.ts`, `packages/contracts/src/cue-sheet.test.ts`, `packages/contracts/src/lesson.ts`, `packages/contracts/src/lesson.test.ts`, `packages/contracts/src/primitives/index.ts`, `packages/contracts/src/index.ts`, `docs/TECHNICAL_DESIGN.md` §7, §8.2 and §8.3, `docs/adr/0016-*.md`
- **Done when:**
  - `Cue.params` is a discriminated union keyed on the primitive id, with all nine branches, each delegating to the schema already registered in `packages/contracts/src/primitives`.
  - An unknown primitive id is still rejected, and a params shape that does not match its primitive is rejected with the primitive id named in the failure.
  - A cue sheet containing `camera.lockOff` with a `sunSide` parameter is rejected, because frozen decision Q5 derives it from the key light.
  - The worked fragment in `TECHNICAL_DESIGN` §8.3 and the T5 test fixture are corrected in the same change, so the shipped example is a valid cue sheet. They must move together: fixing one without the other turns the documented example into a rejected cue.
  - `LessonPlan` gains `topic: TopicRef`, with a passing test, and `TECHNICAL_DESIGN` §7 updated.
  - ADR 0016 records both changes: why `params` became a union, and why the lesson carries a topic. No invented rationale; anything unsupported goes in an Open questions section.
  - No executor, no range or membership validation: T15 owns those.
- **Out of scope:** executor behaviour; range or membership validation (T15); the window-overlap rule (T12); any change under `apps/`; any P2 work.
- **Proving command:** `pnpm --filter @sce/contracts exec vitest run src/cue-sheet.test.ts src/lesson.test.ts && pnpm typecheck && pnpm format:check`
- **Skill:** api-and-interface-design, then test-driven-development
- **Estimated:** about 200 changed lines

## Deferred housekeeping

- `apps/web` runs `vitest run --passWithNoTests` with zero tests, which `AGENTS.md` §1.10.2 rejects as a test. Target: the P1 closing sweep (the planned sixth pull request), together with the first real web test. Why deferred: removing the flag while the app has no tests turns CI red for no benefit, and adding a web test is outside P1's contract scope.
- T6B follows T7 on purpose. The discriminated union for `Cue.params` needs all nine core parameter schemas to be exhaustive: camera and teacher land in T6, scene, light and learner in T7. T6B then carries ADR 0016, the union, `LessonPlan.topic: TopicRef`, and the cue-sheet test updates. This ordering is deliberate; do not renumber it to look tidy.
- `docs/TECHNICAL_DESIGN.md` §8.3's worked fragment still passes `sunSide` inside `camera.lockOff` params, which Q5 removed. It parses today only because `Cue.params` is an unvalidated record, and the T5 test pastes that fragment verbatim. T6B must fix the fragment and the fixture together, or the union will turn a shipped example into a rejected cue.
- `main` carries one moderate Dependabot advisory, unrelated to P1 code. The fix is Dependabot's own pull request: do not hand-edit a version bump inside a contracts change, and do not touch the lockfile for it.
- No verifier agent. The reviewer's shell fault is intermittent, not deterministic, so a second agent would fail intermittently too and add a moving part without removing the unknown. Revisit only if the fault becomes reproducible.
- T4 and T6 shipped on static reviews with no delta. Both are recorded as unreviewed, not as passes, in their Done entries. A future session can retro-fit both by making one reviewer invocation that actually executes cover `a7be114^1..a7be114` and `b1c01a8^1..b1c01a8` together.

## Done

### P0 — foundation (complete)

- f8ff915 — chore: init repo with readme, gitignore
- 3f5ca95 — Add Apache License 2.0
- e782cdc — chore: add repository skeleton and editor/tooling config
- 448008c — chore: add workspace foundation and shared contracts
- f942ebf — feat(web): add next.js app shell with shared health status
- 7530c6a — feat(server): add fastify health endpoints backed by postgres readiness
- 7ecf75f — chore(env): add root env example and validation script
- 19a684c — ci: add check test and build workflow
- d92faa8 — chore: add pull request template and opencode config

### P1 — contracts and pure core (agreed, 2026-11-27)

- T1 — Contracts toolchain, zod, and the API error shape — `feat(contracts): add the API error schema and package toolchain` (branch `feat/contracts-errors`, merged `3e977bd`). Proving command: `pnpm --filter @sce/contracts exec vitest run src/errors.test.ts && pnpm typecheck && pnpm format:check`. Review: PASS (reviewer), 8 tests.
  - Dismissed finding, recorded so it is not silently dropped: the reviewer raised that `.min(1)` on `message` and `requestId` goes beyond `TECHNICAL_DESIGN` §14. Not taken: §14 requires user-facing, specific messages and a request id, and an empty string is neither.
- T2 — Evidence contracts — `feat(contracts): add evidence contracts` (branch `feat/contracts-evidence`). Proving command: `pnpm --filter @sce/contracts exec vitest run src/evidence.test.ts && pnpm typecheck && pnpm format:check`. Review: PASS (reviewer), 12 tests; the reviewer executed `pnpm test` and `pnpm typecheck` itself and could not run the `--filter` and `format:check` thirds, which its shell allowlist does not cover.
  - Findings raised and acted on, so none is silently dropped: a `Source` was only covered nested in the packet (standalone parse test added); `z.url()` and `z.iso.datetime()` are stricter than §6's bare `url: string` and `retrievedAt: string` (both formats now stated in §6); the `# 3  Build and TypeScript` heading picked up a non-ASCII space (restored byte-exact).
- T3 — Lesson contracts — `feat(contracts): add lesson contracts` (branch `feat/contracts-lesson`). Proving command: `pnpm --filter @sce/contracts exec vitest run src/lesson.test.ts && pnpm typecheck && pnpm format:check`. Review: PASS (reviewer), 11 tests; the reviewer executed all three parts itself and pasted the output. Delta review: PASS — the post-verdict change was hoisting the scene-brief fixture so `sceneBriefExample` is a concrete object rather than `SceneBrief | undefined`; no test name or assertion weakened, array still one scene.
  - `TopicRef` clause resolves to non-duplication, not to an import: `TECHNICAL_DESIGN` §7 gives `LessonPlan` no `topic` field and `noUnusedLocals` rejects an unused import, so `lesson.ts` declares neither `TopicRefSchema` nor `TopicRef`. Adding a `topic` field would change §7's shape and needs a separate decision.
  - Nits raised and consciously not taken: (a) `TECHNICAL_DESIGN` §7 still comments `// 5–7 or 8–12` while the schema is one 5–12 range — equal for integers, and the line is frozen design text; (b) the scene fixture is now shared by reference with `lessonPlanExample.scenes` — every current test spreads a copy, so nothing leaks.
- T4 — Scene spec contracts — `feat(contracts): add scene spec contracts and ADR 0015` (branch `feat/contracts-scene-spec`). Proving command: `pnpm --filter @sce/contracts exec vitest run src/scene-spec.test.ts && pnpm typecheck && pnpm format:check`. **Review: PARTIAL VERIFICATION, not PASS.** The reviewer executed the proving command on the pre-fix tree (15 tests, typecheck, format:check, all green) and raised four findings, which are all closed. It then lost shell on two consecutive fresh invocations and could not run anything on the post-fix tree, so **the delta review was not performed**. Shipped on one execution (the coder's) plus CI, at the human's direction on 2026-11-27; it is recorded as unreviewed because that is what it is. **Retro-review 2026-11-27: PARTIAL VERIFICATION again** — the reviewer's shell was denied for the fourth time, so it read statically without executing. Three findings: one was investigated and **rejected as a false positive** — `z.number()` does *not* admit `+Infinity` under zod 4.6.7 (`node_modules/zod/v4/core/schemas.js:642` requires `Number.isFinite(input)`), so the `.finite()` guard added during PR A and its test were both removed once the reviewer proved it; the lesson is recorded in the PR, not as a code change. Two stood: ADR 0015's Positive said a later geometry change is "not a revision of this record" while its Negative said "P3 must revisit this record" (fixed in PR A); and the design never says what a learner's grab of `sunElevationDeg` does relative to the next `light.keyFromSun` cue (deferred to P3, where the first executor can decide it). **T4 remains unreviewed and the debt is carried forward.** Retro attempt, 2026-11-27 (sixth denial): the reviewer was denied shell on its own invocation, so no delta review was performed and no static read was recorded in its place. The debt stands unchanged. Combined retro attempt covering T4 and T6, 2026-11-27 (ninth denial): denied again on both proving commands; no delta review; both debts stand and no further attempt is made this session.
  - Four findings, all closed: `TECHNICAL_DESIGN` §12.1 still said elevation was a scene parameter, contradicting T4-Q2 (now cue-owned); ADR 0015 claimed an additive geometry change needed no ADR, contradicting `AGENTS.md` §1.15 (now requires its own ADR); the inverted-range test did not prove the refinement returns early (negative assertion added); `OPENCODE_SETUP` §5.3 lost its en spaces when the note was inserted (bytes restored from `origin/main`).
  - Divergence from the dictated text, recorded: JOB 2 asked ADR 0015 to say an additive geometry change "needs no ADR". `AGENTS.md` §1.15 and §23 require one for a public-contract change, so the ADR says an extension needs its own ADR. Flagged to the human in the same turn.
- T5 — Cue sheet contracts and WordTiming — `feat(contracts): add cue sheet contracts and WordTiming` (branch `feat/contracts-cue-sheet`). Proving command: `pnpm --filter @sce/contracts exec vitest run src/cue-sheet.test.ts && pnpm typecheck && pnpm format:check`. **Verdict: PARTIAL VERIFICATION, 23 tests.** The party that executed the proving command was the **coder** (four commands, `pnpm verify` exit 0); the reviewer executed it once (`23 passed`) on the full review and was then denied shell on three consecutive delta attempts. Its four findings: two taken (the design never stated `WordTiming`, now in §8.2; `at: {}` was untested, now covered), two rejected as unexecuted inferences that an executed run contradicts (a claimed `format:check` failure and a claimed typecheck error, both green when actually run). Delta review: **PARTIAL** — it proved the §8.2 hunk is 6 insertions and 0 deletions, but could not prove "no late edits" without a diff; the delta is one doc block and one test, both read by the architect.
  - `Cue.params` remains `z.record(z.string(), z.unknown())` — the design's own escape hatch (§8.2:281), the only `z.unknown()` in the file, and it ducks no required field. ADR 0016 replaces it at T6.
  - `primitive` is `z.string().min(1)` with a comment: `PrimitiveId` is named in §8.2 and defined nowhere; Q1 narrows it at T6.
- T6 — PrimitiveId and camera/teacher primitive schemas — `feat(contracts): add PrimitiveId and camera/teacher primitive schemas` (branch `feat/contracts-primitives-core`). Proving command: `pnpm --filter @sce/contracts exec vitest run src/primitives/primitives.test.ts && pnpm typecheck && pnpm format:check`. **Verdict: PARTIAL VERIFICATION, 16 tests.** The party that executed was the **coder** — vitest, `typecheck`, `format:check` and `pnpm verify` exit 0. The reviewer was denied shell on its only invocation (seventh denial), so its review was static; per the rule, **no delta review was performed** and CI is the second execution. The combined retro attempt on T4 and T6 (2026-11-27, ninth denial) was denied as well, so the delta review is still outstanding.
  - Two findings taken: clause 1 was not actually tested for "exactly nine" — an invented tenth id passed every test, now pinned with `PrimitiveIdSchema.options` length 9; and only one of Q4's five framings was positively parsed, so a typo in another could hide, now all five looped.
  - Two findings dismissed with reasons: the `parse`/`toEqual` positive cases stay because they catch an unintended `.transform()` that no negative case can; `CameraLockOffSchema` and `CameraCutSchema` being byte-identical is Q7's deliberate split, and their comments say so.
  - §9 gained the P1 scope sentence and three rows the frozen decisions had already made false: `lockOff` without `sunSide` (Q5), `cut` without `to` (Q7), `keyFromSun` 1–90 (Q11).
- T7 — Scene, light and learner schemas, and the primitive registry — `feat(contracts): add scene, light and learner schemas and the primitive registry` (branch `feat/contracts-primitive-registry`). Proving command: `pnpm --filter @sce/contracts exec vitest run src/primitives/registry.test.ts && pnpm typecheck && pnpm format:check`. **Verdict: PARTIAL VERIFICATION from the reviewer (tenth denial), PASS from the judge on all ten claims.** The party that executed was the **coder** (34 tests, typecheck, format:check, `pnpm test`); the reviewer was denied shell, so it read statically. The judge adjudicated the final tree from the diff and returned PASS on C1–C10 with three low observations, all dismissed: the first was refuted (the prototype test does catch a bracket-lookup refactor, because `primitiveRegistry['constructor']` would return `Object.prototype.constructor`), the second was premature optimisation on a nine-entry table, the third a `.finite()` self-documentation preference already settled by evidence.
  - Delta: the two post-verdict tests (prototype-key miss; an out-of-range `setParam` value accepted) were adjudicated by the judge on the final tree, not by the reviewer. No reviewer delta review was performed.
  - §9 records the T15 and T12 obligations: range checks against a declared `Manipulable`, `enableGrab` membership, and the window-overlap rule are all scene-aware work and belong elsewhere.
