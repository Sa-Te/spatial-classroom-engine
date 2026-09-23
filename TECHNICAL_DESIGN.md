# TECHNICAL_DESIGN.md — Spatial Classroom Engine

> Architectural source of truth

## 1. TECHNICAL_DESIGN.md

> *“**Repository destination:** `/TECHNICAL_DESIGN.md` or `/docs/TECHNICAL_DESIGN.md`
> This document prevents architectural drift. Changes require synchronized implementation, tests, diagrams, setup documentation, and usually an ADR.”*

## 2. Executive decision

Build a browser-first, accessible spatial classroom as a **modular Go monolith with ports and adapters**, a Next.js/React Three Fiber client, PostgreSQL, and provider-neutral integrations for Gemini and LiveKit.

The original microservice diagram is deliberately simplified for the MVP. Separate Go core and AI services, Redis, and SearXNG would create several stateful distributed systems before product value is proven. Clear interfaces—not deployment count—provide replaceability.

### 2.1 Governing rule

> *“Durable educational facts go through the authoritative backend and PostgreSQL. Ephemeral motion may be lossy. Media belongs to the SFU. AI is untrusted and metered. Three-dimensional presentation is optional; learning controls remain accessible in semantic HTML.”*

## 3. Goals

- Topic-discussion and PDF-grounded single-user classes.

- Teacher/avatar selection.

- Browser 3D without cloud GPU rendering.

- Accessible 2D/text fallback.

- Later multiplayer shared state and LiveKit voice/spatial audio.

- Cited, controlled AI answers and optional web search.

- Local Docker development and low-friction open-source contribution.

- Contracts suitable for a later UE5 client.

- Measurable security, privacy, testability, observability, and cost controls.

## 4. Non-goals for MVP

- Microservices, Kubernetes, multi-region, Kafka/NATS, event sourcing.

- Redis unless multi-instance evidence demands it.

- SearXNG or arbitrary browsing before PDF grounding.

- AI grading, discipline, diagnosis, counselling, biometric/emotion/gaze profiling.

- Default recording or always-on microphone/camera.

- Photorealistic avatars, complex physics, custom SFU, native UE5 client.

- Full LMS, accounts/SSO before anonymous pilot sessions work.

## 5. System context

``` text
Learner/Teacher
      │ HTTPS/WSS/WebRTC
      ▼
Browser: Next.js semantic UI + optional R3F spatial view
      │
      ├── HTTP/WSS ──► Go Application (one deployable)
      │                   ├─ identity/access
      │                   ├─ classroom/session
      │                   ├─ realtime coordinator
      │                   ├─ materials/retrieval
      │                   ├─ tutor orchestration
      │                   ├─ media token adapter
      │                   ├─ privacy/audit
      │                   └─ background worker command
      │                         │
      │                         ├── PostgreSQL (+ pgvector later)
      │                         ├── local/S3-compatible object storage
      │                         ├── Gemini adapters
      │                         └── optional SearXNG adapter later
      │
      └── WebRTC ───► LiveKit SFU ◄── AI voice participant/agent
```

For local development, Docker Compose provides PostgreSQL first; optional profiles later provide LiveKit, SearXNG, and observability.

## 6. Architecture style

### 6.1 Modular monolith

One deployable reduces authorization boundaries, migrations, transactions, operational burden, and contributor setup. Modules remain separately testable and cannot arbitrarily import each other’s persistence internals.

Suggested Go structure:

``` text
services/app-go/
├── cmd/api/
├── cmd/worker/
└── internal/
    ├── identity/
    ├── classroom/
    ├── realtime/
    ├── materials/
    ├── tutor/
    ├── media/
    ├── privacy/
    ├── audit/
    └── platform/
        ├── postgres/
        ├── objectstore/
        ├── gemini/
        ├── livekit/
        ├── poppler/
        └── searxng/
```

### 6.2 Ports and adapters

Application/domain code owns interfaces. Provider adapters implement them. Examples:

``` go
type Tutor interface {
    Reply(ctx context.Context, req TutorRequest) (TutorReply, error)
}

type MaterialStorage interface {
    Put(ctx context.Context, object Object) (ObjectRef, error)
    Delete(ctx context.Context, ref ObjectRef) error
}

type PDFExtractor interface {
    Extract(ctx context.Context, ref ObjectRef, limits Limits) ([]Page, error)
}

type MediaRooms interface {
    IssueParticipantToken(ctx context.Context, join JoinRequest) (Token, error)
}

type KnowledgeRetriever interface {
    Retrieve(ctx context.Context, query Query) ([]Evidence, error)
}
```

No domain package imports Gemini, LiveKit, SQL driver, Poppler, SearXNG, or Three.js types.

### 6.3 Lightweight domain-driven design

Use entities/value objects for Session, Room, Participant, Material, Citation, Role, Pose, BoardState, and Budget. Keep invariants in domain/application code, not handlers. Do not create ceremony for trivial CRUD.

### 6.4 CQRS-lite and event discipline

Distinguish:

- **Commands:** requests requiring authentication, authorization, validation, deduplication, and possible rejection.

- **Domain events:** accepted facts with server sequence and correlation.

- **Ephemeral signals:** pose/gaze/speaking hints; lossy and non-authoritative.

- **Snapshots:** authoritative reconnect state.

Do not implement full event sourcing. Use a transactional outbox only when a durable database change must reliably publish asynchronous work.

## 7. Client architecture

The classroom page consists of semantic DOM plus an optional canvas:

``` text
Classroom
├── heading and status
├── participant list
├── tutor/chat transcript
├── board/source viewer
├── media controls and captions
├── leave/report/help
└── lazy R3F canvas
```

Essential operations cannot require clicking a 3D object. The 3D view consumes application state but does not own durable state.

High-frequency transforms use a frame-oriented store/ref and interpolation, not React render state at 30–60 FPS. Resources and media nodes are disposed on unmount/reconnect.

### 7.1 Asset budgets

Initial targets, measured and revisable by ADR:

- classroom compressed transfer ≤10 MB;

- teacher avatar ≤5 MB each;

- normal texture maximum 2K unless justified;

- first interactive DOM shell before heavy scene;

- 30 FPS target on chosen low-end reference device;

- no-WebGL path always functional.

Store licence/source/checksum/modification records for every redistributed asset.

## 8. HTTP API

Base: /api/v1.

Initial endpoints:

``` text
GET  /health/live
GET  /health/ready
GET  /teachers
POST /sessions
GET  /sessions/{sessionId}
POST /sessions/{sessionId}/messages
POST /sessions/{sessionId}/materials
GET  /sessions/{sessionId}/materials/{materialId}/status
DELETE /sessions/{sessionId}/materials/{materialId}
POST /rooms/{roomId}/media-token             # later
POST /sessions/{sessionId}/ephemeral-token   # only if direct Gemini Live chosen
```

Use typed error bodies:

``` json
{
  "error": {
    "code": "MATERIAL_TEXT_NOT_FOUND",
    "message": "No selectable text was found.",
    "requestId": "uuid",
    "retryable": false
  }
}
```

Public errors reveal no stack trace, SQL, secret, or cross-tenant existence.

## 9. Realtime protocol

### 9.1 Envelope

``` json
{
  "protocolVersion": 1,
  "kind": "command",
  "type": "board.page.change.requested",
  "id": "uuid",
  "correlationId": "uuid-or-null",
  "roomId": "uuid",
  "actorId": "uuid",
  "sequence": 42,
  "sentAt": "RFC3339",
  "payload": {}
}
```

### 9.2 Corrected movement schema

The original movement event trusted client userId, used degrees, and lacked versioning, sequence, timestamp, finite-number validation, and actor authority. Use the authenticated actor identity and quaternions:

``` json
{
  "protocolVersion": 1,
  "kind": "signal",
  "type": "participant.pose.updated",
  "roomId": "uuid",
  "sequence": 103,
  "sentAt": "2026-01-01T12:00:00Z",
  "payload": {
    "positionM": {"x": 1.25, "y": 0.0, "z": -3.4},
    "rotationQuaternion": [0.0, 1.0, 0.0, 0.0]
  }
}
```

The server derives actor identity. Reject NaN, infinity, out-of-world coordinates, oversized rates/payloads, stale sequence, and unsupported versions.

### 9.3 Corrected board change

Do not relay arbitrary pdfUrl. Use authorised IDs:

``` json
{
  "protocolVersion": 1,
  "kind": "command",
  "type": "board.page.change.requested",
  "id": "uuid",
  "roomId": "uuid",
  "sequence": 14,
  "payload": {"materialId": "uuid", "page": 4}
}
```

Server verifies role, room, material ownership, page range, then emits an accepted event and includes current state in snapshots.

### 9.4 Room coordinator

- bounded inbound queue;

- bounded per-client outbound queue;

- slow-client disconnect policy;

- maximum message size;

- heartbeat and idle timeout;

- cancellation and graceful drain;

- server sequence numbers;

- periodic snapshots;

- rate budgets by user/room/IP as appropriate.

WebSocket handshake authentication does not replace per-message authorization. Enforce WSS and strict Origin allowlist.

## 10. Data model

Initial conceptual tables:

``` text
users / anonymous_identities
organizations                         # pilot-ready, optional initially
memberships(role)
teachers(config_key, prompt_version, avatar_asset)
sessions(owner, teacher, mode, topic, status, expiry)
rooms(session, status, current_material, current_page)
participants(room, identity, role, joined/left)
messages(session, author_type, safe_text, provider metadata)
materials(session, object_ref, checksum, status, page_count, retention)
material_pages(material, page_no, extracted_text)
material_chunks(page, ordinal, text, embedding, embedding_model)
citations(message, chunk, page, quote)
outbox(id, type, payload, attempts, delivered_at)
audit_events(actor, action, target_type/id, result, time)
ai_usage(session, provider, model, input/output/audio units, estimated_cost)
consents(identity, purpose, version, time, withdrawn_at)
```

Do not store raw pose history by default. Message/transcript retention must be explicit and minimized. Multi-tenant tables carry organization identity; test isolation with real PostgreSQL. Consider RLS as defense in depth only after understanding owner/bypass caveats.

## 11. Session lifecycle

``` text
CREATED → READY → ACTIVE → ENDED → EXPIRED/DELETED
              ↘ FAILED (recoverable where defined)
```

PDF material lifecycle:

``` text
UPLOADING → STORED → EXTRACTING → INDEXING → READY
                    ↘ FAILED_UNSUPPORTED / FAILED_INVALID / FAILED_INTERNAL
READY → DELETING → DELETED
```

Transitions are validated, idempotent, and tested. Workers claim bounded jobs and safely retry; duplicate processing must not create duplicate pages/chunks.

## 12. PDF pipeline and retrieval

1.  User explicitly selects PDF.

2.  Backend authenticates session and applies size/page/rate limits.

3.  Validate MIME and magic bytes; generate server object name and checksum.

4.  Store through MaterialStorage.

5.  Worker invokes sandboxed PDFExtractor (initially Poppler pdftotext adapter) with timeout/resource limits.

6.  Preserve page boundaries; image-only/scanned files receive a clear unsupported status initially.

7.  Normalize and chunk without crossing source identity/page metadata carelessly.

8.  Generate embeddings behind a provider port; deterministic adapter for tests.

9.  Store in PostgreSQL/pgvector with material/session ownership and embedding version.

10. Retrieval filters authorization/material before ranking.

11. Tutor receives untrusted evidence in a clearly delimited context.

12. Provider returns structured citation IDs.

13. Server validates IDs against retrieved evidence before presentation.

No arbitrary PDF URL is accepted from AI/client. PDF rendering is sandboxed; embedded active content is never executed.

## 13. AI orchestration

### 13.1 Provider use

- OpenCode coding model and product tutor model are separate concerns.

- Current official docs list gemini-3.8-flash for stable coding/agent work and gemini-3.8-live for Live API; verify exact availability at implementation and pin configuration.

- Domain logic references capabilities, not hard-coded model names.

### 13.2 Prompt boundaries

System/developer policy, teacher persona, lesson state, user content, PDF evidence, and web evidence are separate structured sections. Retrieved content is data, never instructions.

### 13.3 Structured output

Tutor reply contains:

``` json
{
  "text": "...",
  "citations": [{"id": "citation-id"}],
  "actions": [{"type": "display_markdown", "version": 1, "payload": {}}],
  "safety": {"refused": false, "reason": null}
}
```

Server validates schemas, sizes, citation provenance, and action allowlist. The client never executes arbitrary HTML/code.

### 13.4 Voice topology

Preferred production classroom topology: AI joins LiveKit through a controlled agent/backend integration for centralized policy, budgets, and tool governance. A direct browser Gemini Live prototype may use constrained one-use ephemeral tokens, but never a long-lived key, and requires a specific ADR covering privacy and moderation trade-offs.

AI controls:

- teacher/global kill switch;

- push-to-talk and visible stop;

- no camera by default;

- hard session/token/audio/tool budgets;

- timeout/retry limits;

- typed tool allowlist and authorization;

- provider outage fallback to text/mock/unavailable state;

- citations and “I do not know” behaviour;

- no autonomous grading or disciplinary decision.

## 14. LiveKit and spatial audio

LiveKit is the SFU/media transport. It does not own durable classroom state. Use short-lived, room-scoped, identity-scoped tokens and least publication/subscription permission.

Client spatialization:

1.  receive remote audio track;

2.  attach through Web Audio graph;

3.  map canonical room position to PannerNode/listener coordinates;

4.  clamp gain/distance;

5.  update at a bounded rate;

6.  use centred safe fallback when position is missing;

7.  offer persistent spatial-audio-off mode.

Managed LiveKit is recommended for the pilot. Self-hosting later requires TURN, TLS, public networking, bandwidth planning, Redis for distributed deployment, monitoring, upgrades, and incident ownership.

## 15. Search

SearXNG is a later optional KnowledgeRetriever adapter, not a factual authority. Upstream blocking/CAPTCHAs, privacy leakage, unsafe results, prompt injection, copyright, and SSRF are expected risks.

Controls:

- teacher/session enable switch;

- explicit/freshness policy;

- SafeSearch/content policy;

- server-side query with time/rate/cost limits;

- sanitized URL/title/snippet/time;

- no unrestricted URL fetching;

- SSRF and redirect validation if fetching is added;

- visible web citations distinct from PDF citations;

- transparent search failure;

- untrusted evidence cannot issue tools/actions.

## 16. Security threat model

Assets include identity/age, room membership, voice/video, transcripts, PDFs, teacher controls, consent, tokens, budget, and audit records.

Threats include unauthorized join, teacher impersonation, cross-room access, WebSocket hijacking, token theft, prompt injection, malicious uploads, SSRF, budget exhaustion, dependency compromise, bullying, and undisclosed recording.

Baseline controls:

- mature identity provider later; no custom password system without need;

- deny-by-default role and membership checks;

- strict CORS/Origin/CSRF/cookie/CSP policy;

- WSS/TLS, schema validation, rate/payload/connection limits;

- short-lived scoped tokens and revocation;

- upload validation, isolation, scanning/sandboxing as risk requires;

- secrets manager in cloud; no secrets in URLs/logs/images;

- dependency, secret, image, and licence scans;

- redacted structured audit/security events;

- retention, export, correction, deletion workflows;

- no ambient recording; visible media state and consent.

A school/minor pilot requires jurisdiction-specific legal/privacy review. FERPA, COPPA, UK GDPR, safeguarding, accessibility, vendor terms, and data-processing agreements may apply depending on users and deployment.

## 17. Accessibility

Target WCAG 2.2 AA for essential flows:

- semantic DOM feature parity;

- keyboard operation and visible focus;

- captions and textual AI output;

- screen-reader participant/action lists;

- reduced motion and no flashing;

- contrast and non-colour-only state;

- 200% zoom/responsive layout;

- text alternative to spatial cues;

- no-WebGL and microphone-denied paths;

- automated axe plus manual NVDA/VoiceOver and user testing.

Accessibility cannot be postponed because a canvas-only interaction model would require redesign.

## 18. Testing architecture

- Domain state/authorization tests with table cases.

- Fuzz parsers, protocol messages, order/duplication, invalid numbers, citation renderers.

- Real PostgreSQL integration for migrations, constraints, transactions, repositories, outbox, tenant isolation.

- OpenAPI/JSON Schema contract compatibility and shared fixtures for future UE5.

- Playwright critical journeys and multi-context multiplayer.

- Pure coordinate/interpolation/audio mapping tests plus limited visual regression.

- AI evaluation corpus for curriculum, unanswerable queries, prompt injection, unsafe requests, citation mismatch, tool abuse, long sessions, and provider failure.

- Load/resilience for churn, fan-out, slow clients, reconnect storms, DB exhaustion, TURN-only network, provider timeout, and graceful drain.

Coverage floors: 70% overall initially, 80% changed lines, 90% line/80% branch core modules, near-complete negative branch coverage for auth/privacy/budget. Coverage cannot substitute for meaningful assertions.

## 19. CI/CD

PR pipeline:

1.  format/lint/typecheck;

2.  Go vet/staticcheck;

3.  unit/component tests;

4.  PostgreSQL integration;

5.  contract compatibility;

6.  production builds;

7.  coverage gates;

8.  dependency/secret/licence scans;

9.  SBOM and image scan when containers exist;

10. Chromium smoke/axe when flows exist.

Nightly/merge: cross-browser, race, longer fuzz, mutation testing for policy modules, provider sandbox tests with caps, load smoke, restore rehearsal schedule.

Deployment: immutable signed images, staging, explicit expand/contract migration job, readiness/liveness, graceful socket drain, feature flags, post-deploy smoke, manual production approval initially, fast rollback.

## 20. Observability and budgets

Metrics: joins, active rooms, reconnects, command rejection, queue depth, message size/rate, DB pool/latency, LiveKit RTT/jitter/loss/TURN, AI latency/errors/usage/cost, retrieval no-evidence rate, page/asset load, FPS bands, WebGL loss.

Do not use unbounded user/room/prompt URL labels. Logs contain timestamp, severity, version, request/trace ID, event category, safe result/error code—not tokens, names, prompts, transcripts, audio, or document text.

Pilot objectives:

- 99.5% successful supported-client joins;

- p95 authoritative command acknowledgement under 500 ms in target region;

- reconnect/resync within 5 seconds for ordinary outages;

- zero known cross-tenant incidents;

- zero unresolved critical accessibility blockers;

- published measured AI latency and cost per student-hour.

## 21. Deployment evolution

### 21.1 Local

Next.js + Go + PostgreSQL through developer processes/Compose. Local object storage. Mock providers by default.

### 21.2 Pilot

Managed container platform, managed PostgreSQL, S3-compatible object storage, managed LiveKit, secret manager, TLS/CDN, one region, backups, monitoring.

### 21.3 Scale triggers

- Add backend replicas/room ownership and Redis only when connection/CPU measurements demand it.

- Extract worker deployment when async jobs need independent scale, while retaining same codebase.

- Extract a module into a service only with stable contract, separate team/operational need, and ADR.

- Add multi-region only for measured latency/residency requirement.

- Add UE5 after demand and protocol conformance fixtures exist.

## 22. ADR index to create

1.  [Open-source licence](docs/adr/0001-open-source-licence.md) (ADR 0001).

2.  Modular monolith over microservices.

3.  Go backend and Next.js client.

4.  PostgreSQL initial source of truth; pgvector timing.

5.  Backend-authoritative state; LiveKit media separation.

6.  Managed versus self-hosted LiveKit.

7.  AI connection topology and provider abstraction.

8.  No SearXNG in MVP.

9.  Coordinate and unit convention.

10. Accessible 2D mode mandatory.

11. Transcript/material retention.

12. Authentication and tenant-isolation strategy.

## 23. Major disadvantages and mitigations

| **Risk/disadvantage** | **Mitigation** |
|:---|:---|
| Browser GPU/device variability | asset budgets, 2D mode, quality presets, reference-device tests |
| 3D novelty may not improve learning | prototype/user testing; measure comprehension and teacher workload |
| Go adds language split | stable Make commands, generated contracts, clear module boundaries; reconsider only by ADR |
| Real-time state complexity | commands/events/signals/snapshots, bounded queues, sequence/reconnect tests |
| LiveKit self-hosting is operationally hard | managed pilot; adapter boundary |
| Live voice and AI can be expensive | push-to-talk, budgets, quotas, usage metrics, text fallback |
| PDF extraction/RAG can hallucinate | page-aware fixtures, server-validated citations, insufficient-evidence response |
| SearXNG is unreliable/untrusted | defer; optional adapter; visible citations and safety controls |
| Privacy with minors/voice/docs | minimization, consent, no default recording, retention/deletion, legal review |
| Microservice overengineering | modular monolith and extraction triggers |
| UE5 is not automatically compatible | language-neutral versioned contracts and coordinate fixtures |

## 24. Change-control rule

Any change to deployable boundaries, data ownership, public contracts, coordinates, privacy/retention, provider topology, security controls, testing gates, or deployment must update this design, relevant ADRs, historical docs, comments, diagrams, setup commands, and roadmap in the same PR. Stale architecture documentation is a defect.
