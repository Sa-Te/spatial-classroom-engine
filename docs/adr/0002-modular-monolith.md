# 0002 — Modular monolith over microservices

- **Status:** Accepted
- **Date:** 2026-11-27
- **Supersedes:** —

## Context

[TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §3.1 records the operating constraints: solo developer, one migration chain, one log stream, one deploy target, and a £0 budget. The design keeps extraction possible through clean module interfaces rather than separate processes.

## Options considered

- **Microservices** — independent deployables and scaling, at the cost of several migration chains, log streams, and deploy targets.
- **Modular monolith** — one deployable with module boundaries and typed interfaces.

Source: [TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §3.1–3.2.

## Decision

A modular monolith: one Fastify server with modules that own their data access, plus pure packages for hard logic.

## Consequences

### Positive

One deploy, one database migration chain, one log stream, and one place to run the pipeline; extraction remains possible because module interfaces are explicit.

### Negative

A single process is a single blast radius, and the module boundaries survive only if reviewers enforce them.

### Revisit if

Measured load, team size, or independent deployment needs exceed what one process and one deploy target can carry.
