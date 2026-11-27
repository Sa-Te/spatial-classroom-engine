# 0007 — Coordinate and unit convention

- **Status:** Accepted
- **Date:** 2026-11-27
- **Supersedes:** —

## Context

[TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §22 records the convention as metres, right-handed, +Y up, −Z forward, and quaternion `[x,y,z,w]`. [AGENTS.md](../../AGENTS.md) §1.5 uses metres, right-handed, +Y up as its example of a useful comment.

## Options considered

Not recorded in the source planning documents. The decision fixes one convention instead of letting each module or asset choose its own.

## Decision

Metres, right-handed, +Y up, −Z forward, quaternion `[x,y,z,w]`.

## Consequences

### Positive

Scene, asset, camera, and physics code can share transforms without per-boundary guesses, and units in names (`positionM`, `durationMs`) reinforce the convention.

### Negative

Every imported asset and external tool must be converted at its boundary, and a missed conversion produces a subtle spatial bug.

### Revisit if

The renderer, asset pipeline, or a required external format cannot operate in this convention without an unacceptable conversion layer.
