# 0003 — The timeline resolver is a pure function with an injected clock

- **Status:** Accepted
- **Date:** 2026-11-27
- **Supersedes:** —

## Context

[AGENTS.md](../../AGENTS.md) §1.2 invariants 3 and 4 require `resolve(input: ResolveInput)` to perform no I/O, read no clock, and use no randomness, and require the player to receive its clock. [TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §10 defines the signature, algorithm, drift budget, and ordering rules.

## Options considered

- **Generate timing at runtime** — let the model or player choose millisecond positions. Rejected because it is non-deterministic and cannot be asserted to the millisecond.
- **Pure resolver plus injected clock** — the model emits intent in a fixed vocabulary; a pure function resolves it against word timings.

Source: [AGENTS.md](../../AGENTS.md) §1.2, §1.7.1; [TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §10.

## Decision

Timing is resolved by a pure function, and production and tests receive different clocks (`performance.now()` and `ManualClock`).

## Consequences

### Positive

Lessons replay identically, drift is measurable against a fixed budget, and the resolver is testable under plain Node with no DOM or network.

### Negative

The system depends on word timings that may be absent, so the fallback path must be explicit and marked approximate; clock injection must be enforced everywhere in the engine.

### Revisit if

The timing source changes in a way the resolver contract cannot express, or the measured drift budget cannot be met without a different architecture.
