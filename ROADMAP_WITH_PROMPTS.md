# ROADMAP_WITH_PROMPTS.md — Spatial Classroom Engine

> ADHD-friendly delivery plan and copy-paste OpenCode prompts

## 1. ROADMAP_WITH_PROMPTS.md

> *“**Repository destination:** `/ROADMAP_WITH_PROMPTS.md`
> Work on exactly one ticket at a time. Tick it only after automated and manual evidence passes.”*

## 2. Delivery strategy

The project is large but achievable if it is built as staged vertical slices. The correct order is:

> *“**Prove the lesson experience → ground it in PDFs → share state → add voice → add controlled search → harden → deploy → validate UE5 compatibility.**”*

Do not begin with microservices, Redis, SearXNG, Kubernetes, photorealism, or Unreal Engine. The MVP is one learner, one teacher avatar, one room, typed discussion, mock mode, and a 2D fallback.

### 2.1 Phase releases

| **Release** | **Demonstrable outcome** |
|:---|:---|
| v0.1-skeleton | Clean clone runs web + Go health API in mock mode |
| v0.2-topic-class | Select teacher, enter topic, chat in 2D/3D classroom |
| v0.3-pdf-class | Upload text PDF, ask cited questions, display source page |
| v0.4-multiplayer | Two browsers share presence, chat, and board state |
| v0.5-voice | LiveKit voice, AI voice participant, text fallback |
| v0.6-search | Teacher-controlled cited web search |
| v0.7-pilot | Security/accessibility/operations release candidate |
| v1.0 | Small cloud pilot with monitoring and rollback |

## 3. Standard prompt wrapper

Paste this before every ticket prompt:

``` text
Read AGENTS.md and the relevant sections of ROADMAP_WITH_PROMPTS.md,
SETUP_RUN_VERIFY.md, TECHNICAL_DESIGN.md, PRODUCT_REQUIREMENTS_UX.md,
and applicable docs/adr records.

Work ONLY on the named ticket. Before editing:
1. Restate acceptance criteria and exclusions.
2. Inspect existing implementation, tests, schemas, and docs.
3. List files expected to change.
4. Propose the smallest testable implementation.
5. Stop if an architectural invariant must change or if more than about
   400 hand-written changed lines are required; propose a split instead.

Rules:
- Preserve mock mode and accessible 2D fallback.
- Do not implement adjacent roadmap tickets.
- Do not refactor unrelated code.
- Add meaningful behavioural tests; never add pass-through coverage tests.
- Do not weaken or delete valid tests.
- Run targeted tests, then the documented phase gate commands.
- Inspect the final diff for secrets and accidental changes.
- Update historical docs, ADRs, diagrams, comments, setup commands,
  roadmap status, and TECHNICAL_DESIGN.md whenever made inaccurate.

At completion, show in this interface:
- outcome and files changed;
- exact commands I should run;
- commands you ran and PASS/FAIL results;
- manual browser verification with expected output;
- contracts, migrations, security, and accessibility impact;
- limitations and the next ticket, without starting it.
```

## 4. Phase 0 — Constitution and walking skeleton

### 4.1 Goal

A new contributor can clone the repository, start in mock mode without paid credentials, see a web page report the Go API as healthy, and run CI-equivalent checks.

#### 4.1.1 [x] P0.1 — Initialize GitHub repository

**Outcome:** Public-ready repository with branch protections and community files.

**In scope:** repository, README stub, Apache-2.0 or MIT decision, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, issue/PR templates, Dependabot/Renovate choice, branch protection notes.

**Out of scope:** application code.

**Acceptance:** no secret or generated junk; main branch requires PR and status checks; issues have bug/feature templates.

**Prompt:**

``` text
Ticket P0.1: Prepare the GitHub repository constitution. Add the five controlling
Markdown files from the supplied documents, README stub, chosen OSI licence,
CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, .gitignore, .editorconfig,
issue templates, PR template, and branch-protection setup instructions.
Do not generate application code. Validate Markdown links and report the exact
gh/git commands for repository creation and protection. Record the licence
choice in docs/adr/0001-open-source-licence.md.
```

#### 4.1.2 [ ] P0.2 — Monorepo skeleton

**Outcome:** Next.js frontend and Go backend start locally.

**In scope:** pnpm workspace, apps/web, services/app-go, Go workspace/module, root Makefile, .env.example, /api/v1/health/live, /api/v1/health/ready, frontend API-status card.

**Acceptance:** mock mode needs no key; stopped API shows a visible error; make check, make test, and make build work.

**Prompt:**

``` text
Ticket P0.2: Create the minimal monorepo walking skeleton. Use current stable
pinned Node/pnpm/Go versions, Next.js TypeScript strict mode, and one Go modular
application. Add live and ready health endpoints and make the web homepage show
API status. Add one meaningful web behaviour test and API handler test. Add root
Make targets and update setup docs. No database, Docker, 3D, AI, auth, PDF,
WebSocket, or LiveKit yet.
```

#### 4.1.3 [ ] P0.3 — Local PostgreSQL and migrations

**Outcome:** Docker Compose starts PostgreSQL and the application applies a real migration.

**Acceptance:** clean migration up; application runtime role cannot alter schema; disposable-container integration test; reset documented.

**Prompt:**

``` text
Ticket P0.3: Add PostgreSQL to Docker Compose, a migration tool, separate
migration/runtime credentials, and an initial app_metadata table. Add a real
PostgreSQL integration test using a disposable container. Readiness must fail
when the database is required but unavailable. Do not add Redis, pgvector,
authentication, or domain tables. Document startup, migration, and safe reset.
```

#### 4.1.4 [ ] P0.4 — CI foundation

**Outcome:** GitHub Actions runs repository checks safely.

**Acceptance:** format/lint/typecheck, Go vet/staticcheck, unit/integration tests, build, secret/dependency scan, coverage artefacts; fork PRs get no secrets.

**Prompt:**

``` text
Ticket P0.4: Add GitHub Actions for check, test, PostgreSQL integration, build,
coverage, secret scanning, dependency review, and SBOM generation. Cache safely,
pin action major versions or SHAs per project policy, use least permissions,
and ensure fork PRs receive no secrets. CI commands must be the same Make
targets used locally. Do not add deployment.
```

**Phase 0 gate:** A second person reaches the page from a clean clone in under 15 minutes using only SETUP_RUN_VERIFY.md.

## 5. Phase 1 — Single-user topic classroom

### 5.1 Goal

A user selects one of two teacher avatars, enters a topic, starts a class, and exchanges typed messages in a classroom that degrades to 2D.

#### 5.1.1 [ ] P1.1 — Teacher selection and session setup

``` text
Ticket P1.1: Implement keyboard-accessible teacher selection with exactly two
checked-in teacher configurations. Add “Discuss a topic” and “Study my material”
choices, but only topic mode is enabled in this ticket. Validate topic text,
prevent double submission, create a short-lived session through POST
/api/v1/sessions, and navigate to /classroom/{sessionId}. Add loading and
retryable error states. In-memory repository is acceptable behind a port.
No database persistence, PDF, 3D, AI provider, accounts, or voice.
```

**Acceptance:** no blank topic; one selected teacher; duplicate click creates one session; keyboard flow works; typed errors are visible.

#### 5.1.2 [ ] P1.2 — Accessible classroom shell

``` text
Ticket P1.2: Build the classroom route as semantic DOM first: teacher panel,
chat transcript, board region, input, leave/reset, connection status, and a
2D/3D mode control. Add loading, expired-session, and error states. Do not add
Three.js yet. Test headings, labels, focus order, keyboard operation, and
session-expired behaviour.
```

#### 5.1.3 [ ] P1.3 — Small 3D scene

``` text
Ticket P1.3: Add a lazy-loaded React Three Fiber scene containing one licensed
classroom GLB and one licensed teacher avatar GLB, fixed camera, basic lights,
and asset loading state. The DOM classroom remains fully usable when WebGL or
an asset fails. Add asset source/licence records and an asset-budget script.
No animation, lip sync, physics, student movement, multiplayer, or voice.
```

**Budgets:** initial compressed scene target under 10 MB, avatar under 5 MB, textures normally ≤2K, document exceptions.

#### 5.1.4 [ ] P1.4 — Deterministic typed tutor

``` text
Ticket P1.4: Add POST /api/v1/sessions/{id}/messages and a Tutor port. Implement
a deterministic MockTutor and an optional Gemini adapter selected by server
configuration. Keep prompts in /prompts. Bound message length, history, timeout,
and per-session use. Stream text only if it stays within this ticket. Never send
provider keys to the browser. Provider errors must remain errors, not invented
answers. Add domain, handler, and failure tests.
```

#### 5.1.5 [ ] P1.5 — Structured board actions

``` text
Ticket P1.5: Permit the tutor to return only allow-listed structured board
actions, beginning with display_markdown(title, body). Validate server output
against a versioned schema and render sanitized content. Reject arbitrary HTML,
URLs, scripts, unknown actions, and oversized payloads. Add malicious-output
fixtures and accessible board announcements.
```

**Phase 1 gate:** Complete the five-minute topic-class demo twice from reset, once in 3D and once in 2D; no provider key is required in mock mode.

## 6. Phase 2 — PDF-grounded classroom

#### 6.0.1 [ ] P2.1 — Secure PDF upload

``` text
Ticket P2.1: Accept one text-based PDF per session behind a MaterialStorage port.
Validate PDF magic bytes and MIME, configured byte/page limits, random server
names, checksum, and ownership. Track upload/processing/ready/failed states.
Store locally for development. Add valid, renamed-non-PDF, malformed, oversized,
and image-only fixtures. Do not add embeddings or question answering.
```

#### 6.0.2 [ ] P2.2 — Page-aware extraction worker

``` text
Ticket P2.2: Add a worker command in the same Go codebase and a PdfExtractor
port. Implement a sandboxed Poppler pdftotext adapter in the development
container, preserving page boundaries. Persist materials/pages/checksum/status
in PostgreSQL. Jobs must be idempotent and bounded. Report scanned PDFs as
unsupported. Add timeout, crash, and duplicate-upload tests.
```

#### 6.0.3 [ ] P2.3 — Chunks, embeddings, and retrieval

``` text
Ticket P2.3: Add pgvector via migration, page-aware chunks, an EmbeddingProvider
port, deterministic test embeddings, and an optional configured provider.
Retrieval must filter by authorised material/session before similarity ranking.
Persist embedding model/version. Add cross-session isolation, insufficient
evidence, and deterministic retrieval fixtures. No viewer yet.
```

#### 6.0.4 [ ] P2.4 — Cited answers

``` text
Ticket P2.4: Ground tutor answers in retrieved chunks. Return structured answer,
citation IDs, pages, and snippets. Validate every citation against retrieved
stored evidence before display; reject invented IDs. Separate instructions from
untrusted document content. Add a ten-question fixture and report accepted-page
accuracy. No web search.
```

#### 6.0.5 [ ] P2.5 — Classroom PDF board

``` text
Ticket P2.5: Display citation chips and the cited PDF page on the classroom
board, with previous/next, close, keyboard controls, and extracted-text fallback.
Only a server-validated show_page action may change the board. Render PDFs in a
sandboxed/safe manner and never execute embedded content. Add exact-page and
invalid-page tests.
```

#### 6.0.6 [ ] P2.6 — Deletion and retention

``` text
Ticket P2.6: Implement material deletion across source object, pages, chunks,
embeddings, and references with auditable status and retry-safe cleanup. Define
development retention defaults. Add tests proving deleted and cross-session
content cannot be retrieved. Update privacy/data-flow docs.
```

**Phase 2 gate:** Run the fixture evaluation three times with zero fabricated citations, zero cross-session results, and at least 8/10 accepted pages.

## 7. Phase 3 — Multiplayer shared state

#### 7.0.1 [ ] P3.1 — Versioned realtime contract

``` text
Ticket P3.1: Define JSON Schemas/AsyncAPI-style documentation for command,
domain-event, snapshot, ephemeral-signal, and typed-error envelopes. Include
protocolVersion, IDs, sequence, timestamp, room, actor, and payload. Add valid,
invalid, old-client, unknown-field, duplicate, and ordering fixtures. No socket
server yet.
```

#### 7.0.2 [ ] P3.2 — Room presence and reconnect

``` text
Ticket P3.2: Add authenticated development room membership, WebSocket join/leave,
heartbeat, bounded queues, payload limits, snapshot, server sequence, and
reconnect/resync. Implement strict Origin checking and message authorization.
Add a Playwright multi-context test. Do not add positions, voice, or Redis.
```

#### 7.0.3 [ ] P3.3 — Shared board and chat

``` text
Ticket P3.3: Synchronize chat and current material/page through authorised
commands and domain events. Host-only board changes fail closed. Duplicate and
reordered commands cannot corrupt state. Reconnecting clients receive the
current snapshot. Add negative authorization and convergence tests.
```

#### 7.0.4 [ ] P3.4 — Avatar positions

``` text
Ticket P3.4: Add low-rate, rate-limited ephemeral pose updates using documented
metres/quaternions. Validate finite numbers and world bounds. Client interpolation
must not use React state per frame. Drop stale sequences. Never persist every
pose. Test packet loss/reordering and use a safe spawn fallback.
```

#### 7.0.5 [ ] P3.5 — Measured multi-instance decision

``` text
Ticket P3.5: Load-test the single backend for the documented pilot target. Record
CPU, memory, queue depth, latency, reconnect behaviour, and bottlenecks. Do not
add Redis unless evidence proves a multi-instance requirement. If required,
write an ADR with consistency/failure/TTL/recovery semantics before implementing
coordination as a separate ticket.
```

**Phase 3 gate:** Two browser contexts prove join, chat, page change, movement, disconnect, reconnect, and convergence. Slow clients cannot exhaust memory.

## 8. Phase 4 — LiveKit voice and AI speech

#### 8.0.1 [ ] P4.1 — LiveKit audio

``` text
Ticket P4.1: Add a MediaRooms port, backend-issued short-lived room-scoped
LiveKit tokens, and a web RtcProvider. Implement explicit microphone consent,
device selection, join, mute, leave, reconnect status, and text fallback. Use
managed LiveKit for pilot unless an ADR selects local self-hosting. Automated
tests use a mock adapter; add a documented real two-browser check.
```

#### 8.0.2 [ ] P4.2 — AI voice participant

``` text
Ticket P4.2: Connect the existing tutor pipeline as a LiveKit participant using
a replaceable agent adapter and Gemini Live where configured. Gemini 3.8 Flash
is for coding/text tasks; use a current stable Live-capable model ID for live
voice, pinned through configuration. Add push-to-talk, interruption policy,
partial/final transcript, hard time/cost limits, and typed fallback. No recording.
```

#### 8.0.3 [ ] P4.3 — Spatial audio

``` text
Ticket P4.3: Route remote audio through Web Audio panner/gain nodes based on
canonical positions. Unit-test coordinate mapping and clamping. Add a persistent
Spatial audio off setting and centered safe fallback. Clamp maximum gain and
ensure spatial cues are never the only information channel.
```

**Phase 4 gate:** Ten-minute two-browser session covers speech, mute, interruption, reconnect, permission denial, and text fallback. Tokens cannot cross rooms.

## 9. Phase 5 — Controlled web search

#### 9.0.1 [ ] P5.1 — Search policy and mock

``` text
Ticket P5.1: Add a KnowledgeRetriever/SearchProvider port and deterministic mock.
Define when search is permitted: explicit request or freshness need, teacher
setting enabled, approved budgets. Prefer PDF evidence for PDF questions. Add
evaluations for search-required and search-not-required cases. No SearXNG yet.
```

#### 9.0.2 [ ] P5.2 — SearXNG adapter and safety

``` text
Ticket P5.2: Add optional self-hosted SearXNG as an adapter, disabled by default.
Normalize title, URL, snippet, source, and retrieval time. Enforce SafeSearch,
rate limits, timeouts, allowed URL schemes, and transparent failures. If pages
are fetched, use SSRF-safe destination and redirect validation. Treat all result
text as untrusted evidence. Add prompt-injection fixtures.
```

#### 9.0.3 [ ] P5.3 — Web citations

``` text
Ticket P5.3: Show visible search progress and sanitized web citations distinct
from study-material citations. Every web-derived claim must reference returned
evidence. Search failure must say so and offer retry, never produce a secretly
ungrounded answer.
```

## 10. Phase 6 — Pilot hardening

Tickets: authentication/roles; tenant isolation; consent/retention; security headers and rate limits; accessibility audit; observability/costs; backup/restore; load/resilience; AI safety evaluation; incident/abuse runbooks.

#### 10.0.1 [ ] P6.1 — Threat model and auth baseline prompt

``` text
Ticket P6.1: Update the threat model, then implement the smallest mature OIDC or
signed-pilot identity integration and student/teacher roles. Authorize every
HTTP and realtime action. Add room/material cross-access negative tests, logout
revocation, secure cookie/CSRF policy, and audit events. Do not build a custom
password system.
```

#### 10.0.2 [ ] P6.2 — Accessibility and failure audit prompt

``` text
Ticket P6.2: Audit essential flows against WCAG 2.2 AA targets. Fix keyboard,
focus, labels, captions/text, reduced motion, contrast, zoom, no-WebGL,
no-microphone, disconnect, and provider-outage flows. Combine axe/Playwright
with a documented NVDA or VoiceOver manual script; automated checks are not the
only evidence.
```

#### 10.0.3 [ ] P6.3 — Operations prompt

``` text
Ticket P6.3: Add structured redacted logs, bounded metrics, traces, SLO draft,
cost counters, backup/restore scripts, incident runbook, AI kill switch,
gracious WebSocket drain, and load tests at twice pilot demand. Prove a clean
restore and provider outage fallback. Do not log prompts, transcripts, names,
tokens, audio, or document text.
```

## 11. Phase 7 — Cloud staging and pilot

``` text
Ticket P7.1: Produce non-root, minimal, immutable production images for web and
Go app/worker. Document a first staging topology using managed PostgreSQL,
object storage, managed LiveKit where possible, TLS, secret manager, explicit
migrations, health checks, budget alerts, smoke test, rollback, and restore.
Use infrastructure as code after the target platform ADR. Do not introduce
Kubernetes for the first pilot without measured need.
```

**Gate:** Deploy, migrate, run topic and PDF smoke tests, simulate provider outage, roll back application, and restore database in staging.

## 12. Phase 8 — UE5 compatibility spike

``` text
Ticket P8.1: Validate engine-neutral contracts before a full UE5 client. Publish
OpenAPI/JSON Schema fixtures for session, snapshot, presence, pose, board,
errors, and reconnect. Pin coordinate/unit rules. Build the smallest UE sample
that joins, maps participants to actors, displays board state, and—only if the
current supported SDK permits—joins LiveKit audio. Record plugin/platform
limits. Do not duplicate tutor logic in UE.
```

## 13. Explicit “Not now” list

- Kubernetes, service mesh, Kafka/NATS, event sourcing.

- Separate Go microservices.

- Redis before measured multi-instance need.

- Public web search before PDF grounding.

- Custom SFU or identity provider.

- Persistent raw pose history.

- AI grading, discipline, diagnosis, emotion/gaze profiling.

- Always-on microphone/camera or default recording.

- Photorealistic avatars, complex physics, user-generated models.

- Native UE5 production client before protocol demand.

## 14. ADHD operating system

- Only one implementation ticket may be “in progress.”

- Put Current ticket, Next command, Blocker, and Done when at the top of a small NEXT.md.

- Work in 30–90 minute slices ending with a visible result or a test.

- Stop after phase gates; tag a demo and celebrate it.

- When stuck, run the smallest documented check rather than redesigning the system.

- Every completed ticket must leave the repository runnable.

## 15. Documentation sync rule

No ticket is complete until it updates every now-inaccurate historical document, ADR, architecture diagram, comment, setup command, asset licence, roadmap checkbox, and verification expectation—including TECHNICAL_DESIGN.md.
