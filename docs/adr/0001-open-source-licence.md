# 0001 — Open-source licence (Apache-2.0)

- **Status:** Accepted
- **Date:** 2026-11-27
- **Supersedes:** —

## Context

The repository is publicly released as open source and ships the Apache License 2.0 in `LICENSE`. [SETUP_AND_VERIFY.md](../SETUP_AND_VERIFY.md) §5.2 compares MIT, Apache-2.0, and AGPL-3.0 and recommends Apache-2.0 because it is friendly to contributors and companies and adds an explicit patent grant that matters for an AI project.

## Options considered

- **MIT** — maximum adoption; a fork may be closed-source.
- **Apache-2.0** — adoption plus an explicit patent grant; slightly more ceremony.
- **AGPL-3.0** — hosted forks must stay open; many companies refuse to touch it.

Source: [SETUP_AND_VERIFY.md](../SETUP_AND_VERIFY.md) §5.2.

## Decision

Apache-2.0, as already committed in `LICENSE`.

## Consequences

### Positive

Contributors and companies get a clear patent grant, and the licence is compatible with the project's open-source posture.

### Negative

Apache-2.0 carries notice, attribution, and patent-termination obligations that MIT does not, and it is more ceremony for a solo project.

### Revisit if

The product's licensing or commercial model changes, or a dependency licence makes Apache-2.0 incompatible.
