# 0014 — PostgreSQL as the single durable store; pgvector in V2

- **Status:** Accepted
- **Date:** 2026-11-27
- **Supersedes:** —

## Context

[TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) §13 defines PostgreSQL tables for sessions, topics, evidence packets, lessons, scenes, utterances, notes, teachers, venues, moderation events, cost entries, eval runs, and consents, and §13.1 records pgvector as a V2 addition. The repository already uses PostgreSQL in `docker-compose.yml` and Drizzle in `apps/server`.

## Options considered

Not recorded in the source planning documents. The decision selects one relational durable store instead of separate stores per concern.

## Decision

PostgreSQL is the single durable store, with pgvector added in V2 when retrieval needs it.

## Consequences

### Positive

Transactions cover the pipeline's related records, one migration chain and one backup story remain, and pgvector provides a V2 retrieval path without a second database.

### Negative

A single relational store concentrates scaling pressure, and vector indexing remains an extension dependency rather than a native first-class feature.

### Revisit if

Measured scale, availability, or retrieval requirements exceed PostgreSQL plus pgvector, or a second store is justified by an ADR.
