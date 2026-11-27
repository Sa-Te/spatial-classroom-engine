# ROADMAP

> **DERIVED ROADMAP.** This roadmap is derived from `AGENTS.md`, `docs/TECHNICAL_DESIGN.md`, and `docs/adr/`. It is not a supplied plan. **Human sign-off is required before any P1 task may be added to `docs/TASKS.md`.** P1 is agreed (human, 2026-11-27); every phase beyond P1 is `status: not-started`, `agreed: pending-human`.

Phases are ordered by dependency. Each phase has a definition of done and a scope-cut rule: if a phase exceeds twice its effort estimate, cut scope — never extend the phase.

## P0 — Foundation

**Status:** complete  
**Agreed:** human  
**Objective:** a clean clone runs web and server, health endpoints report correctly, database-backed readiness is proven, and CI is green on a real PR.

**Closure:** Setup closed with merge commit history preserved; the pull request policy in `AGENTS.md` governs every later phase.

**In scope**
- pnpm workspace, TypeScript, Next.js web, Fastify server, shared `@sce/contracts`.
- PostgreSQL with Drizzle migrations and `/health/live` + `/health/ready`.
- CI check/test/build and the verified setup document.
- Canonical documentation, agent configuration, and project skills.

**Out of scope**
- Any P1 feature, lesson model, timeline resolver, or scene runtime.
- Multiplayer, media, PDF ingestion, video export, or brand assets.

**Dependencies:** none.

**Definition of done**
1. `pnpm install --frozen-lockfile` succeeds from a clean clone.
2. `pnpm dev` starts web on 3000 and server on 8081.
3. `curl -i http://localhost:8081/health/live` returns 200 with `{"status":"ok"}`.
4. `/health/ready` returns 200 only when PostgreSQL is reachable, and 503 when it is stopped.
5. `pnpm verify` exits 0.
6. `.github/workflows/ci.yml` passes on a real PR.
7. `docs/SETUP_AND_VERIFY.md` §17 verification matrix is satisfied except rows that belong to later phases.
8. ADR 0001 and ADR 0014 are present and link from the technical design.

**Evidence required to exit:** the command output for items 1–5, the GitHub Actions run URL for item 6, and a clean `git status` for the setup commit.

**Scope-cut rule:** if setup work expands, cut documentation polish and non-blocking CI caching first; never cut the health/readiness separation, the migration proof, or the fresh-clone check.

## P1 — Contracts and pure core

**Status:** agreed  
**Agreed:** human, 2026-11-27  
**Objective:** freeze the shapes and pure logic that every later phase depends on: contracts, timeline resolution, scene graph, anchors, primitive registry, and the clock port.

### Frozen decisions (human, 2026-11-27)

Signed off with P1. These are decided. A later phase does not re-open them, does not soften them, and does not re-litigate them with alternatives. Reversing one requires an ADR that supersedes this record.

| ID | Decision |
| --- | --- |
| Q1 | PrimitiveId is a closed union of the 9 core primitive ids only. Deferred ids are absent from the type. |
| Q2 | Primitive id strings are dotted, for example teacher.point. |
| Q3 | Cue.params is a discriminated union keyed on primitive id. ADR 0016 and TECHNICAL_DESIGN section 8.2 change in the same pull request as the code. |
| Q4 | The camera framing enum is exactly: wideSideProfile, mediumFront, closeUpFace, wideHighAngle, overShoulderBoard. |
| Q5 | sunSide is dropped. It is derived from keyFromSun. |
| Q6 | WordTiming is { word: string; startMs: number; endMs: number }. wordIndex is the array position and is never stored. |
| Q7 | camera pushIn.from/to, pullOut.to and cut.to are deferred to P3. |
| Q8 | The validator rejects a camera.* primitive id on a teacher track. |
| Q9 | scene.setParam takes effect at atMs and holds until the next cue touching the same parameter. A second setParam inside that window with no intervening animateParam is rejected. |
| Q10 | Manipulable.parameter is a closed set of axisTiltDeg, orbitSpeed and sunElevationDeg. A scene declares which of them it exposes. |
| Q11 | light.keyFromSun accepts 1 to 90 inclusive and rejects 0. The shadow clamp constant belongs to the P3 physics helper and is documented there. |
| Q12 | camera.orbitArc.degrees sign convention and bound are deferred to P3. |
| S1 | P1 asserts entriesDueAt(timeline, atMs) over resolved entries, not world state. The world.teacher.pointTarget assertion belongs to P3. |
| S2 | P1 keeps src-only package exports. Package builds become the first P2 task. |
| OPEN-7 | The ten anchor names are signed as the v1 asset contract: sun, earth, earth.axis, earth.patch, teacher.root, teacher.hand.left, teacher.hand.right, teacher.eyes, learner.camera, board.surface. Rig, clip and LOD conventions are deferred to P3. |
| PR policy | "One phase per pull request" means never mix two phases in one pull request. Within P1, one task per pull request, unless two adjacent tasks cannot be split because they change the same file's public shape in the same step — then the reason is stated in the pull-request body. Every pull request states its own revert story. |
| T4-Q1 | SceneObject in P1 is a thin envelope: id and kind. Per-kind payload (radius, endpoints, text, image reference) lands in P3 with the renderer that consumes it. |
| T4-Q2 | light.keyFromSun owns sunElevationDeg. LightSpec carries identity only. The design must not have two authoring sites for one number. |
| T4-Q3 | The anchors schema accepts any non-empty string array. Unknown anchor names are rejected at scene-graph load in T14, not by the schema, because a schema could only pin the signed ten if every scene used all ten. |
| T4-Q4 | Manipulable.unit is a non-empty string, not a closed enum. Its three values in use are not pinned in tests because the design never states the unit of orbitSpeed. |
| T4-shape | SceneObject, LightSpec and Manipulable are strict schemas: an unknown key is a parse failure, so absence of a field is testable. Relaxing strictness later requires an ADR. |
| T4-units | Vec3 and src/units.ts move from T4 to T14, where an anchor transform first consumes them. |
| ADR-renumber | ADR 0015 records the minimal scene-identity decision. The discriminated-union change to Cue.params becomes ADR 0016 at T6. |

The ten anchor names in OPEN-7 are frozen because renaming an anchor is a breaking change requiring an ADR (`AGENTS.md` §1.7.3; `docs/TECHNICAL_DESIGN.md` §11), so signing them now costs nothing and prevents an invented set later.

Q7 and Q12 are deliberately unanswered. They are deferred scope, not decisions, and a later phase must not treat them as settled.

Amended 2026-11-27 after T1: T1 shipped as its own pull request (`3e977bd`), not inside a bundled first pull request. The six-pull-request sketch in the original sign-off is superseded by the one-task-per-pull-request rule above. The phase scope and every definition of done are unchanged.

`LessonPlan` gains `topic: TopicRef` at T6 under ADR 0016, together with the discriminated-union change to `Cue.params`. Until T6 the current shape — `evidencePacketId` and no `topic` — is not final.

**In scope**
- Zod schemas and inferred types in `packages/contracts` for `EvidencePacket`, `LessonPlan`, `SceneSpec`, `CueSheet`, `PrimitiveId`, and API error shapes. [DERIVED: docs/TECHNICAL_DESIGN.md §5, §6, §7, §8, §9, §14]
- Pure `packages/timeline`: `Clock`, `resolveTimeline`, `Timeline`, `TimelineEntry`, ordering rules, and drift reporting. [DERIVED: docs/TECHNICAL_DESIGN.md §10; docs/adr/0003-pure-timeline-resolver.md]
- Pure `packages/scene`: scene graph, anchors, primitive registry, validators, and physics helpers. [DERIVED: docs/TECHNICAL_DESIGN.md §4, §9, §11, §12]
- Coordinate and unit convention from ADR 0007.
- Provider ports and deterministic mocks from ADR 0008 where a later phase needs them.

**Out of scope**
- The server pipeline, React UI, player, camera director, and lesson content.
- Any provider implementation beyond a mock.
- Any primitive not needed by the first golden scene.

**Dependencies:** P0.

**Definition of done**
1. `packages/contracts` exports the schemas in the technical design, and `pnpm typecheck` passes.
2. `resolveTimeline` is pure: no `Date.now()`, `performance.now()`, `fetch`, `fs`, or randomness in `packages/timeline`.
3. A `ManualClock` test proves two reads without advancement are equal and advancing by 500 returns exactly 500 more.
4. A resolver test asserts state at three named instants and a negative case for a missing anchor, unknown primitive, NaN/Infinity, and out-of-order word timings.
5. `packages/timeline` and `packages/scene` tests run under plain Node with no jsdom; `pnpm test` passes.
6. ADR 0003, 0004, 0006, 0007, and 0008 are present and accepted.
7. `docs/TECHNICAL_DESIGN.md` §4–§11 reflects the shipped contracts.

**Evidence required to exit:** `pnpm verify`, the named test files and test names, the purity check output, and links to the accepted ADRs.

**Scope-cut rule:** cut primitive coverage to the smallest set that supports one hand-authored reference scene; never cut purity, anchor validation, or the timeline contract.

## P2 — Lesson authoring pipeline

**Status:** not-started  
**Agreed:** pending-human  
**Objective:** turn a topic and audience profile into a persisted, validated lesson through the documented pipeline.

**In scope**
- Server modules: `session`, `research`, `planner`, `composer`, `director`, `validator`, `builder`, and `cost`. [DERIVED: docs/TECHNICAL_DESIGN.md §3.2]
- Immutable `EvidencePacket` creation and versioning. [DERIVED: docs/TECHNICAL_DESIGN.md §6]
- `LessonPlan`, `SceneSpec`, and `CueSheet` production. [DERIVED: docs/TECHNICAL_DESIGN.md §7, §8]
- Pipeline states and progress events. [DERIVED: docs/TECHNICAL_DESIGN.md §15]
- Session/build/lesson HTTP endpoints and typed errors. [DERIVED: docs/TECHNICAL_DESIGN.md §14]
- Persistence in the tables named in the data model. [DERIVED: docs/TECHNICAL_DESIGN.md §13]

**Out of scope**
- The browser player, camera direction runtime, interaction, Q&A, notes, moderation, and release hardening.
- Live search beyond the chosen V1 answer to `OPEN-4`.
- Materials, PDF ingestion, courses, rooms, and pgvector.

**Dependencies:** P1.

**Definition of done**
1. Starting from a topic and `AudienceProfile`, a mock-provider run produces one `EvidencePacket`, one `LessonPlan`, one `SceneSpec` per scene, and one `CueSheet` per scene, persisted in PostgreSQL.
2. A claim with empty `websiteRefs` cannot enter a lesson, and an unresolved citation fails the build path.
3. The pipeline emits `queued`, `researching`, `planning`, `composing`, `directing`, `validating`, `ready`, or `failed`.
4. `POST /api/v1/sessions`, `POST /api/v1/sessions/:id/build`, `GET /api/v1/sessions/:id/build/events`, and `GET /api/v1/sessions/:id/lesson` have typed tests.
5. A failed validation names the scene, cue, and rule violated.
6. `pnpm test` and `pnpm verify` pass without a real provider key.
7. `docs/TECHNICAL_DESIGN.md` §13–§15 is updated if the pipeline order or persisted shapes change.

**Evidence required to exit:** a recorded mock-provider pipeline test, database rows for each artefact, SSE event capture, and `pnpm verify`.

**Scope-cut rule:** cut live search and non-essential progress events first; never cut the evidence packet, citation failure, persistence, or typed error shape.

## P3 — Deterministic playback and scene runtime

**Status:** not-started  
**Agreed:** pending-human  
**Objective:** perform a validated cue sheet deterministically in the browser, with camera direction, teacher deixis, manipulable parameters, and physics-derived shadows.

**In scope**
- Timeline player with injected clock. [DERIVED: docs/TECHNICAL_DESIGN.md §10.5]
- Camera director and the closed camera vocabulary. [DERIVED: AGENTS.md §1.7.4; docs/TECHNICAL_DESIGN.md §9]
- Teacher look-at and point constraints. [DERIVED: docs/TECHNICAL_DESIGN.md §11.1]
- Primitive executors and validators from the registry. [DERIVED: docs/TECHNICAL_DESIGN.md §9]
- Scene graph, anchors, one motivated light, shadow derivation, and manipulable parameters. [DERIVED: docs/TECHNICAL_DESIGN.md §11, §12]
- Semantic DOM fallback for essential actions. [DERIVED: AGENTS.md §1.12; docs/TECHNICAL_DESIGN.md §19]

**Out of scope**
- Generated use of `diveThrough` until the hand-authored reference implementation passes its golden tests. [DERIVED: AGENTS.md §1.7.4; docs/GOTCHAS.md §5.3]
- Multiplayer, media, and any V2 renderer.
- A general primitive framework beyond the registry.

**Dependencies:** P1 and P2.

**Definition of done**
1. A hand-authored golden lesson plays from the stored cue sheet and asserts state at the instants named in the fixture.
2. Worst-case drift is measured and fails the build when it exceeds the named budget.
3. A missing anchor and an unknown primitive are rejected with the anchor/cue identifier.
4. `teacher.lookAt(target)` precedes `teacher.point(target)` precedes the narration word that names the target, and the validator rejects a violation.
5. A manipulable parameter changes simulation state and the shadow recomputes from the light.
6. The `diveThrough` reference implementation passes golden tests before any generated scene may use it.
7. Essential actions exist in semantic DOM and the UI is reviewed against WCAG 2.2 AA before sign-off.
8. `pnpm verify` exits 0.

**Evidence required to exit:** golden test output, drift report, rejected-cue test output, the DOM fallback path, and the WCAG review note.

**Scope-cut rule:** cut camera and scene primitives not used by the golden lesson; keep lockOff, point, lookAt, one manipulable, one light, and the resolver/player contract.

## P4 — Tutor, notes, audience, moderation, and age gate

**Status:** not-started  
**Agreed:** pending-human  
**Objective:** complete the learner loop after playback: grounded questions, source-cited notes, audience-aware content, reversible moderation, and the 16+ gate.

**In scope**
- Tutor answer and resume directive from the attached packet. [DERIVED: docs/TECHNICAL_DESIGN.md §3.2, §14]
- Note artefact generation from lesson and evidence. [DERIVED: docs/TECHNICAL_DESIGN.md §3.2, §14]
- `AudienceProfile` and the 16+ gate. [DERIVED: docs/adr/0010-age-gate-and-audience-profile.md]
- Moderation signals with no media upload, and the reversible ladder. [DERIVED: docs/TECHNICAL_DESIGN.md §14, §20; docs/adr/0011-moderation-ladder.md]
- Cost ledger entries for each generated artefact. [DERIVED: docs/TECHNICAL_DESIGN.md §17]

**Out of scope**
- Permanent autonomous punishment.
- Uploaded media or client-side analysis upload.
- Video export.
- Multiplayer moderation.

**Dependencies:** P2 and P3.

**Definition of done**
1. A question is answered only from the lesson’s `EvidencePacket`, with a resume directive.
2. A citation ID that does not resolve produces a hard failure.
3. A lesson produces a note artefact whose claims resolve to stored evidence.
4. `AudienceProfile` changes are reflected in planning and content selection.
5. The 16+ gate is enforced and cannot be bypassed by a feature flag.
6. A moderation signal is accepted without media; the ladder warns, mutes, or pauses and never permanently removes.
7. Every generated artefact writes a cost-ledger row with model, prompt version, and cost.
8. `pnpm verify` exits 0.

**Evidence required to exit:** tutor/notes/moderation API tests, an unresolved-citation failure test, a cost-ledger assertion, and the 16+ gate test.

**Scope-cut rule:** cut persona variety and non-essential note styling first; never cut citation enforcement, the age gate, reversibility, or the cost row.

## P5 — Evaluation and quality gates

**Status:** not-started  
**Agreed:** pending-human  
**Objective:** make quality measurable before release through the documented evaluation tiers and human calibration.

**In scope**
- Tier 0 contract, Tier 1 determinism, and Tier 2 physics on every commit. [DERIVED: docs/TECHNICAL_DESIGN.md §16]
- Tier 3 grounding nightly and Tier 4 judge nightly. [DERIVED: docs/TECHNICAL_DESIGN.md §16]
- Tier 5 red team weekly and at release; Tier 6 regression at release; Tier 7 human calibration at release. [DERIVED: docs/TECHNICAL_DESIGN.md §16]
- Judge-vs-human agreement reporting. [DERIVED: docs/TECHNICAL_DESIGN.md §16.1]
- Python evaluation harness per ADR 0009.

**Out of scope**
- Treating a judge-only score as release evidence.
- A live production monitoring service beyond what the release phase adds.

**Dependencies:** P2, P3, and P4.

**Definition of done**
1. Tier 0–2 tests run in CI on every commit.
2. Tier 3–4 run on the documented nightly schedule.
3. Tier 5 runs weekly and at release; Tier 6 runs at release.
4. Tier 7 records judge-vs-human agreement and names the human calibration owner.
5. A failing tier blocks the release it gates.
6. The Python harness entry point, version, dependencies, and CI invocation are documented in ADR 0009.
7. `docs/TECHNICAL_DESIGN.md` §16 reflects the implemented tiers.

**Evidence required to exit:** CI/nightly run URLs, the harness command and output, the agreement report, and the red-team result.

**Scope-cut rule:** cut nightly breadth and persona variants first; keep contract, determinism, physics, grounding, and the human calibration check.

## P6 — Hardening: security, privacy, cost, accessibility, performance

**Status:** not-started  
**Agreed:** pending-human  
**Objective:** close the non-functional gaps that would make a public lesson unsafe, inaccessible, too slow, or too expensive.

**In scope**
- Secret handling, SSRF allowlist, log-content rules, and cross-session ownership. [DERIVED: docs/TECHNICAL_DESIGN.md §20; AGENTS.md §1.13]
- Per-session cost ceiling, repair retry bound, and cost ledger. [DERIVED: docs/TECHNICAL_DESIGN.md §17]
- Performance budgets and reference-device measurement. [DERIVED: docs/TECHNICAL_DESIGN.md §18]
- Accessibility contract and WCAG 2.2 AA review. [DERIVED: docs/TECHNICAL_DESIGN.md §19; AGENTS.md §1.12]
- Retention and deletion proof for stored data. [DERIVED: docs/TECHNICAL_DESIGN.md §13.1]

**Out of scope**
- New product capabilities.
- Kubernetes, multi-region, and self-hosted models. [DERIVED: docs/TECHNICAL_DESIGN.md §21]
- Uploads and PDF ingestion, which remain V2.

**Dependencies:** P3, P4, and P5.

**Definition of done**
1. No provider key exists in a client bundle or log.
2. Outbound fetch tests block private/link-local ranges and re-validate redirects.
3. A per-session cost ceiling stops a run at the documented hard limit.
4. The reference device meets the 30 fps floor and the documented asset budgets, or the published quality preset is used.
5. The accessibility checklist is passed, including keyboard path, captions, reduced motion, 200% zoom, and 44 px targets.
6. Retention is explicit per table and a deletion test proves it.
7. `pnpm verify` exits 0.

**Evidence required to exit:** security test output, cost-stop test, performance trace, accessibility review, retention test, and `pnpm verify`.

**Scope-cut rule:** cut optional quality presets and non-critical telemetry first; never cut secret handling, cost stops, captions, or deletion proof.

## P7 — Deploy and first public release

**Status:** not-started  
**Agreed:** pending-human  
**Objective:** put the hardened product on the first public release shape and prove a fresh deployment.

**In scope**
- Deployment evolution from local to the first public release. [DERIVED: docs/TECHNICAL_DESIGN.md §21]
- CI gate, managed PostgreSQL, object storage only if required by the chosen release shape, and monitoring. [DERIVED: docs/TECHNICAL_DESIGN.md §21]
- Release notes, version bump, and the human release gate. [DERIVED: AGENTS.md §1.16]
- A fresh-clone deployment check.

**Out of scope**
- Kubernetes, multi-region, and self-hosted models. [DERIVED: docs/TECHNICAL_DESIGN.md §21]
- Any feature not already accepted in P1–P6.

**Dependencies:** P5 and P6.

**Definition of done**
1. A clean clone deploys with the documented environment variables and a managed PostgreSQL instance.
2. CI is green on the release commit and the release branch is protected.
3. `/health/live` and `/health/ready` behave correctly in the deployed environment.
4. A real lesson completes end to end with grounded citations and notes.
5. Monitoring and a rollback path are documented and exercised once.
6. Release notes state the version, scope, and known limitations.
7. The human release gate is recorded, the release version is decided, and the setup tag remains on the setup-complete commit.

**Evidence required to exit:** deployment URL, CI run, health output, end-to-end lesson record, rollback note, release notes, and the tag object.

**Scope-cut rule:** cut monitoring breadth and non-essential deployment automation first; never cut health checks, rollback, the end-to-end lesson, or the human release gate.
