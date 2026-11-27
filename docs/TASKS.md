# TASKS

Phase: **P1 — contracts and pure core**

Phase definition of done: `docs/ROADMAP.md` P1 — `pnpm verify`, the named tests and test names, the purity check output, and ADRs 0003, 0004, 0006, 0007, 0008 accepted. The frozen decisions that govern every task below are recorded in `docs/ROADMAP.md` P1 "Frozen decisions (human, 2026-11-27)".

## In flight

(nothing)

## Ready

(nothing — the next task is proposed by the architect and requires human sign-off before it is written here)

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
