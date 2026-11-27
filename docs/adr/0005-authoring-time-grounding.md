# 0005 — Authoring-time grounding via immutable evidence packets

- **Status:** Accepted
- **Date:** 2026-11-27
- **Supersedes:** —

## Context

[AGENTS.md](../../AGENTS.md) §1.2 invariants 5 and 6 require research to produce an immutable `EvidencePacket` before composition, require the live tutor to answer from that packet, and make an unresolved citation a hard failure. [TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §6 defines the packet and its rules.

## Options considered

- **Live search during the answer** — retrieve evidence mid-sentence. Rejected because it makes citations unstable and the answer non-reproducible.
- **Immutable packet authored before the lesson** — research once, then compose and answer from that packet.

Source: [AGENTS.md](../../AGENTS.md) §1.2; [TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §6.

## Decision

Research produces an immutable, versioned `EvidencePacket`; composition and live tutoring read only from the packet attached to the lesson.

## Consequences

### Positive

Every displayed claim can resolve to stored evidence, prompt-injection exposure is reduced, and lessons remain reproducible and auditable.

### Negative

The packet can go stale, and the system must display `unresolved` claims honestly rather than silently filling gaps.

### Revisit if

The product requires live research during a lesson and a new evidence model is agreed that preserves citation integrity.
