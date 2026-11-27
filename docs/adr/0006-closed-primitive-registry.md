# 0006 — Closed primitive registry with per-primitive validators

- **Status:** Accepted
- **Date:** 2026-11-27
- **Supersedes:** —

## Context

[TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §9 defines the closed set of camera, teacher, scene, light, board, and learner primitives. Each entry has a parameter schema, a validator, an executor, and a golden test; an unknown primitive is rejected, never approximated. [AGENTS.md](../../AGENTS.md) §1.7.4 closes the camera vocabulary.

## Options considered

- **Free-form model output** — allow the model to emit arbitrary operations. Rejected because it is unsafe and unvalidatable.
- **Closed registry** — the model may compose only allow-listed primitives with schema-validated parameters.

Source: [TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §9; [AGENTS.md](../../AGENTS.md) §1.7.4.

## Decision

A closed primitive registry; adding a primitive requires schema, validator, executor, and a rejection test.

## Consequences

### Positive

Model output cannot become executable code or an unknown operation, and every primitive has a testable contract.

### Negative

The closed set limits expressiveness, and new lesson ideas must wait for a primitive plus its validation work.

### Revisit if

A lesson requirement cannot be expressed with the existing primitives and a new primitive is justified through the documented growth rule.
