# SETUP_RUN_VERIFY.md — Spatial Classroom Engine

> GitHub, OpenCode, local development, testing, assets, and phase verification

## 1. SETUP_RUN_VERIFY.md

> *“**Repository destination:** `/SETUP_RUN_VERIFY.md`
> Commands describe the target developer experience. During P0, implement and verify them rather than pretending they already exist.”*

## 2. Five-minute orientation

You do not need to build everything today. Your first win is: **a GitHub repository, OpenCode connected, a Next.js page, and a healthy Go API in mock mode.**

Target quick start after Phase 0:

``` bash
git clone https://github.com/YOUR_USER/spatial-classroom-engine.git
cd spatial-classroom-engine
cp .env.example .env
make bootstrap
make compose-up
make dev
```

Expected:

- web: http://localhost:3000

- Go API live: http://localhost:8081/api/v1/health/live

- Go API ready: http://localhost:8081/api/v1/health/ready

- health JSON includes a version/status and contains no secrets.

In another terminal:

``` bash
make check
make test
make build
```

## 3. Prerequisites

Pin exact supported versions in repository tooling; use current stable versions when P0 is executed.

- Git and a GitHub account.

- GitHub CLI (gh) recommended.

- Docker Engine/Desktop with Compose v2.

- Current supported Node LTS and Corepack.

- pnpm pinned by packageManager in root package.json.

- Current supported stable Go pinned in .tool-versions or equivalent.

- Make. On Windows, prefer WSL2 Ubuntu for the documented path.

- A modern Chromium browser; Firefox and WebKit/Safari are later test targets.

- Optional Google AI API access for real Gemini mode.

- Optional LiveKit account/server in Phase 4.

Verify:

``` bash
git --version
docker --version
docker compose version
node --version
corepack --version
go version
make --version
gh --version
```

## 4. Create the GitHub repository

### 4.1 Web method

1.  Sign in to GitHub.

2.  Select **New repository**.

3.  Name: spatial-classroom-engine.

4.  Description: Open-source browser-first spatial AI classroom with accessible 2D fallback.

5.  Choose Public or Private. Public is appropriate only after secret/licence review.

6.  Do not add generated starter code if local initialization follows.

7.  Add an OSI licence after an explicit choice. Apache-2.0 is a good default for explicit patent terms; MIT is simpler.

### 4.2 CLI method

``` bash
mkdir spatial-classroom-engine
cd spatial-classroom-engine
git init -b main
printf "# Spatial Classroom Engine\n" > README.md
git add README.md
git commit -m "chore: initialize repository"
gh repo create spatial-classroom-engine --source=. --remote=origin --push --public
```

Change --public to --private if desired.

### 4.3 Recommended GitHub settings

After CI exists, protect main:

- require pull request;

- require at least one approval when collaborators exist;

- dismiss stale approvals;

- require conversation resolution;

- require check, test, integration, and build status checks;

- block force pushes and branch deletion;

- do not let ordinary admins bypass accidentally;

- enable secret scanning, push protection, Dependabot alerts, and private vulnerability reporting where available.

Do not store API keys in GitHub variables. Use encrypted Actions secrets or cloud workload identity only when a workflow genuinely needs them.

Apply the documented settings and verify the resulting rule with [docs/branch-protection.md](docs/branch-protection.md) after P0.4 defines the required check names.

## 5. Install and configure OpenCode

Official installation options include:

``` bash
curl -fsSL https://opencode.ai/install | bash
# or
npm install -g opencode-ai
# or on macOS/Linux
brew install anomalyco/tap/opencode
```

Verify:

``` bash
opencode --version
```

Start inside the repository:

``` bash
cd spatial-classroom-engine
opencode
```

Inside OpenCode:

1.  Run /connect.

2.  Select the Google/Vertex/provider route actually available in your installed OpenCode version, or a supported gateway that exposes Gemini.

3.  Enter credentials through OpenCode's credential flow, not a committed file.

4.  Run /models and choose the exact model ID shown.

5.  Run /init only after placing the supplied AGENTS.md; review any proposed edits rather than replacing the constitution blindly.

OpenCode stores provider credentials in its user data directory (official documentation currently shows ~/.local/share/opencode/auth.json on relevant systems). Do not copy that file into the repository.

### 5.1 About Gemini 3.8 Flash

Google's current official model catalogue lists gemini-3.8-flash as a stable coding/agent model and gemini-3.8-live as the default low-latency Live model. Availability may differ by provider, region, account, and OpenCode release.

- For **coding in OpenCode**, select the exact Gemini 3.8 Flash model displayed by /models.

- For **product voice**, do not assume the coding model is the Live model. Use a pinned current Live-capable ID behind configuration.

- Before pinning, check official model docs and run a small tool-call/edit/test task.

- Do not use floating latest aliases for a release build.

 Useful sources:

- https://opencode.ai/docs/

- https://opencode.ai/docs/providers/

- https://opencode.ai/docs/rules/

- https://ai.google.dev/gemini-api/docs/models

- https://ai.google.dev/gemini-api/docs/live

### 5.2 Recommended opencode.json

Use a minimal project config and select the model through OpenCode rather than inventing an ID:

``` json
{
  "$schema": "https://opencode.ai/config.json",
  "share": "disabled",
  "instructions": [
    "ROADMAP_WITH_PROMPTS.md",
    "TECHNICAL_DESIGN.md",
    "PRODUCT_REQUIREMENTS_UX.md"
  ]
}
```

If the context becomes too large, remove broad instruction loading and rely on AGENTS.md to direct task-specific reading. Never put an API key in this file.

### 5.3 Fast and safe OpenCode loop

1.  Create/choose one ticket.

2.  Commit a clean baseline.

3.  Enter Plan mode with **Tab**.

4.  Paste the standard wrapper plus one ticket prompt.

5.  Review files, tests, dependencies, and scope.

6.  Switch to Build mode with **Tab**.

7.  Require OpenCode to run targeted checks.

8.  Run the commands yourself.

9.  Inspect git diff and git status.

10. Use /undo if the change is wrong; do not patch a bad architecture indefinitely.

11. Commit only a passing bounded slice.

``` bash
git status
git diff --check
git diff --stat
git diff
```

## 6. Environment configuration

.env.example contains names and safe defaults, never secrets. Typical target variables:

``` dotenv
APP_ENV=development
MOCK_MODE=true
WEB_ORIGIN=http://localhost:3000
API_BASE_URL=http://localhost:8081
DATABASE_URL=postgres://app_runtime:change-me@localhost:5432/spatial_classroom?sslmode=disable
GEMINI_API_KEY=
GEMINI_TEXT_MODEL=gemini-3.8-flash
GEMINI_LIVE_MODEL=gemini-3.8-live
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
SEARCH_ENABLED=false
SEARXNG_BASE_URL=
API_PORT=8081
```

Actual model defaults must be verified at implementation time. Production refuses example passwords, wildcard origins, missing TLS assumptions, and development keys.

## 7. Root commands

``` bash
make help
make bootstrap
make compose-up
make migrate
make dev
make check
make test
make test-integration
make test-race
make test-fuzz
make test-ai-eval
make coverage
make build
make compose-down
```

Expected policy:

- make check changes no files; it reports formatting problems.

- a separate make format may change files.

- make test never requires paid provider keys.

- integration tests use disposable PostgreSQL or an isolated test database.

- provider sandbox tests are opt-in/nightly with cost caps.

- make reset prints what will be destroyed and requires confirmation.

## 8. Phase-by-phase run and verification

### 8.1 Phase 0

``` bash
make bootstrap
make compose-up
make migrate
make dev
curl -fsS http://localhost:8081/api/v1/health/live
curl -fsS http://localhost:8081/api/v1/health/ready
make check
make test
make test-integration
make build
```

Expected: web health card says ready; stopping PostgreSQL makes readiness unhealthy but liveness remains meaningful; CI passes on the same commands.

### 8.2 Phase 1 — Topic classroom

1.  Open http://localhost:3000.

2.  Select teacher by keyboard.

3.  Choose **Discuss a topic**.

4.  Enter Explain photosynthesis for a 14-year-old.

5.  Start class.

6.  Send a message in mock mode.

7.  Toggle 3D off; chat and board remain available.

8.  Block the GLB request or disable WebGL; verify text mode and actionable copy.

``` bash
make test
make test-e2e
make build
```

Expected: deterministic mock reply, no uncaught console errors, retryable provider error, no secret in browser network responses.

### 8.3 Phase 2 — PDF classroom

Get a redistributable text PDF. Prefer a project-created fixture or public-domain document; record source, author, URL, licence, modification, and checksum in assets/licenses/.

Do not download random “free” textbooks. Do not commit personal, confidential, copyrighted, or malicious material.

Verification:

1.  Upload fixtures/sample-text.pdf.

2.  Observe selecting → uploading → processing → ready.

3.  Ask each checked-in evaluation question.

4.  Open the cited page and compare snippet.

5.  Try renamed non-PDF, malformed, oversized, and scanned fixtures.

6.  Open another session and prove it cannot retrieve the first session's chunks.

7.  Delete material and prove source and derivatives disappear per retention policy.

``` bash
make test-integration
make test-ai-eval
make test-e2e
make coverage
```

Expected: zero invented citation IDs; at least 8/10 accepted pages; scanned PDF gives clear OCR-not-supported message.

### 8.4 Phase 3 — Multiplayer

1.  Open normal and incognito windows.

2.  Join same room using two distinct display names.

3.  Verify join/leave, chat, shared page, and marker position.

4.  Disconnect one network, change page, reconnect, and verify snapshot convergence.

5.  Attempt host action as student; it must be rejected.

6.  Send malformed/out-of-range pose in a developer test; server rejects it.

``` bash
make test-integration
make test-e2e
make test-race
# phase-specific load command documented when implemented
```

Expected: no state rewind from stale events; no unbounded memory growth from slow client; room recovers within documented target.

### 8.5 Phase 4 — LiveKit voice

Use headphones for spatial tests. Start at low volume.

Local LiveKit may be provided through an optional Compose profile; managed LiveKit is acceptable for real-network verification. Never commit API secret.

1.  Explicitly click microphone enable.

2.  Join from two browsers.

3.  Verify mute stops publication and UI reflects it.

4.  Deny microphone in one browser; text remains functional.

5.  Change input device and reconnect.

6.  Move one participant left/right; verify panning with spatial mode on.

7.  Turn spatial mode off; audio returns to centered/intelligible.

8.  Test AI interruption and cost/time limit.

Expected: room-scoped short-lived token; no default recording; transcript/text visible; voice outage does not end class.

### 8.6 Phase 5 — Search

``` bash
make test-ai-eval
```

Verify:

- freshness fixture triggers search;

- PDF-only question does not;

- search status is visible;

- citations are distinct;

- malicious result cannot alter instructions or issue classroom actions;

- search failure is transparent.

SearXNG is optional and disabled by default. Upstream engines may block or CAPTCHA self-hosted traffic; that is an operational risk, not an application success state.

### 8.7 Phase 6/7 — Pilot and cloud

Required evidence:

- dependency/secret/container scans;

- authorization and tenant isolation suite;

- WCAG automated plus manual screen-reader script;

- AI safety evaluation;

- 2× pilot load test;

- backup and clean restore;

- deploy, smoke, rollback;

- AI kill switch;

- cost budget alarms;

- logs contain correlation IDs but no student content/secrets.

## 9. 3D assets

Safe sources may include Kenney, Poly Haven, Blender Studio/open projects, Khronos sample assets, or self-created Blender assets—but check each item's actual licence.

For every asset store:

``` text
assets/licenses/<asset>.md
- Original title and creator
- Source URL
- Licence and licence URL
- Download date
- Original filename and SHA-256
- Modifications and tool versions
- Redistribution allowed: yes/no and rationale
- Attribution text
```

Optimisation checklist:

- remove hidden geometry and unused materials;

- merge where sensible;

- use glTF/GLB with mesh compression only when decoder cost is justified;

- reduce texture size and use efficient texture formats where supported;

- verify scale in metres and coordinate orientation;

- run asset-budget script;

- test loading and failure on low-end device;

- never load model-selected arbitrary asset URLs.

## 10. Test commands and evidence

Target underlying commands may include:

``` bash
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test --coverage
pnpm --filter web exec playwright test
go test ./...
go test -race ./...
go vet ./...
staticcheck ./...
go test -fuzz=Fuzz -fuzztime=30s ./path/to/package
```

The Makefile remains the public interface. CI uploads frontend and Go coverage separately and enforces changed-line plus core-module thresholds.

When a test fails:

1.  Read the first relevant failure.

2.  Reproduce the narrow test.

3.  Fix production behaviour or a genuinely wrong expectation.

4.  Never change a test merely because the implementation differs.

5.  Add a regression case.

6.  Run the broad gate again.

## 11. Docker expectations

Development Compose initially includes PostgreSQL. Optional profiles later add local LiveKit, SearXNG, and observability.

Production images:

- multi-stage build;

- non-root user;

- minimal base pinned by digest according to update policy;

- read-only filesystem where practical;

- no source .env or credentials;

- health/readiness endpoints;

- graceful SIGTERM and WebSocket drain;

- CPU/memory/PID limits in deployment;

- SBOM and vulnerability scan.

Docker Compose is local orchestration, not proof of high availability.

## 12. Common problems

**OpenCode model missing:** update OpenCode, run /connect, then /models; use the exact model shown. Provider/region availability varies.

**Port in use:**

``` bash
lsof -i :3000
lsof -i :8081
lsof -i :5432
```

**Database not ready:**

``` bash
docker compose ps
docker compose logs postgres
```

**WebGL fails:** continue in 2D mode; update browser/driver; verify the product does not block learning.

**Microphone denied:** use browser site permissions; the UI must retain text mode.

**GLB too large/slow:** run asset budget, inspect texture resolution/triangle count, compress and retest on reference hardware.

**Gemini quota/error:** switch to mock mode. Never bypass by embedding a key in client code.

**SearXNG CAPTCHA/block:** disable search and use transparent no-search behaviour; do not scrape around provider controls.

## 13. Safe reset

A reset is destructive and must be explicit:

``` bash
make compose-down
make reset
make compose-up
make migrate
```

Expected reset documentation lists deleted containers, volumes, uploads, fixtures, and caches. Never point reset at staging/production.

## 14. Documentation maintenance

Whenever a command, port, dependency, model, architecture, asset, security control, or expected output changes, update this file, README, relevant ADRs, diagrams, comments, roadmap status, and TECHNICAL_DESIGN.md in the same PR. Setup documentation must be tested periodically on a clean machine.

## 15. Continuous Integration (CI)

The project uses GitHub Actions for continuous integration:

- **CI Pipeline**: Runs on every push and pull request to main branch
- **Checks**: Format, lint, typecheck, static analysis
- **Tests**: Unit tests, integration tests with PostgreSQL
- **Build**: Builds both web and Go applications
- **Coverage**: Code coverage analysis
- **Security**: Secret scanning and dependency review
- **SBOM**: Software Bill of Materials generation

All CI commands match the local Make targets to ensure consistent behavior.