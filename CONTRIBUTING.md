# Contributing

Thank you for contributing to Spatial Classroom Engine. All contributions must follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before You Start

1. Read the active ticket in [ROADMAP_WITH_PROMPTS.md](ROADMAP_WITH_PROMPTS.md) and the relevant controlling documents.
2. Work on one ticket only. Do not begin a later phase or bundle unrelated cleanup.
3. Preserve `MOCK_MODE=true` and the semantic 2D fallback.
4. Do not include secrets, user material, transcripts, credentials, or unlicensed assets.

## Pull Requests

- Keep the change below approximately 400 hand-written lines; propose a ticket split when that is not practical.
- Add meaningful regression coverage for behaviour changes. Do not remove or weaken a valid test to pass CI.
- Update affected contracts, ADRs, setup instructions, technical design, and roadmap status in the same pull request.
- Run the applicable documented checks and include the command results in the pull request.
- Use a focused, imperative title such as `docs: add repository contribution policy`.

## Development

The project currently has no application code. Follow [SETUP_RUN_VERIFY.md](SETUP_RUN_VERIFY.md) as the Phase 0 toolchain and commands are introduced.

## Reporting Problems

Use the bug report template for reproducible defects and the feature request template for product proposals. Report security vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
