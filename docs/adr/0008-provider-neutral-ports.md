# 0008 — Provider-neutral ports with mandatory mocks

- **Status:** Accepted
- **Date:** 2026-11-27
- **Supersedes:** —

## Context

[TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §5 requires domain and application code never to import an SDK. Each port has at least one real adapter and one deterministic mock, and the V2 seams are declared now. [AGENTS.md](../../AGENTS.md) §1.2 invariant 15 requires every deferred capability to have a named port.

## Options considered

- **Direct SDK imports** — call each provider from domain code. Rejected because it couples tests and business logic to a vendor.
- **Provider-neutral port plus a real adapter and a deterministic mock** — the documented shape.

Source: [TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §5; [AGENTS.md](../../AGENTS.md) §1.2.

## Decision

Domain code depends on ports (`LlmProvider`, `TtsProvider`, `SttProvider`, `SearchProvider`, `StorageProvider`), with mocks for tests.

## Consequences

### Positive

Tests run offline and deterministically, providers can be swapped, and cost or privacy controls can be applied at the boundary.

### Negative

Adapters add boilerplate, and a port can hide provider-specific capability behind a lowest-common-denominator interface.

### Revisit if

A required provider capability cannot be expressed through a port without changing the public contract, or a second real adapter reveals the port is wrong.
