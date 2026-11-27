# 0004 — Lesson is data: versioned cue sheets, not runtime improvisation

- **Status:** Accepted
- **Date:** 2026-11-27
- **Supersedes:** —

## Context

[AGENTS.md](../../AGENTS.md) §1.2 invariant 2 requires a lesson to be a versioned artefact (plan → scenes → cue sheets) that is replayable identically, testable without a browser, and renderable without a network. [TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §8 defines `SceneSpec`, `CueSheet`, and `Cue`.

## Options considered

- **Runtime improvisation** — compose and perform in the same live pass. Rejected because it cannot be replayed or validated before playback.
- **Versioned lesson data** — persist plan, scenes, and cue sheets; the player performs the stored artefact.

Source: [AGENTS.md](../../AGENTS.md) §1.2; [TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §7–8.

## Decision

A lesson is a versioned data artefact, and the renderer performs it deterministically.

## Consequences

### Positive

A lesson can be validated, replayed, cached, tested without a browser, and rendered from storage without a network.

### Negative

Schema versions and migrations become durable obligations, and stored lessons can become stale relative to newer primitives.

### Revisit if

Real-time, per-learner generation becomes a requirement that cannot be represented as a stored cue sheet.
