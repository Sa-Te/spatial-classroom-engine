# Spatial Classroom Engine

Open-source, browser-first spatial AI classroom with a complete accessible 2D fallback.

The project is intentionally at the repository-constitution stage. Application code begins in roadmap ticket P0.2; do not expect a runnable web app or API yet.

## Project Documents

- [Roadmap and ticket prompts](ROADMAP_WITH_PROMPTS.md)
- [Developer setup and verification](SETUP_RUN_VERIFY.md)
- [Technical design](TECHNICAL_DESIGN.md)
- [Product requirements and UX](PRODUCT_REQUIREMENTS_UX.md)
- [Contribution guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## CI/CD

The project uses GitHub Actions for continuous integration and deployment:

- **CI Pipeline**: Runs on every push and pull request to main branch
- **Checks**: Format, lint, typecheck, static analysis
- **Tests**: Unit tests, integration tests with PostgreSQL
- **Build**: Builds both web and Go applications
- **Coverage**: Code coverage analysis
- **Security**: Secret scanning and dependency review
- **SBOM**: Software Bill of Materials generation

## Licence

Licensed under [Apache-2.0](LICENSE). The rationale is recorded in [ADR 0001](docs/adr/0001-open-source-licence.md).