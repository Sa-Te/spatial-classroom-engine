# 0015 — SceneObject and LightSpec carry identity only in P1

- **Status:** Accepted
- **Date:** 2026-11-27
- **Supersedes:** —

## Context

[TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §8.1 declares `SceneObject` and `LightSpec` as type names without defining a single field. §12.1 says the sun's elevation is a scene parameter, while §9 makes it a cue parameter through `light.keyFromSun`. Two authoring sites for one number cannot both be right.

P1 has no renderer. Any geometry field defined now would be invented against an executor that does not exist.

## Options considered

- **Define geometry now** — radius, endpoints, text, image references in the P1 schema. Rejected: those shapes belong to the renderer's needs, so guessing freezes a guess into a versioned contract.
- **Identity only, geometry in P3** — the smallest shape a validator can still check.

## Decision

P1 defines model identity only. `SceneObject` is `id` plus a closed `kind`; `LightSpec` is `id` plus `kind: "sun"`. The cue owns elevation — `light.keyFromSun` is the single authoring site — and `LightSpec` carries identity only.

## Consequences

### Positive

The contract cannot encode a guess. Adding geometry later is additive, but it still changes a public contract, so it needs its own ADR under `AGENTS.md` §1.15 — an extension, not a revision of this record.

### Negative

P3 must revisit this record, and a scene authored before P3 cannot carry geometry.

### Revisit if

The P3 renderer needs a field that cannot be added additively, or a second light becomes legitimate.
