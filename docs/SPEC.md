# SPEC — Spatial Classroom Engine

This specification is **derived** from the existing repository documents because no specification was supplied. Every requirement below carries a provenance tag. `[DERIVED: <file> <section>]` means the requirement is traceable to that source. `[OPEN]` means only the human can answer it. Nothing here invents a feature, screen, provider, or number.

## 1. Purpose and audience

Spatial Classroom Engine turns a topic into a cinematic 3D lesson: a teacher avatar at a board, camera direction, gestures that land on the right spoken word, and demonstrations the learner can grab and manipulate, followed by Q&A and source-cited notes. [DERIVED: AGENTS.md §1.1]

The audience is a learner aged 16 or over. [DERIVED: AGENTS.md §1.13; docs/adr/0010-age-gate-and-audience-profile.md]

The generator is an offline pipeline; the performance is a deterministic player. [DERIVED: AGENTS.md §1.1]

## 2. Actors

- **Learner (16+)** — names a topic, watches the lesson, manipulates parameters, asks questions, and receives notes. [DERIVED: AGENTS.md §1.1, §1.13]
- **AI teacher** — a rendered teacher avatar driven by a validated cue sheet, not by live model output. [DERIVED: AGENTS.md §1.1, §1.7.2]
- **Deterministic engine** — resolves cue sheets into a timeline, performs the lesson, and recomputes simulation state from parameters. [DERIVED: AGENTS.md §1.1, §1.2; docs/TECHNICAL_DESIGN.md §10]

## 3. Locked product decisions as constraints

| ID | Constraint | Provenance |
|---|---|---|
| CON-1 | The AI composes; it does not perform. Model output may not contain timestamps, camera matrices, quaternions, or executable code. | [DERIVED: AGENTS.md §1.2] |
| CON-2 | A lesson is a versioned artefact (plan → scenes → cue sheets), replayable identically, testable without a browser, and renderable without a network. | [DERIVED: AGENTS.md §1.2] |
| CON-3 | `resolve(input: ResolveInput)` is pure: no I/O, no clock, no randomness. The player receives its clock. | [DERIVED: AGENTS.md §1.2; docs/TECHNICAL_DESIGN.md §10] |
| CON-4 | Research produces an immutable `EvidencePacket` before composition; the live tutor answers from that packet. | [DERIVED: AGENTS.md §1.2; docs/TECHNICAL_DESIGN.md §6] |
| CON-5 | Every displayed claim resolves to stored evidence. An unresolved citation is a hard failure. | [DERIVED: AGENTS.md §1.2] |
| CON-6 | Model output is never rendered as HTML or executed; only allow-listed primitives with schema-validated parameters are rendered. | [DERIVED: AGENTS.md §1.2; docs/TECHNICAL_DESIGN.md §9] |
| CON-7 | Interaction is simulation, not animation. A grabbed parameter changes simulation state; shadows are recomputed from the light. | [DERIVED: AGENTS.md §1.2] |
| CON-8 | No recording by default. Any recording is explicit, visible, and revocable. | [DERIVED: AGENTS.md §1.2; docs/adr/0012-no-video-export.md] |
| CON-9 | Video and audio analysis stay on the device; the server receives a signal, never media. | [DERIVED: AGENTS.md §1.2] |
| CON-10 | Autonomous moderation may pause, mute, and warn; permanent removal is a human action. | [DERIVED: AGENTS.md §1.2; docs/adr/0011-moderation-ladder.md] |
| CON-11 | No long-lived provider secret reaches the browser; keys live server-side. | [DERIVED: AGENTS.md §1.2; docs/TECHNICAL_DESIGN.md §20] |
| CON-12 | Essential actions work without WebGL, a microphone, or an AI provider; accessible DOM mode has feature parity. | [DERIVED: AGENTS.md §1.2] |
| CON-13 | No brand or franchise characters; only public-domain, historical, and original designs. | [DERIVED: AGENTS.md §1.2; docs/adr/0013-character-policy.md] |
| CON-14 | Every deferred capability has a named port; no speculative abstraction. | [DERIVED: AGENTS.md §1.2] |
| CON-15 | The product has a deliberate 16+ age gate and `AudienceProfile` is a first-class lesson parameter. | [DERIVED: AGENTS.md §1.13; docs/adr/0010-age-gate-and-audience-profile.md] |
| CON-16 | PostgreSQL is the single durable store; pgvector is a V2 addition. | [DERIVED: docs/adr/0014-postgresql-single-durable-store.md] |
| CON-17 | No video export; source-cited notes are the shareable artefact. | [DERIVED: docs/adr/0012-no-video-export.md] |
| CON-18 | Coordinates are metres, right-handed, +Y up, −Z forward, quaternion `[x,y,z,w]`. | [DERIVED: docs/adr/0007-coordinate-and-unit-convention.md] |

## 4. In-scope V1

V1 covers the session-to-lesson pipeline, deterministic playback, manipulable demonstrations, live questions grounded in the stored packet, notes, audience profile, moderation, and the 16+ gate. [DERIVED: docs/TECHNICAL_DESIGN.md §3.2, §15; AGENTS.md §1.1]

### 4.1 Lesson authoring

| ID | Requirement | Provenance |
|---|---|---|
| FR-1 | A session is created from a topic and an audience profile. | [DERIVED: docs/TECHNICAL_DESIGN.md §14] |
| FR-2 | Research turns the topic into an immutable `EvidencePacket`. | [DERIVED: docs/TECHNICAL_DESIGN.md §3.2, §6] |
| FR-3 | The planner turns the packet and `AudienceProfile` into a `LessonPlan`. | [DERIVED: docs/TECHNICAL_DESIGN.md §3.2, §7] |
| FR-4 | The composer turns a scene brief and relevant evidence into a `SceneSpec`. | [DERIVED: docs/TECHNICAL_DESIGN.md §3.2, §8.1] |
| FR-5 | The director turns a `SceneSpec` and the primitive registry into a `CueSheet`. | [DERIVED: docs/TECHNICAL_DESIGN.md §3.2, §8.2] |
| FR-6 | The validator returns a verdict for a `CueSheet` against the scene graph. | [DERIVED: docs/TECHNICAL_DESIGN.md §3.2, §9] |
| FR-7 | The builder is the only module that knows pipeline order; it persists each stage and emits progress. | [DERIVED: docs/TECHNICAL_DESIGN.md §3.2, §15] |
| FR-8 | The pipeline is one of `queued`, `researching`, `planning`, `composing`, `directing`, `validating`, `ready`, or `failed`. | [DERIVED: docs/TECHNICAL_DESIGN.md §15] |
| FR-9 | The API exposes session creation, build start, build events (SSE), lesson read, questions, notes, and moderation signals. | [DERIVED: docs/TECHNICAL_DESIGN.md §14] |

### 4.2 Evidence and citation

| ID | Requirement | Provenance |
|---|---|---|
| FR-10 | An `EvidencePacket` carries schema version, topic, research time, claims, sources, misconceptions, and unresolved items. | [DERIVED: docs/TECHNICAL_DESIGN.md §6] |
| FR-11 | A claim with empty `websiteRefs` cannot be used in a lesson. | [DERIVED: docs/TECHNICAL_DESIGN.md §6] |
| FR-12 | `unresolved` items are displayed honestly, not hidden. | [DERIVED: docs/TECHNICAL_DESIGN.md §6] |
| FR-13 | A citation ID that does not resolve is a hard failure, not a warning. | [DERIVED: AGENTS.md §1.2] |
| FR-14 | A packet is versioned; new research creates a new packet, and a built lesson keeps the version it used. | [DERIVED: docs/TECHNICAL_DESIGN.md §6] |

### 4.3 Timeline playback

| ID | Requirement | Provenance |
|---|---|---|
| FR-15 | `resolve(input: ResolveInput)` returns a `ResolveResult` carrying a `Timeline` with entries, duration and `approximateCueIds`. | [DERIVED: docs/TECHNICAL_DESIGN.md §10.1] |
| FR-16 | Every cue is either word-anchored (`utteranceId`, `wordIndex`) or explicitly offset. | [DERIVED: docs/TECHNICAL_DESIGN.md §8.2] |
| FR-17 | Missing word timings follow a documented fallback and mark the cue `approximate`. | [DERIVED: docs/TECHNICAL_DESIGN.md §10.2, §10.3] |
| FR-18 | The resolver enforces deixis and ordering rules and rejects violations. | [DERIVED: docs/TECHNICAL_DESIGN.md §10.4; AGENTS.md §1.7.2] |
| FR-19 | Worst-case drift is measured against a named budget and fails the build when exceeded. | [DERIVED: docs/TECHNICAL_DESIGN.md §10.3] |
| FR-20 | The player advances from an injected clock; tests use `ManualClock` and assert state at named instants. | [DERIVED: docs/TECHNICAL_DESIGN.md §10.5] |

### 4.4 Interaction and simulation

| ID | Requirement | Provenance |
|---|---|---|
| FR-21 | A manipulable exposes a named parameter with minimum, maximum, default, unit, and affordance. | [DERIVED: docs/TECHNICAL_DESIGN.md §8.1] |
| FR-22 | Grabbing a parameter changes simulation state; the render follows state, not a canned animation. | [DERIVED: AGENTS.md §1.2, §1.7.6] |
| FR-23 | Shadow length is derived from object height and sun elevation, and the render is the proof of the explanation. | [DERIVED: docs/TECHNICAL_DESIGN.md §12] |
| FR-24 | Two Earths in one frame share one light; a second key light means the explanation is wrong. | [DERIVED: docs/TECHNICAL_DESIGN.md §12.3] |

### 4.5 Live Q&A

| ID | Requirement | Provenance |
|---|---|---|
| FR-25 | A learner question returns an answer and a resume directive. | [DERIVED: docs/TECHNICAL_DESIGN.md §14] |
| FR-26 | The tutor reads only the packet attached to the lesson; it never searches mid-sentence. | [DERIVED: docs/TECHNICAL_DESIGN.md §6; AGENTS.md §1.2] |

### 4.6 Notes artefact

| ID | Requirement | Provenance |
|---|---|---|
| FR-27 | A lesson produces a `NoteArtifact` from the lesson and its evidence. | [DERIVED: docs/TECHNICAL_DESIGN.md §3.2, §14] |
| FR-28 | Notes are the shareable artefact; the product does not export video. | [DERIVED: docs/adr/0012-no-video-export.md] |

### 4.7 Audience profile

| ID | Requirement | Provenance |
|---|---|---|
| FR-29 | `AudienceProfile` is part of `LessonPlan` and drives planning and content selection. | [DERIVED: docs/TECHNICAL_DESIGN.md §7; docs/adr/0010-age-gate-and-audience-profile.md] |
| FR-30 | The 16+ age gate is deliberate and is not softened. | [DERIVED: AGENTS.md §1.13; docs/adr/0010-age-gate-and-audience-profile.md] |

### 4.8 Moderation

| ID | Requirement | Provenance |
|---|---|---|
| FR-31 | The server accepts moderation signals, never media. | [DERIVED: docs/TECHNICAL_DESIGN.md §14; AGENTS.md §1.2] |
| FR-32 | The moderation ladder may warn, mute, and pause autonomously; permanent removal is human-only. | [DERIVED: docs/adr/0011-moderation-ladder.md; docs/TECHNICAL_DESIGN.md §20] |
| FR-33 | Moderation actions are reversible and recorded with the level, signal, action, and reversibility. | [DERIVED: docs/TECHNICAL_DESIGN.md §13, §20] |

### 4.9 Age gate

| ID | Requirement | Provenance |
|---|---|---|
| FR-34 | The product is gated to 16+ and does not add features that assume minors without an explicit decision. | [DERIVED: AGENTS.md §1.13] |

## 5. Explicitly out of scope for V1

- Multiplayer and LiveKit media. [DERIVED: docs/TECHNICAL_DESIGN.md §3; AGENTS.md §1.2]
- PDF ingestion, materials, courses, enrollments, rooms, participants, publications, and pgvector retrieval. [DERIVED: docs/TECHNICAL_DESIGN.md §13.1; docs/adr/0014-postgresql-single-durable-store.md]
- Video export. [DERIVED: docs/adr/0012-no-video-export.md]
- Brand or franchise characters. [DERIVED: docs/adr/0013-character-policy.md]
- Kubernetes, multi-region, and self-hosted models. [DERIVED: docs/TECHNICAL_DESIGN.md §21]
- Any deferred capability without a named port. [DERIVED: AGENTS.md §1.2]

## 6. Non-functional requirements

| ID | Requirement | Provenance |
|---|---|---|
| NFR-1 | The interactive DOM shell is available before any heavy asset loads. | [DERIVED: docs/TECHNICAL_DESIGN.md §18; AGENTS.md §1.12] |
| NFR-2 | The reference device holds a 30 fps floor with a published quality preset for weaker hardware. | [DERIVED: AGENTS.md §1.12; docs/TECHNICAL_DESIGN.md §18] |
| NFR-3 | Classroom asset transfer is ≤ 10 MB compressed, the teacher avatar ≤ 5 MB, textures ≤ 2K unless ADR’d, and timeline tick cost ≤ 1 ms per frame. | [DERIVED: docs/TECHNICAL_DESIGN.md §18] |
| NFR-4 | Essential actions exist in semantic DOM with feature parity; captions, transcript, visible focus, reduced motion, 200% zoom, ≥ 44 px targets, and non-spatial audio are required. | [DERIVED: docs/TECHNICAL_DESIGN.md §19; AGENTS.md §1.12] |
| NFR-5 | UI work is reviewed against WCAG 2.2 AA before review sign-off. | [DERIVED: AGENTS.md §1.12] |
| NFR-6 | Secrets stay server-side; logs carry correlation IDs and not content; outbound fetch is allowlisted and private ranges are blocked. | [DERIVED: docs/TECHNICAL_DESIGN.md §20; AGENTS.md §1.13] |
| NFR-7 | Every generated artefact records its model, prompt version, and cost; per-session budgets are enforced server-side with hard stops. | [DERIVED: AGENTS.md §1.13; docs/TECHNICAL_DESIGN.md §17] |
| NFR-8 | Approximate per-lesson cost is $0.10–$0.50 under the documented stage model. | [DERIVED: docs/TECHNICAL_DESIGN.md §17] |
| NFR-9 | The resolver, scene package, and player are testable under plain Node with no DOM, network, or wall clock. | [DERIVED: AGENTS.md §1.2, §1.10.4; docs/TECHNICAL_DESIGN.md §4] |
| NFR-10 | The application is TypeScript; evaluation tooling is Python; the harness is not yet implemented. | [DERIVED: docs/adr/0009-typescript-app-python-eval-harness.md] |

## 7. Evaluation criteria

| ID | Criterion | Provenance |
|---|---|---|
| EVAL-1 | Tier 0 Contract runs every commit and catches malformed artefacts, unknown primitives, missing anchors, and parameter bounds. | [DERIVED: docs/TECHNICAL_DESIGN.md §16] |
| EVAL-2 | Tier 1 Determinism runs every commit and catches timing drift, ordering violations, and replay divergence. | [DERIVED: docs/TECHNICAL_DESIGN.md §16] |
| EVAL-3 | Tier 2 Physics runs every commit and catches shadow/angle invariants, orbit positions, and scale-transition geometry. | [DERIVED: docs/TECHNICAL_DESIGN.md §16] |
| EVAL-4 | Tier 3 Grounding runs nightly and catches unsupported claims and unresolved citations. | [DERIVED: docs/TECHNICAL_DESIGN.md §16] |
| EVAL-5 | Tier 4 Judge runs nightly for arc quality, level appropriateness, deixis quality, and one-idea-per-shot. | [DERIVED: docs/TECHNICAL_DESIGN.md §16] |
| EVAL-6 | Tier 5 Red team runs weekly and at release for jailbreak, injection, unsafe content, and persona drift. | [DERIVED: docs/TECHNICAL_DESIGN.md §16] |
| EVAL-7 | Tier 6 Regression corpus runs at release for silent quality decay across model upgrades. | [DERIVED: docs/TECHNICAL_DESIGN.md §16] |
| EVAL-8 | Tier 7 Human calibration runs at release and measures judge-vs-human agreement. | [DERIVED: docs/TECHNICAL_DESIGN.md §16] |
| EVAL-9 | A judge-only gate is never the sole evidence for a release claim. | [DERIVED: docs/TECHNICAL_DESIGN.md §16.1] |

## 8. Open questions

OPEN-7 is resolved. Every other item carries the phase it was deferred to, so a later session does not ask again. No item below is answered here.

| ID | Question | Provenance |
|---|---|---|
| OPEN-1 | [OPEN] Which free TTS reliably returns word boundaries? — **Deferred to:** P2, consumed in P3. | [DERIVED: AGENTS.md §1.19] |
| OPEN-2 | [OPEN] What is the timing-drift ceiling in milliseconds? — **Deferred to:** P3. | [DERIVED: AGENTS.md §1.19; docs/TECHNICAL_DESIGN.md §10.3] |
| OPEN-3 | [OPEN] Which three teacher personas launch, and who writes their voice and register? — **Deferred to:** P4. | [DERIVED: AGENTS.md §1.19] |
| OPEN-4 | [OPEN] Does V1 include live web search or only curated knowledge? — **Deferred to:** P2. | [DERIVED: AGENTS.md §1.19] |
| OPEN-5 | [OPEN] What is the retention window for anonymous sessions and generated lessons? — **Deferred to:** P6. | [DERIVED: AGENTS.md §1.19] |
| OPEN-6 | [OPEN] What is the product name and domain? — **Deferred to:** P7. | [DERIVED: AGENTS.md §1.19] |
| OPEN-7 | **Resolved** — who signs off the asset contract before custom art work begins: the human signed the ten v1 anchor names on 2026-11-27. | [DERIVED: docs/ROADMAP.md P1 "Frozen decisions (human, 2026-11-27)"] |
| OPEN-8 | [OPEN] Does hand tracking ship enabled or behind a flag? — **Deferred to:** P3/P4. | [DERIVED: AGENTS.md §1.19] |
| OPEN-9 | [OPEN] Why is the evaluation harness Python rather than TypeScript? — **Deferred to:** P5. | [DERIVED: docs/adr/0009-typescript-app-python-eval-harness.md] |
| OPEN-10 | [OPEN] Where does the Python harness live, what version, and how is it run in CI? — **Deferred to:** P5. | [DERIVED: docs/adr/0009-typescript-app-python-eval-harness.md] |
| OPEN-11 | [OPEN] What is the reference device for the 30 fps floor? — **Deferred to:** P6. | [DERIVED: docs/TECHNICAL_DESIGN.md §18] |
| OPEN-12 | [OPEN] What is the published time-to-playable target? — **Deferred to:** P6, measured from P2. | [DERIVED: docs/TECHNICAL_DESIGN.md §18] |
| OPEN-13 | [OPEN] What is the exact hard per-session cost ceiling? — **Deferred to:** P6 enforced, P2 ledger. | [DERIVED: docs/TECHNICAL_DESIGN.md §17] |
| OPEN-14 | [OPEN] Which evaluation tiers from `docs/TECHNICAL_DESIGN.md` §16 does the Python harness cover first? — **Deferred to:** P5. | [DERIVED: docs/adr/0009-typescript-app-python-eval-harness.md] |
