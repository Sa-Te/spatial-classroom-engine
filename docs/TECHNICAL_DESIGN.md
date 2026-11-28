# TECHNICAL_DESIGN.md

**Repository destination:** `/docs/TECHNICAL_DESIGN.md` — repository root; architecture, contracts, data model, and evaluations.

**Companion documents:** [AGENTS.md](../AGENTS.md) — rules and invariants, [GOTCHAS.md](GOTCHAS.md) — known traps, [SETUP_AND_VERIFY.md](SETUP_AND_VERIFY.md) — machine setup and verification

Changes to boundaries, contracts, coordinates, retention, provider topology, or evaluation gates require an update here **and** an ADR, in the same pull request.

## 2  The one decision everything follows from

*“**AI composes. A deterministic engine performs. The learner manipulates real parameters, not playback.**”*

Three consequences, and every section below is downstream of them:

1. **Timing is not generated.** A model chooses which primitive to use and which word to anchor it to. A pure function converts that into milliseconds.

2. **Grounding happens before the lesson exists.** Research produces an immutable evidence packet; composing, directing, and live answering all read from it.

3. **Interaction targets simulation state.** Grabbing the Earth changes an axis angle; shadows are recomputed from the light.

## 3  Layered architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│ Browser                                                          │
│  ├─ Semantic DOM shell (accessible, feature-complete)            │
│  ├─ three.js scene graph  +  deterministic timeline player        │
│  ├─ Camera director (closed vocabulary)                          │
│  ├─ Webcam tile  +  in-browser hand / pose / noise detection      │
│  ├─ Web Audio: TTS playback, visemes, noise meter                 │
│  └─ Pointer + hand interaction on named parameters                │
└───────────┬──────────────────────────────────┬───────────────────┘
            │ HTTPS / SSE / JSON               │ (V2) WebRTC
            ▼                                  ▼
┌───────────────────────────────────┐   ┌──────────────────────┐
│ apps/server — Fastify (TypeScript) │   │ (V2) LiveKit SFU     │
│  modules/                          │   │  media + spatial     │
│   ├ session      audience profile  │   └──────────────────────┘
│   ├ research     → EvidencePacket  │
│   ├ planner      → LessonPlan      │
│   ├ composer     → SceneSpec[]     │
│   ├ director     → CueSheet[]      │
│   ├ validator    → Verdict         │
│   ├ builder      → Lesson (ready)  │
│   ├ tutor        → Answer          │
│   ├ notes        → NoteArtifact    │
│   ├ moderation   → LadderDecision  │
│   └ cost         → ledger          │
│  platform/  (the only place adapters live)                        │
│   ├ llm/{mock, openai-compatible}                                 │
│   ├ tts/{mock, edge}                                              │
│   ├ stt/{browser, mock}                                           │
│   ├ search/{mock, curated, searxng}                               │
│   └ storage/{local, s3}                                           │
└───────────┬──────────────────────────────────────────────────────┘
            ▼
      PostgreSQL 16 (+ pgvector in V2)
```

### 3.1  Why a modular monolith

Solo developer, one migration chain, one log stream, one deploy target, £0 budget. Extraction stays possible because the **interfaces** are clean, not because the processes are separate.

### 3.2  Module boundaries

Each module exposes an application interface and owns its own data access. Cross-module database reads are a defect unless documented in an ADR.

```text
session    → who is learning, at what calibration, with what budgets
research   → topic → EvidencePacket
planner    → EvidencePacket + AudienceProfile → LessonPlan | CoursePlan
composer   → one scene's spec + relevant evidence → SceneSpec
director   → SceneSpec + registry → CueSheet
validator  → CueSheet + scene graph → Verdict
builder    → orchestrates the pipeline, persists, emits progress
tutor      → learner utterance + packet + position → Answer + resume directive
notes      → Lesson + evidence → NoteArtifact
moderation → signals + sensitivity profile → ladder decision
```

The **builder** is the only module that knows the pipeline order. Every other module takes typed input and returns typed output, which is what makes each one independently testable.

## 4  Packages with no dependencies

Two pure packages carry all the hard logic. They import nothing from React, the DOM, the network, or the database.

| **Package** | **Contains** | **Rule** |
| --- | --- | --- |
| @sce/timeline | cue resolution, clock port, player, camera interpolation | pure; clock injected; no Date.now() |
| @sce/scene | scene graph, anchors, primitive registry, validators, physics helpers | pure; deterministic |

**Purity is a testable property, not a style preference.** Both packages must run under plain node with no jsdom. If a test needs a DOM to exercise the resolver, the resolver has drifted.

## 5  Ports

Domain and application code never import an SDK. Each port has at least one real adapter and one deterministic mock.

```ts
export interface LlmProvider {
  complete<T>(req: LlmRequest, schema: ZodType<T>, signal?: AbortSignal): Promise<T>;
}

export interface TtsProvider {
  synthesise(req: { text: string; voiceId: string; style?: TtsStyle }): Promise<Utterance>;
}

export interface SttProvider {
  transcribe(req: { audio: AudioRef; language?: string }): Promise<{ text: string; confidence: number }>;
}

export interface SearchProvider {
  search(req: { query: string; limit: number }): Promise<SearchResult[]>;
}

export interface StorageProvider {
  put(object: { key: string; bytes: Uint8Array; contentType: string }): Promise<ObjectRef>;
  get(ref: ObjectRef): Promise<Uint8Array>;
  delete(ref: ObjectRef): Promise<void>;
}

/** V2 seams — declared now, implemented later. */
export interface DocumentExtractor { extract(ref: ObjectRef): Promise<ExtractedPage[]>; }
export interface Retriever { retrieve(q: RetrievalQuery): Promise<Evidence[]>; }
export interface MediaProvider { issueToken(join: JoinRequest): Promise<MediaToken>; }
export interface CharacterProvider { load(characterId: string): Promise<CharacterBundle>; }
export interface LessonRenderer { render(lesson: Lesson): Promise<{ bytes: Uint8Array }>; }
```

TtsProvider returns an Utterance whose word timings are **optional in the type**, so the “no timestamps” case is something the resolver must handle explicitly rather than a silent zero.

## 6  The evidence packet

The frozen, cited truth a lesson is built from. Immutable once used.

```ts
export interface EvidencePacket {
  schemaVersion: 1;
  id: string;
  topic: TopicRef;
  researchedAt: string;              // ISO 8601
  claims: Claim[];
  sources: Source[];
  misconceptions: Misconception[];   // candidate wrong beliefs to overturn
  unresolved: string[];              // what could NOT be verified — shown honestly
}

export interface Claim {
  id: string;                        // "c1"
  text: string;                      // "Earth is ~147.1 million km from the Sun in early January"
  numericValue?: number;
  unit?: "km" | "deg" | "percent" | "s";
  websiteRefs: string[];             // must be non-empty
  confidence: "verified" | "single-source" | "contested";
}

export interface Source {
  id: string;                        // "s1"
  url: string;                       // absolute URL
  title: string;
  publisher: string;
  retrievedAt: string;               // ISO 8601
  excerpt: string;                   // the sentence the claim came from
  licence?: string;
}

export interface TopicRef {
  id: string;
  rawText: string;                   // the learner's words, echoed back by the lesson
}

export interface Misconception {
  id: string;                        // "m1"
  text: string;                      // "Seasons are caused by distance from the Sun"
  correctedByClaimIds: string[];     // claim ids that overturn it
}
```

**Rules**

- A Claim with an empty websiteRefs cannot be used in a lesson.

- unresolved is displayed, not hidden. “I could not verify X” is a feature.

- A packet is versioned. New research creates a new packet; a built lesson keeps the version it used.

- The tutor answering a live question reads only from the packet attached to the lesson.

## 7  Lesson plan

```ts
export interface LessonPlan {
  schemaVersion: 1;
  id: string;
  evidencePacketId: string;
  topic: TopicRef;                   // §6's TopicRef; the lesson states its own topic
  audience: AudienceProfile;
  title: string;
  objective: string;                 // one sentence the learner should be able to say afterwards
  estimatedMinutes: number;          // 5–7 or 8–12
  arc: { setup: string[]; confrontation: string[]; resolution: string[] };
  scenes: SceneBrief[];
  splitRationale?: string;           // present when this came from a CoursePlan split
}

export interface AudienceProfile {
  ageBand: "16+";                    // the only band; the age gate is deliberate
  readingLevel: "intro" | "intermediate" | "advanced";
  priorKnowledge: "none" | "some" | "strong";
  pace: "slower" | "standard" | "brisker";
}

export interface SceneBrief {
  index: number;
  idea: string;                      // exactly one
  misconception?: string;            // the wrong belief this scene overturns
  evidenceClaimIds: string[];        // what grounds it
  participation?: "watch" | "guess" | "do";
  durationTargetSec: number;         // 60–90
}
```

- `idea` carries exactly one idea. That is not expressible as a type, so it is a P2 validator obligation (the Tier 4 judge rubric in §16), not a schema constraint.

### 7.1  Course splitting

When scope exceeds one lesson, the planner emits a CoursePlan with named lessons and per-lesson coverage. The learner accepts the arc, picks one lesson, or starts from the beginning. Follow-up lessons inherit the same evidence packet unless explicitly re-researched.

## 8  Scene spec and cue sheet

### 8.1  SceneSpec — what is on screen

```ts
export interface SceneSpec {
  schemaVersion: 1;
  sceneId: string;
  anchors: string[];                 // must all exist in the scene graph
  objects: SceneObject[];            // spheres, lights, lines, labels, stills
  lights: LightSpec[];               // one key light, motivated bird
  manipulables: Manipulable[];       // named parameters the learner may change
}

export interface Manipulable {
  parameter: "axisTiltDeg" | "orbitSpeed" | "sunElevationDeg";
  min: number; max: number; default: number; unit: string;
  affordance: "grab" | "slider" | "both";
}

export interface SceneObject {
  id: string;                        // identity only in P1; per-kind payload lands in P3
  kind: "sphere" | "line" | "label" | "still";
}

export interface LightSpec {
  id: string;
  kind: "sun";
}
```

Elevation is cue-owned: `light.keyFromSun` is the single authoring site for `sunElevationDeg`, and `LightSpec` carries identity only (T4-Q2, ADR 0015).

What a learner's grab of `sunElevationDeg` does relative to the next `light.keyFromSun` cue is undecided: the cue sets the value, and whether a grab is an offset from it or a replacement is a P3 decision that the first executor must make explicit.

### 8.2  CueSheet — what happens, and when

```ts
export interface CueSheet {
  schemaVersion: 1;
  sceneId: string;
  utterances: UtteranceScript[];
  cues: Cue[];
}

export interface UtteranceScript {
  id: string;                        // "u4"
  text: string;
  voiceId: string;
  style?: { pace: "slow" | "normal"; emphasis?: string[] };
}

export interface CueBase {
  id: string;
  track: "camera" | "teacher" | "scene" | "board" | "light" | "learner" | "audio";
  at:
    | { utteranceId: string; wordIndex: number }   // word-anchored — preferred
    | { offsetMs: number };                        // explicit — allowed
  motivation?: string;               // required for camera primitives
}

// One branch per registry entry, keyed on the primitive id (ADR 0016).
// PrimitiveParams[Id] is z.infer of that entry's schema; no free-form record exists.
export type Cue = CueBase &
  { [Id in PrimitiveId]: { primitive: Id; params: PrimitiveParams<Id> } }[PrimitiveId];

export interface WordTiming {
  word: string;
  startMs: number;                   // milliseconds from utterance start
  endMs: number;                     // must be greater than startMs
}
```

**The LLM never produces `at.offsetMs` unless the cue is genuinely independent of speech** (a hold, a world event, a pre-roll). Word-anchored is the default and the reviewed form.

`primitive` is the closed nine-id set and `params` is keyed on it, so an unknown id and a parameter shape that does not match its primitive both fail at parse with the primitive named (T6B, ADR 0016).

### 8.3  A real fragment

```json
{
  "schemaVersion": 1,
  "sceneId": "hot-in-july/s4",
  "utterances": [
    { "id": "u4", "text": "Same sunlight, same amount. In July it lands steep and concentrated.", "voiceId": "teacher.maya" }
  ],
  "cues": [
    { "id": "c4.1", "track": "teacher", "primitive": "teacher.point",
      "params": { "hand": "right", "target": "earth.patch" },
      "at": { "utteranceId": "u4", "wordIndex": 2 } },
    { "id": "c4.2", "track": "camera", "primitive": "camera.lockOff",
      "params": { "framing": "wideSideProfile" },
      "at": { "utteranceId": "u4", "wordIndex": 0 },
      "motivation": "hold the frame so the two patches can be compared" }
  ]
}
```

## 9  Primitive registry

The closed set the AI may compose from. Each entry has a parameter schema, a validator, an executor, and a golden test. An unknown primitive is rejected — never approximated. In P1 the registry covers the nine core ids in the frozen decisions: their schemas and validators ship, their executors and golden tests land with the player in P3, and the deferred ids are absent from `PrimitiveId` rather than present and unvalidated.

| **Track** | **Primitive** | **Parameters** | **Validation** |
| --- | --- | --- | --- |
| camera | lockOff | framing | framing in enum; sunSide is derived from the key light (Q5), not authored |
| camera | pushIn | from, to, durationMs | durationMs > 0; ≤ 4000 |
| camera | orbitArc | degrees, durationMs, target | degrees ≠ 0; target is an anchor |
| camera | diveThrough | fromAnchor, toAnchor, swapObjectId | feature-flagged; reference implementation only |
| camera | pullOut | to, durationMs | durationMs > 0 |
| camera | cut | framing | instantaneous; no duration; `to` deferred to P3 (Q7) |
| teacher | lookAt | target | anchor exists; must precede point for the same target |
| teacher | point | hand, target | anchor exists |
| teacher | gesture | kind, intensity | kind in enum |
| teacher | turnToLearner | — | — |
| teacher | handOffObject | objectId | object is manipulable |
| scene | spawn | objectId, at | objectId in scene |
| scene | drawRing | aroundAnchor, radiusM | radiusM > 0 |
| scene | drawLine | from, to, style | both anchors exist |
| scene | setParam | parameter, value | inside declared range |
| scene | animateParam | parameter, from, to, durationMs | both in range |
| scene | freeze | target | — |
| scene | label | text, atAnchor, style | text ≤ 40 chars |
| light | keyFromSun | sunElevationDeg | 1–90 (Q11) |
| board | showStill | imageId, region? | image exists |
| board | highlightRegion | x, y, w, h | inside bounds |
| learner | enableGrab | objectId, parameter | parameter declared manipulable |
| learner | promptGesture | kind | — |
| learner | holdSilence | ms | 500–4000 |

**Growth rule:** a new primitive ships with schema, validator, executor, and a test that proves the validator rejects a bad parameter. Never add a primitive without its rejection case.

Scene-aware checks are not schema work. `scene.setParam` cannot verify a value against a scene's declared `Manipulable` range, and `learner.enableGrab` cannot verify that its parameter is declared or that its object exists: both need a scene graph and are T15 obligations. The window-overlap rule for a second `setParam` on one parameter is T12's.

## 10  Timeline resolution

### 10.1  The signature

```ts
export interface Clock { now(): number; }

export interface Timeline {
  entries: TimelineEntry[];
  durationMs: number;
  approximateCueIds: string[];
}

export interface ResolveInput {
  cueSheet: CueSheet;
  utterances: Record<string, UtteranceMeasurement>;
}

export function resolve(input: ResolveInput): ResolveResult;
```

Pure. No clock, no I/O, no randomness.

### 10.2  Algorithm

The speech arrives as one table keyed by utterance id, each entry that utterance's own measurement — the `resolve` input. There is no second, parallel map of word timings: two records describing one utterance only ever diverge.

```ts
interface UtteranceMeasurement {
  startMs: number; // where this utterance begins, on the lesson's single axis
  durationMs: number; // measured length; 0 when nothing was measured
  wordTimings: WordTiming[] | null; // utterance-relative (§8.2); null or [] means not measured
}

interface ResolveInput {
  cueSheet: CueSheet;
  utterances: Record<string, UtteranceMeasurement>;
}
```

```text
for each cue:
  if word-anchored:
     measurement = utterances[utteranceId]
     if measurement is absent      → TIMINGS_MISSING
     if wordTimings is non-empty   → atMs = measurement.startMs + wordTimings[wordIndex].startMs
                                     approximate: false
     if wordTimings is null or []  → atMs = the fallback formula (§10.3), approximate: true
  else → atMs = offsetMs
sort entries by atMs
reject or flag entries violating the ordering rules (§10.4)
durationMs = max(entry.atMs + entry.durationMs, last utterance end)
```

`WordTiming.startMs` is utterance-relative, so the exact path is `utterance.startMs + word.startMs`. T10's numbers (300, 1,400, 3,000) are unchanged because those utterances start at 0; the addition is proved by a test whose utterance starts at 10,000.

`TimelineEntry` and `Timeline` are adopted by instruction at T9 and completed at T10, not derived from this section. `Timeline` is `{ entries, durationMs, approximateCueIds }`: entries ordered by ascending `atMs`; `durationMs`, the lesson's length; and `approximateCueIds`, the cue ids whose `atMs` came from the fallback, in sorted-entry order, `[]` when every cue landed on a measured word. That list is what T13's drift report reads, so an approximate cue is reported as a known debt apart from an unmarked late cue, which is a bug. `TimelineEntry` is `{ cueId, atMs, primitive: PrimitiveId, track: "camera" | "teacher" | "scene" | "light" | "learner", durationMs, approximate }`. `durationMs` is an integer ≥ 0 read from the one parameter that carries a length — `scene.animateParam` → `params.durationMs`, `learner.holdSilence` → `params.ms` — and `0` for every instantaneous primitive. Entries come from the T9 sorter, one sorter only: stable, ascending `atMs`, no track tie-break. Tie-break precedence between different tracks at the same `atMs` is not part of the sorter; T12's ordering rules reject illegal sequences, and no track order is invented here. `timeline.durationMs` is the later of the latest `atMs + durationMs` and the end of the last utterance — `startMs + the last word's endMs` when that utterance has word timings, `startMs + durationMs` when only a duration was measured, `0` when neither — so a declared pause is part of the lesson's length rather than something the speech has to imply, and a lesson built entirely from the fallback is as long as the speech it was built from.

Adopted at T10: the resolver returns a discriminated `ResolveResult` rather than a bare `Timeline` — `{ ok: true; timeline: Timeline }` or `{ ok: false; problems: ReadonlyArray<{ cueId: string; code: ProblemCode; detail: string }> }`. It never throws on authored data and never returns `undefined`; a sheet that cannot be played is a typed rejection carrying every problem found. `ProblemCode` is closed at nine — the resolver's four below and the ordering rules' five (§10.4) — and lives in `packages/timeline`, because these name timeline behaviour and not a stored shape: `WORD_INDEX_OUT_OF_RANGE` (`wordIndex` below `0`, at/beyond the timing array's length, or on the fallback path beyond the script text's word count), `TIMINGS_MISSING` (the addressed utterance is absent, or has neither word timings nor a measured duration, or has no words to count), `TIMINGS_OUT_OF_ORDER` (a `startMs` that is not strictly greater than its predecessor's), `TIMINGS_OVERLAP` (a word's `endMs` beyond the next word's `startMs`). Only the timing arrays a cue actually references are validated, so an unused bad array is not that sheet's problem.

The spectre of an unmarked approximate cue is closed at the type level (T11): two constructors, not one constructor with a flag. `exactEntry` returns `TimelineEntry & { approximate: false }` and `approximateEntry` returns `TimelineEntry & { approximate: true }`, so the fallback path cannot produce an entry that a consumer would read as measured, and no boolean argument chooses the path. A test proves the typing with `expectTypeOf`, not only the runtime value.

`TimelineEntry.track` is the primitive's registry track, not the cue's declared `track`: the cue sheet also admits `board` and `audio`, which the entry does not, and the registry lookup is total over the closed nine. Track agreement is T12's `checkOrdering` rule (`TRACK_MISMATCH`, §10.4); it needs only the registry, not a scene graph.

### 10.3  Drift budget

Every resolved cue is compared against its intended position in the golden fixture:

```text
drift(cue) = |resolvedMs − intendedMs|
worstCaseDrift = max over all cues
```

A named budget (to be fixed at the first golden test) is enforced in CI. Exceeding it fails the build. **Drift is a first-class metric, not a warning.** Cues resolved via the fallback path are marked approximate and reported separately — an approximate cue is a known debt, an unmarked late cue is a bug.

The fallback formula is **adopted by instruction** at T11, because this design states no formula of its own:

```text
atMs = utterance.startMs + round((wordIndex / wordCount) * utterance.durationMs)
```

`wordCount` is the number of words in that utterance's `text`, split on whitespace — with `wordTimings: null` there is no other word count to use, and refusing to count the script would leave a measured utterance unplayable. `null` and an empty array both mean "no word timings"; a present, non-empty array is never routed to this formula, so `TIMINGS_OUT_OF_ORDER` and `TIMINGS_OVERLAP` still apply to it unchanged — a defect in measured timings is a reason to refuse, not a reason to fall back. `TIMINGS_MISSING` is returned only when the utterance has no word timings *and* no measured `durationMs`, or when its text has no words to count, and the cue id is named; `WORD_INDEX_OUT_OF_RANGE` covers an index past the script text's words on this path, as it does on the exact path. No path places a cue at `0` as a default: a zero-time entry looks like a measurement, which is the failure this rule exists to prevent. The entry the formula produces is constructed by `approximateEntry`, typed `approximate: true`, and listed in `Timeline.approximateCueIds` (§10.2) — the list this metric reads to report an approximate cue as a known debt rather than as drift.

### 10.4  Ordering rules, enforced by the resolver

§1.7.2's deixis order is the origin of the first two rules: `teacher.lookAt(t)` → `teacher.point(t)` → the narration word that names `t`. They are enforced by `checkOrdering` (T12), a second pure pass over the timeline `resolve` has already built:

```ts
export function checkOrdering(input: ResolveInput, timeline: Timeline): ResolveResult;
```

It consumes that timeline and returns the shared `ResolveResult` from `packages/timeline/src/result.ts` — `{ ok: true; timeline }` carrying the same object, or `{ ok: false; problems }`. It never calls `resolve`, never re-sorts the entries (§10.2 has the one sorter), never throws and never returns `undefined`. `ProblemCode` widens by the five ordering codes below, and `ResolutionProblem` gains one optional field, `rule`: the stable human-readable name of the rule that fired. `code` is the identifier tests assert on; `detail` names the cue and the numbers. Problems produced by `resolve` (§10.2) carry no `rule`.

| Code | `rule` | Rejected when |
| --- | --- | --- |
| `TRACK_MISMATCH` | cue track matches its primitive track | the cue's declared `track` differs from `primitiveRegistry[cue.primitive].track` |
| `POINT_WITHOUT_LOOKAT` | look at the target before pointing at it | a `teacher.point` on `t` at `T` has no `teacher.lookAt` on exactly the same `t` with `atMs <= T` |
| `POINT_AFTER_WORD` | point on or before the word that names the target | the point cue's own utterance says a word naming `t`, and that word starts strictly before `T` |
| `SETPARAM_OVERLAP` | an animateParam bridges two setParams on one parameter | two `scene.setParam` cues on one parameter have no `scene.animateParam` on it in `(earlier.atMs, later.atMs]` |
| `NON_CAMERA_IN_SILENCE` | only camera cues run during a silence | any non-camera entry other than the hold itself has `atMs` in `[T, T + ms)` of a `learner.holdSilence` |

Every problem names the offending cue — for `NON_CAMERA_IN_SILENCE` that is the cue inside the silence, not the hold — and the list is sorted ascending by the offending entry's `atMs`, then by `cueId`, so one sheet always reports one list in one order. No track precedence is applied: an illegal sequence is rejected, not reordered.

`TRACK_MISMATCH` is T12's alone. The cue sheet admits `board` and `audio`, which no primitive is on, and a cue whose label disagrees with its primitive would be routed to the wrong player group.

`POINT_WITHOUT_LOOKAT` requires exact target equality; a simultaneous `lookAt` on a different anchor never satisfies it. A `lookAt` at exactly `T` does.

`POINT_AFTER_WORD` reads the point cue's own utterance only, so another utterance's word cannot make this point late. The **naming form is adopted by instruction** at T12, because this design states none: take the anchor's last dotted segment, lowercase it, strip every non-letter character (`sun.Earth` → `earth`, `Earth,` → `earth`), and compare it to each word of that utterance normalised the same way. The naming word at exactly `T` passes — the comparison is strict. When the utterance has no word timings (absent, `null`, or an empty array), or no word names the anchor, the rule passes vacuously: with no measured word there is nothing to be late against, and guessing a word position is the fallback's job (§10.3), not this rule's.

`NON_CAMERA_IN_SILENCE` treats the silence as a closed-open window `[T, T + ms)`. **Both boundaries are adopted by instruction** at T12: a cue at exactly `T` is inside and is rejected; a cue at exactly `T + ms` is outside and passes. A `camera` cue inside passes, and the hold cue itself is excluded by id — it is a `learner` cue sitting at its own start.

Out of scope here, owned elsewhere: `scene.setParam` values are not checked against a scene's declared `Manipulable` range, anchor existence is not checked, and primitive membership of a scene is not checked — all three need a scene graph and are T15's. `camera.cut` invalidating an in-flight interpolation is player behaviour, P3 runtime, and not a property of the resolved timeline.

### 10.5  The player

```ts
export function createPlayer(timeline: Timeline, clock: Clock): Player;
// player.advance() is called each frame; entries whose atMs <= clock.now() fire once
```

Tests use a ManualClock and step frame by frame, asserting state at arbitrary instants:

```ts
clock.advance(12_400);
expect(world.teacher.pointTarget).toBe('earth.patch');
```

`ManualClock.advance(deltaMs)` advances by the delta and returns the new time in milliseconds. The example starts at zero, so advancing by 12,400 lands on the 12,400 ms instant.

## 11  Scene graph and anchors

```ts
export interface SceneGraph {
  anchors: Map<string, Anchor>;       // name → transform provider
  objects: Map<string, SceneObject>;
  manip: Map<string, Manipulable>;
}
```

**Anchor naming is a contract with the art pipeline.** Renaming one is a breaking change requiring an ADR.

| **Anchor** | **Meaning** |
| --- | --- |
| sun | key light position |
| earth | planet root |
| earth.axis | axis line endpoints |
| earth.patch | the lit surface patch under discussion |
| teacher.root | rig root |
| teacher.hand.left / .right | IK targets |
| teacher.eyes | for look-at solving |
| learner.camera | the viewer |
| board.surface | presentational plane |

### 11.1  Deixis mechanics

- lookAt solves a look-at constraint on the head/spine chain.

- point solves IK for the chosen hand toward the anchor, holding for the cue’s duration.

- Both are **procedural constraints**, not baked clips. A baked point cannot target a runtime anchor.

## 12  Physics rules

### 12.1  One motivated light

The sun is a single directional light. Its elevation is cue-owned by `light.keyFromSun` (§8.1, ADR 0015). **Shadow length is derived:**

```text
shadowLength = objectHeight / tan(sunElevationDeg × π / 180)
```

Clamped to avoid division blow-up near the horizon, and the clamp is documented in the code with its reason.

### 12.2  The consequence for content

If a lesson explains seasons, the shadow in shot 5 must be the shadow produced by the elevation the narration describes. **The render is the proof of the explanation.** A scene that fakes a shadow is a factual error with a nice picture.

### 12.3  Two instances, one light

July and January Earths share one light. If a scene needs two key lights to make its point, the point is wrong.

## 13  Data model

| **Table** | **Holds** | **Key columns** |
| --- | --- | --- |
| sessions | one learner’s visit | id, audience_profile jsonb, sensitivity jsonb, state, budget_tokens, created_at, expires_at |
| topics | what was asked | id, session_id, raw_text, normalised_intent, depth |
| evidence_packets | frozen research | id, topic_id, schema_version, researched_at, payload jsonb |
| lessons | built artefacts | id, session_id, evidence_packet_id, plan jsonb, status, duration_ms, version |
| scenes | per-scene records | id, lesson_id, index, idea, cue_sheet jsonb, scene_spec jsonb |
| utterances | narration + timings | id, scene_id, text, voice_id, audio_ref, word_timings jsonb |
| notes | end artefacts | id, lesson_id, payload jsonb, rendered_format, created_at |
| teachers | persona configs | id, display_name, archetype, voice_id, register_by_age jsonb, style, avatar_ref |
| venues | environments | id, asset_ref, lighting_rig jsonb, anchors jsonb |
| moderation_events | incidents | id, session_id, level, signal, action, reversible, created_at |
| cost_entries | spend | id, session_id, provider, model, units, estimated_cost, created_at |
| eval_runs | quality history | id, suite, tier, model, started_at, score jsonb |
| consents | acknowledgements | id, subject_id, purpose, version, granted_at, withdrawn_at |

### 13.1  Storage rules

- Never persist per-frame pose history.

- Evidence packets are append-only. Updating research creates a new version.

- Every generated artefact records the model, prompt version, and cost that produced it.

- Retention is explicit per table, and deletion is proved by a test, not by intention.

- V2 adds materials, material_pages, chunks (with vector(1536)), citations, courses, enrollments, rooms, participants, publications.

## 14  API surface

Base /api/v1. Typed errors only.

```text
GET    /health/live
GET    /health/ready
GET    /teachers
POST   /sessions                     { topic, audience }            → session
GET    /sessions/:id
POST   /sessions/:id/build            starts the pipeline           → job id
GET    /sessions/:id/build/events     SSE: progress + stage payloads
GET    /sessions/:id/lesson
POST   /sessions/:id/questions        { text, atMs }                → answer + resume
POST   /sessions/:id/notes            → note artefact
POST   /sessions/:id/signals          moderation signal (no media)
```

Error shape:

```json
{ "error": { "code": "EVIDENCE_UNRESOLVED", "message": "Two claims could not be verified.", "requestId": "…", "retryable": false } }
```

Codes are stable identifiers, not prose. Messages are user-facing and specific. No stack trace, SQL, or cross-session existence leakage.

## 15  Pipeline and progress

```text
queued → researching → planning → composing → directing → validating → ready
                                                            ↘ failed(code)
```

- Each stage persists its artefact before advancing, so a crash resumes rather than restarts.

- Progress events are plain language: *“Researching sources…”*, *“Building your lesson…”*, *“Animating scene 3 of 7…”*.

- A validation failure names the scene, the cue, and the rule violated.

- The job runner sits behind a JobQueue port: in-process now, swappable later. **No long-running work may depend on a request continuing to exist.**

## 16  Evaluation design

| **Tier** | **Runs** | **Cost** | **Catches** |
| --- | --- | --- | --- |
| 0 Contract | every commit | ~0 | malformed artefacts, unknown primitives, missing anchors, parameter bounds |
| 1 Determinism | every commit | ~0 | timing drift, ordering violations, replay divergence |
| 2 Physics | every commit | ~0 | shadow/angle invariants, orbit positions, scale-transition geometry |
| 3 Grounding | nightly | low | unsupported claims, unresolved citations, retrieval quality (V2) |
| 4 Judge | nightly | medium | arc quality, level appropriateness, deixis quality, one-idea-per-shot |
| 5 Red team | weekly + release | medium | jailbreak, injection via retrieved text, unsafe content, persona drift at turn 20 |
| 6 Regression corpus | release | medium | silent quality decay across model upgrades |
| 7 Human calibration | release | human | judge agreement — the honesty check on tier 4 |

### 16.1  The judge is an instrument

A judge model will confidently reward plausible garbage. Therefore:

- rubrics are concrete and anchored to labelled examples

- judge-vs-human agreement is measured and reported

- every score carries its reasoning so a human can audit it

- a judge-only gate is never the sole evidence for a release claim

### 16.2  Operable metrics

| **Dimension** | **Measured by** |
| --- | --- |
| Factual correctness | every claim resolves to evidence; sampled human review |
| Timing fidelity | worst-case resolved drift against budget |
| Deictic correctness | automated: point target equals the object the narration names |
| Pedagogical arc | judge rubric: misconception present, reveal present, participation present |
| Level appropriateness | judge rubric against AudienceProfile |
| Structure | one new element per shot; silence budget; shot count |
| Safety | red-team pass rate; zero tolerance categories |
| Cost | currency per lesson against ceiling |
| Latency | time-to-first-scene, time-to-playable |
| Accessibility | automated checks plus a scripted manual audit |

## 17  Cost model and controls

| **Stage** | **Approximate per lesson** |
| --- | --- |
| Research (LLM + search) | $0.02–0.10 |
| Plan + compose + direct | $0.05–0.25 |
| Critic pass | $0.02–0.08 |
| TTS | $0.00–0.05 |
| Notes | $0.01–0.03 |
| **Total** | **≈ $0.10–0.50** |

Controls: one repair retry then hard failure; per-session token ceiling enforced server-side; cheap models for repair and critic; cost ledger row per artefact; evidence-packet cache keyed on a privacy-safe hash of the topic.

## 18  Performance budgets

| **Budget** | **Target** | **Checked by** |
| --- | --- | --- |
| DOM shell interactive | before any heavy asset loads | manual + trace |
| Classroom asset transfer | ≤ 10 MB compressed | asset budget script |
| Teacher avatar | ≤ 5 MB | asset budget script |
| Texture | ≤ 2K unless ADR’d | asset budget script |
| Frame rate | ≥ 30 fps on the reference device | manual profile |
| Timeline tick cost | ≤ 1 ms per frame | benchmark test |
| Time to playable lesson | published target, measured per release | pipeline metric |

## 19  Accessibility contract

- Essential actions exist in semantic DOM with feature parity: ask, raise hand, mute, read transcript, read notes, leave, report.

- Captions for all speech; transcript always available.

- prefers-reduced-motion disables camera cuts, orbit animation, and any fast zoom.

- Live regions announce teacher speech and system state without flooding.

- Focus is visible, logical, and restored after dialogs and source viewers.

- Works at 200% zoom; touch targets ≥ 44 px.

- Spatial audio is never the only channel; when spatialisation is off, speech stays centred and intelligible.

- The no-camera and no-audio-monitoring paths are first-class, not degraded.

## 20  Security posture

| **Threat** | **Control** |
| --- | --- |
| Injection via retrieved content | evidence is a data block; tools are allowlisted; no instruction interpolation |
| Model output as executable | primitives only; no HTML, ever |
| SSRF on search/fetch | scheme + host allowlist, private-range block, redirect re-validation, timeout |
| Secret exposure | server-side only; no NEXT_PUBLIC_* key; masked in logs |
| Cost exhaustion | per-session ceiling, rate limits, hard stops, ledger |
| Cross-session access | unguessable ids; ownership check on every read and write |
| Moderation false positives | ladder, reversibility, sensitivity profile, human-only permanent removal |
| Supply chain | pinned deps, lockfile, advisory checks, dependency budget |

## 21  Deployment evolution

| **Stage** | **Shape** |
| --- | --- |
| Development | local: web, server, Postgres in Docker, Cloudflare Tunnel for sharing |
| First public release | free-tier container host + free-tier managed Postgres + CDN |
| First real users | paid containers, object storage, monitoring |
| Growth | queue service, object store, managed media, possible render workers |

Kubernetes, multi-region, and self-hosted models are **not** on the roadmap. They are options if measured need appears, behind an ADR.

## 22  ADR index

| **#** | **Decision** |
| --- | --- |
| 0001 | Open-source licence (Apache-2.0) |
| 0002 | Modular monolith over microservices |
| 0003 | The timeline resolver is a pure function with an injected clock |
| 0004 | Lesson is data: versioned cue sheets, not runtime improvisation |
| 0005 | Authoring-time grounding via immutable evidence packets |
| 0006 | Closed primitive registry with per-primitive validators |
| 0007 | Coordinate and unit convention (metres, right-handed, +Y up, −Z forward, quaternion [x,y,z,w]) |
| 0008 | Provider-neutral ports with mandatory mocks |
| 0009 | TypeScript application, Python evaluation harness |
| 0010 | 16+ age gate with audience profile as a first-class parameter |
| 0011 | Moderation ladder: autonomous warn/mute, human-only removal |
| 0012 | No video export; notes are the shareable artefact |
| 0013 | Character policy: public domain, historical, original only |
| 0014 | PostgreSQL as the single durable store; pgvector in V2 |

## 23  Change control

Any change to the following requires this document and an ADR in the same pull request:

- module boundaries or the pipeline order

- a public contract (EvidencePacket, LessonPlan, CueSheet, PrimitiveId, HTTP shapes)

- the coordinate convention or units

- provider topology (direct provider call vs proxied)

- retention, privacy, or moderation autonomy

- an evaluation gate or its threshold

- a new primitive, persona model, or venue model

Stale architecture documentation is a defect, not backlog.
