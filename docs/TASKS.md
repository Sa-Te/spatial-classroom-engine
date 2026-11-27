# TASKS

Phase: **P1 — contracts and pure core**

Phase definition of done: `docs/ROADMAP.md` P1 — `pnpm verify`, the named tests and test names, the purity check output, and ADRs 0003, 0004, 0006, 0007, 0008 accepted. The frozen decisions that govern every task below are recorded in `docs/ROADMAP.md` P1 "Frozen decisions (human, 2026-11-27)".

## In flight

(nothing)

## Ready

(nothing — the next task is proposed by the architect and requires human sign-off before it is written here)

## Deferred housekeeping

- `apps/web` runs `vitest run --passWithNoTests` with zero tests, which `AGENTS.md` §1.10.2 rejects as a test. Target: the P1 closing sweep (the planned sixth pull request), together with the first real web test. Why deferred: removing the flag while the app has no tests turns CI red for no benefit, and adding a web test is outside P1's contract scope.

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
