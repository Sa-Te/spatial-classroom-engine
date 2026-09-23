# AGENTS.md — Spatial Classroom Engine

## 1. Core Principles & Priority Order

Build an open-source, browser-first spatial AI classroom via small, reviewable vertical slices.
A learner selects a teacher avatar, chooses a topic or PDF lesson, enters an accessible classroom, and converses by text first and voice later.

If priorities conflict, resolve strictly in this order:
1. **User safety, privacy, authorization, and correctness.**
2. **Runnable mock mode requiring no paid credentials (`MOCK_MODE=true`).**
3. **Small vertical slices with meaningful tests (<400 hand-written changed lines per PR).**
4. **Accessibility, semantic 2D DOM fallback, and graceful failure without WebGL.**
5. **Maintainability, documented ADRs (`docs/adr/`), and stable contracts.**
6. **Performance based on measurement.**
7. **Visual polish.**

### 1.1 Five Controlling Documents
Always consult the relevant sections before and during implementation:
- `AGENTS.md` — Agent operational guardrails and repository conventions (this file).
- `ROADMAP_WITH_PROMPTS.md` — Staged delivery plan and active ticket prompts.
- `SETUP_RUN_VERIFY.md` — Target developer setup, command definitions, and phase verification gates.
- `TECHNICAL_DESIGN.md` — Architectural source of truth, invariants, schemas, and coordinate rules.
- `PRODUCT_REQUIREMENTS_UX.md` — User journeys, personas, UI wireframes, and required copy.

---

## 2. Monorepo Architecture & Critical Invariants

### 2.1 Repository Layout
- `apps/web` — Next.js (TypeScript strict mode, React, Tailwind CSS, optional React Three Fiber / R3F). Entry is semantic DOM; 3D canvas is lazy-loaded.
- `services/app-go` — Single modular Go monolith (`cmd/api`, `cmd/worker`, `internal/...`). One deployable owns HTTP, WebSocket authority, classroom state, AI orchestration, media tokens, and background jobs.
- `packages/contracts` — Versioned schemas (OpenAPI, JSON Schema, AsyncAPI) and contract test fixtures.
- `docs/adr/` — Architecture Decision Records (`0001-...`).

### 2.2 Architectural Invariants (Do Not Violate)
1. **Backend Owns Authority:** The Go backend owns canonical room, authorization, and educational state. Clients propose; backend authorizes and commits.
2. **Domain Package Purity:** Packages under `services/app-go/internal/...` must NEVER import web frameworks, SQL drivers, or third-party SDKs (Gemini, LiveKit, Poppler, Three.js). External systems must live behind ports/interfaces.
3. **Durable Facts vs. Ephemeral Signals:** PostgreSQL stores durable educational records. Ephemeral avatar poses/transforms must not be persisted per frame and never grant permissions.
4. **Accessible 2D Fallback:** Core classroom actions (chat, board, controls) must work completely in semantic HTML without WebGL, spatial audio, microphone, or external AI.
5. **Coordinate System:** Metres, right-handed: $+X$ right, $+Y$ up, $-Z$ forward; rotations use quaternions $[x, y, z, w]$. Server rejects NaN, infinity, and out-of-world coordinates.
6. **AI Is Untrusted:** AI is a metered collaborator, not teacher of record. Grounded answers must carry validated citation IDs and page numbers. Never execute model-generated code or arbitrary HTML.
7. **Zero Secrets in Browser:** No long-lived Gemini, LiveKit, storage, or DB credentials may reach the client. Issue short-lived, room-scoped media tokens.

---

## 3. Scope & Workflow Rules

- **One Ticket at a Time:** Work ONLY on the active ticket from `ROADMAP_WITH_PROMPTS.md`. Do not start, anticipate, or partially implement adjacent tickets.
- **Scope Limit:** Maximum ~400 hand-written changed lines per ticket/PR (excluding generated schemas, locks, fixtures). If a ticket requires more, stop and propose a split.
- **TDD / Test First:** Write or update a failing behavioral test before implementing logic. Never add superficial coverage tests or delete valid tests.
- **Self-Verification Evidence:** Before reporting complete, run `make check`, targeted tests, and `make build`. Never claim success without command output evidence.
- **Documentation Synchronization:** Whenever code changes contracts, setup, or architecture, update `ROADMAP_WITH_PROMPTS.md` (tick completed item), `SETUP_RUN_VERIFY.md`, `TECHNICAL_DESIGN.md`, and relevant ADRs in the same PR.

---

## 4. Developer Commands & Verification

Commands are exposed via the root `Makefile` (implemented starting in Phase 0):

```bash
make bootstrap        # Check toolchain prerequisites and install dependencies
make compose-up       # Start local container services (PostgreSQL)
make compose-down     # Stop container services
make dev              # Run web (:3000) and Go API (:8081) concurrently in mock mode
make check            # Format check, lint, static analysis, typecheck (no file changes)
make test             # Run fast unit and component tests (no paid keys required)
make test-integration # Run PostgreSQL integration tests against disposable DB
make test-race        # Run Go race detector
make test-e2e         # Run Playwright end-to-end tests
make coverage         # Enforce changed-line and module coverage thresholds
make build            # Production builds of apps/web and services/app-go
make reset            # Destructive local state reset (requires confirmation)
```

### 4.1 Focused Single-Test Shortcuts
- **Go single package:** `go test -v ./services/app-go/internal/<pkg>/...`
- **Go single test:** `go test -v -run TestName ./services/app-go/internal/<pkg>/...`
- **Go race detection:** `go test -race ./services/app-go/internal/<pkg>/...`
- **Go static analysis:** `go vet ./... && staticcheck ./...`
- **Web single test:** `pnpm --filter web test -- -t "test name pattern"`
- **Web typecheck:** `pnpm --filter web typecheck`
- **Web lint:** `pnpm --filter web lint`
- **Web single E2E:** `pnpm --filter web exec playwright test tests/topic-flow.spec.ts`

---

## 5. Environment & Toolchain Gotchas

- **Platform:** Linux / WSL2 Ubuntu.
- **Node & pnpm:** Node LTS (v22+), pnpm (v10+). Managed via pnpm workspace in `apps/` and `packages/`.
- **Go:** Stable Go (1.23+ / 1.24+). Binaries should be on PATH (`go version`).
- **Docker in WSL2:** If running on WSL2 with Docker Desktop, Docker integration must be enabled for the active Ubuntu distribution in Docker Desktop settings.
- **Health Endpoints:**
  - Live: `GET http://localhost:8081/api/v1/health/live`
  - Ready: `GET http://localhost:8081/api/v1/health/ready` (fails if required DB is unreachable).
- **Redaction:** Never log authentication tokens, prompts, transcripts, uploaded material, or user names.

---

## 6. Ticket Completion Report Template

At the completion of each roadmap ticket, submit your response using this exact structure:

```markdown
## Ticket
P?.? — [Title]

## Outcome
[Description of what the user can now do]

## Files Changed
- `path/to/file` — [Reason for change]

## Verification Evidence
- `[command]` — PASS/FAIL and meaningful result output

## Manual Verification
1. [Step 1]
2. [Step 2]

## Contracts/Migrations/Docs
- [Changes and compatibility impact]

## Risks and Limitations
- [Known trade-offs or deferred items]

## Next Ticket
P?.? — [Title] (Not started)
```

---

## 7. Session Notes Protocol (Obsidian Trigger)

When TJ explicitly states **"wrap session"**, **"log notes"**, **"we are done now, log everything into notes"**, or equivalent, write structured markdown notes directly to the external Obsidian vault across the WSL mount:

| Note Type | WSL Destination Path | Filename Format |
| :--- | :--- | :--- |
| **Session Summary** | `/mnt/c/Users/Asuna/Documents/InstaVault/spatial-classroom/learning-notes/` | `YYYY-MM-DD_session-NN.md` |
| **Architecture** | `/mnt/c/Users/Asuna/Documents/InstaVault/spatial-classroom/architecture/` | `YYYY-MM-DD_<topic>.md` |
| **Debug Log** | `/mnt/c/Users/Asuna/Documents/InstaVault/spatial-classroom/debug-log/` | `YYYY-MM-DD_<bug-slug>.md` |
| **Mind Maps** | `/mnt/c/Users/Asuna/Documents/InstaVault/spatial-classroom/mind-maps/` | `YYYY-MM-DD_<topic>.md` |

### Protocol Rules:
- **Mandatory Entry:** Always write the session summary to `learning-notes/` upon trigger.
- **Conditional Entries:** Write architecture/debug/mind-map notes if design decisions were made or bugs resolved.
- **Obsidian Wikilinks:** Cross-link concepts using `[[concept-name]]` or `[[ADR-000X]]`.
- **Never Commit Notes:** Do NOT commit session notes into this repository.