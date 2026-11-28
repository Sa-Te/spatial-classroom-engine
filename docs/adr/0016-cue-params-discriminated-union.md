# 0016 — Cue params are a discriminated union keyed on the primitive id

- **Status:** Accepted
- **Date:** 2026-11-28
- **Supersedes:** —

## Context

[TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §8.2 declared `Cue.params` as `Record<string, unknown>`, validated against the primitive's schema only when a scene tried to execute it. The primitive registry now holds a schema for every one of the nine core ids ([0006](0006-closed-primitive-registry.md)), so the same parameters can be validated at the trust boundary instead of later.

A free-form record also fails silently in the wrong direction. An unknown parameter is ignored rather than reported, so an author mistake — `sunSide` on `camera.lockOff`, for example — survives parsing and only becomes visible when the executor does not honour it.

## Options considered

- **Keep the free-form record** — parse parameters later, in the executor. Rejected as the status quo: the registry already knows the shapes, and deferring validation moves the failure away from the boundary that can name the cue and the primitive.
- **Hand-write nine branch schemas in `cue-sheet.ts`** — one object per primitive. Rejected: it duplicates every parameter schema and creates a second source of truth that drifts the first time a primitive changes.
- **Derive the union from the registry** — one branch per registry entry, with `params` taken from that entry's schema.

## Decision

`Cue` is a discriminated union keyed on `primitive`. Each branch is built from the closed id set and the matching `primitiveRegistry` entry: the branch's `params` field is that entry's schema. No parameter schema is re-declared in `cue-sheet.ts`, and the branch list is generated rather than written out, so a registry entry cannot exist without a branch.

`LessonPlan` also gains `topic: TopicRef`, imported from the module that already defines it. A lesson now states which topic it covers instead of being reachable only by following `evidencePacketId` back to its packet.

## Consequences

### Positive

An unknown primitive id and a parameter shape that does not match its primitive both fail at parse, and the failure names the primitive. Parameters are validated at the same boundary as every other untrusted shape, before the cue sheet can be stored or played.

### Negative

The union must stay derived from the registry. Writing it out by hand would recreate the duplication this record exists to prevent, and the two copies would drift. Adding a primitive is now a two-file change — its id in the closed set and its entry in the registry — plus an ADR under [AGENTS.md](../../AGENTS.md) §1.15.

### Open questions

- No range or membership validation is added here. A value is in range only against a declared `Manipulable`, and a parameter is a member only of the object it names, so both checks are scene-aware and belong to the T15 validator. The second `setParam` window-overlap rule stays with T12.
- Whether `track` must agree with the primitive's registry track is not decided here. The union keys on `primitive` only.

### Revisit if

A primitive's parameters depend on the scene or on another cue at parse time, which a static per-primitive schema cannot express.
