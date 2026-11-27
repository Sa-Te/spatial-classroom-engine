# 0010 — 16+ age gate with audience profile as a first-class parameter

- **Status:** Accepted
- **Date:** 2026-11-27
- **Supersedes:** —

## Context

[AGENTS.md](../../AGENTS.md) §1.13 states that the 16+ age gate is deliberate, must not be softened, and must not be undermined by features that assume minors without an explicit decision. [TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §22 records the decision, and §7 makes `AudienceProfile` part of `LessonPlan`.

## Options considered

Not recorded in the source planning documents. The decision chooses a 16+ gate and an explicit audience profile instead of an unconstrained audience model.

## Decision

A 16+ age gate, with `AudienceProfile` carried through planning and content selection.

## Consequences

### Positive

The product has a clear safety boundary, and content can be calibrated to a declared audience rather than guessed.

### Negative

Younger learners are excluded by default, and the product must handle age-related data and consent carefully.

### Revisit if

An explicit product and legal decision changes the age policy, with the associated consent and safeguarding design.
