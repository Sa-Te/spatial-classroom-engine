# ADR 0001: Use Apache License 2.0

- Status: Accepted
- Date: 2026-09-23
- Owner: Spatial Classroom Engine maintainers

## Context

The project needs a standard open-source licence before accepting contributions or publishing reusable code, assets, and documentation.

## Drivers

- Clear permissions for users and contributors.
- Explicit patent grant and retaliation terms.
- Compatibility with a broad open-source ecosystem.

## Options

1. Apache License 2.0.
2. MIT License.
3. Delay a licence decision.

## Decision

Use Apache License 2.0, stored in the repository root as `LICENSE`.

## Positive Consequences

Apache-2.0 provides an explicit patent licence and requires preservation of licence and attribution notices. Third-party code and assets must still be reviewed for compatible licences and recorded with their own attribution when required.

## Negative Consequences

Apache-2.0 is longer and has more obligations than MIT. Contributors must retain its notices and cannot assume it makes third-party assets redistributable.

## Security, Privacy, and Accessibility Impact

No direct runtime impact. The licence improves contributor clarity but does not reduce the need to protect user data, secrets, or accessibility requirements.

## Rollback or Extraction Trigger

Changing the project licence requires maintainer and legal review, a superseding ADR, and an explicit compatibility assessment for prior contributions.
