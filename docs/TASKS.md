# TASKS

Phase: **P1 — contracts and pure core**

Phase definition of done: `docs/ROADMAP.md` P1 — `pnpm verify`, the named tests and test names, the purity check output, and ADRs 0003, 0004, 0006, 0007, 0008 accepted. The frozen decisions that govern every task below are recorded in `docs/ROADMAP.md` P1 "Frozen decisions (human, 2026-11-27)".

## In flight

(nothing)

## Ready

### T1 — Contracts toolchain, zod, and the API error shape

- **Status:** ready
- **Files:** `packages/contracts/package.json`, `packages/contracts/tsconfig.json`, `packages/contracts/vitest.config.ts` (environment `node`), `packages/contracts/src/errors.ts`, `packages/contracts/src/errors.test.ts`, `packages/contracts/src/index.ts`, `pnpm-lock.yaml`
- **Contract:** `ApiErrorSchema` in `packages/contracts/src/errors.ts` (new — this task creates it). The payload shape is fixed by `docs/TECHNICAL_DESIGN.md` §14 and is not negotiable.
- **Done when:** `ApiErrorSchema` parses the TECHNICAL_DESIGN §14 example exactly; it rejects a payload missing `requestId`, a non-boolean `retryable`, and a code not matching `^[A-Z][A-Z0-9_]*$`; the package has `test` and `typecheck` scripts so a root `pnpm -r test` can no longer pass silently.
- **Out of scope:** every other contract schema (evidence, lesson, scene spec, cue sheet, primitives); any runtime import from `apps/*`; any change under `apps/`; any P2 or later work.
- **Proving command:** `pnpm --filter @sce/contracts exec vitest run src/errors.test.ts && pnpm typecheck && pnpm format:check`
- **Skill:** test-driven-development
- **Estimated:** about 130 changed lines

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

### P1 — contracts and pure core (agreed, not started)

(nothing)
