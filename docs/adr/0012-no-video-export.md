# 0012 — No video export; notes are the shareable artefact

- **Status:** Accepted
- **Date:** 2026-11-27
- **Supersedes:** —

## Context

[AGENTS.md](../../AGENTS.md) §1.2 invariant 9 forbids hidden recording and requires any recording to be explicit, visible, and revocable. [TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §22 records the decision that there is no video export and that notes are the shareable artefact.

## Options considered

- **Generated video export** — render lessons to video by default or as a hidden capability. Rejected because it creates a recording and distribution surface.
- **Notes as the shareable artefact** — the lesson itself is not exported as video.

Source: [AGENTS.md](../../AGENTS.md) §1.2; [TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §22.

## Decision

No video export; source-cited notes are the shareable output.

## Consequences

### Positive

There is no hidden recording or video distribution path, privacy is simpler, and the notes artefact stays small and auditable.

### Negative

Users cannot share a video of the lesson, which may be less compelling than a recording.

### Revisit if

An explicit, visible, revocable export design is approved with its privacy and storage consequences.
