# 0009 — TypeScript application, Python evaluation harness

- **Status:** Accepted
- **Date:** 2026-11-27
- **Supersedes:** —

## Context

`docs/TECHNICAL_DESIGN.md` §22 lists this decision as “TypeScript application, Python evaluation harness”. The application is TypeScript: the workspace packages and both apps are TypeScript, and `pnpm check`, `pnpm test`, and `pnpm build` are the accepted gates. The source documents do not describe an implemented Python evaluation harness, nor where it lives or how it runs.

## Options considered

Not recorded in the source documents.

## Decision

The application is TypeScript. Evaluation tooling is Python. The evaluation harness is not yet implemented.

## Consequences

### Positive

[OPEN] No positive consequence is stated in the source documents.

### Negative

[OPEN] No negative consequence is stated in the source documents.

### Revisit if

[OPEN] No revisit trigger is stated in the source documents.

## Open questions

- [OPEN] Why is the evaluation harness Python rather than TypeScript? The sources state the choice but not the rationale.
- [OPEN] Where does the harness live, and what is its entry point?
- [OPEN] Which Python version and dependencies are supported?
- [OPEN] How does CI invoke the harness, and what does a failing harness block?
- [OPEN] Which evaluation tiers from `docs/TECHNICAL_DESIGN.md` §16 does it cover first?
