# 0011 — Moderation ladder: autonomous warn/mute, human-only removal

- **Status:** Accepted
- **Date:** 2026-11-27
- **Supersedes:** —

## Context

[AGENTS.md](../../AGENTS.md) §1.2 invariant 11 allows autonomous moderation to pause, mute, and warn but never permanently punish; permanent removal is a human action. [TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §20 records the moderation ladder and reversibility controls.

## Options considered

- **Fully autonomous moderation** — allow the system to remove participants permanently. Rejected because a false positive becomes irreversible.
- **Reversible ladder** — autonomous pause, mute, and warn; permanent removal stays with a human.

Source: [AGENTS.md](../../AGENTS.md) §1.2; [TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §20.

## Decision

A reversible moderation ladder with human-only permanent removal.

## Consequences

### Positive

Most incidents are handled immediately, every autonomous action is reversible, and permanent consequences require human judgement.

### Negative

Response to serious incidents depends on a human being available, and the ladder needs sensitivity profiles to avoid disproportionate action.

### Revisit if

Evidence shows the ladder cannot contain a category of harm safely, or the moderation model changes.
