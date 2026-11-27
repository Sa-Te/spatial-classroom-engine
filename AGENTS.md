# AGENTS.md

**Repository destination:** `/AGENTS.md` — repository root; loaded by OpenCode on every turn.

**Companion documents:** [SETUP_AND_VERIFY.md](docs/SETUP_AND_VERIFY.md) — machine setup and verification, [TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md) — architecture, contracts, and evaluations, [GOTCHAS.md](docs/GOTCHAS.md) — known traps, [OPENCODE_SETUP.md](docs/OPENCODE_SETUP.md) — multi-agent configuration

Read this before every task. This is a contract, not a suggestion.
If a rule blocks you, say so and stop. Do not quietly work around it.

## 1.1  What this is

Spatial Classroom Engine turns a topic into a **cinematic 3D lesson**: a teacher avatar at a board, camera direction, gestures that land on the right spoken word, and demonstrations the learner can grab and manipulate — then a Q&A, then illustrated source-cited notes.

The generator is an offline pipeline. The performance is a deterministic player. Those are different systems with different rules, and confusing them is the single most expensive mistake available in this codebase.

**The one-sentence test for every change:**

*“A learner names a topic, a validated lesson plays with the teacher pointing at the right object on the right word, and the learner can grab the object and watch the physics respond — while every claim on screen traces to a stored source.”*

If a change makes that sentence less true, the change is wrong.

**Status:** pre-alpha. Foundation only. Nothing is stable and no public schema has been frozen.

## 1.2  Invariants — violating one means revert the change

These are not preferences. Each has a known failure attached.

1. **The AI composes; it does not perform.** No model output may contain a millisecond timestamp, a camera matrix, a quaternion, or executable code. The LLM emits intent in a fixed vocabulary; a pure resolver turns intent into time.

2. **The lesson is data.** A lesson is a versioned artefact (plan → scenes → cue sheets). It must be replayable identically, testable without a browser, and renderable without a network.

3. **The timeline resolver is pure.** resolveTimeline(cueSheet, wordTimings) → Timeline performs no I/O, reads no clock, uses no randomness. If it needs a clock, it takes it as an argument.

4. **The player is clock-injected.** Production uses performance.now(); tests use a ManualClock. Any code that calls Date.now() or performance.now() directly inside the engine is a defect.

5. **Grounding happens at authoring time.** Research produces an immutable EvidencePacket *before* a lesson is composed. The live tutor answers from that packet. It never searches mid-sentence.

6. **Every displayed claim resolves to stored evidence.** A citation ID that does not resolve is a hard failure, not a warning. Inventing a citation is the worst bug this product can ship.

7. **Model output is never rendered as HTML or executed.** The renderer accepts only allow-listed primitives with schema-validated parameters. There is no dangerouslySetInnerHTML in this repository, ever.

8. **Interaction is simulation, not animation.** Grabbing a parameter changes the real simulation state; shadows must be recomputed from the light, never faked with a sprite.

9. **Generated video never leaves a hidden state.** No recording by default. Any recording is explicit, visible, and revocable.

10. **Video and audio analysis stay on the device.** The server receives a signal, never media. If a design requires uploading frames, stop and raise it.

11. **Autonomous moderation may pause, mute, and warn. It may never permanently punish.** Permanent removal is a human action.

12. **No long-lived provider secret reaches the browser.** Keys live server-side. There is no NEXT_PUBLIC_*_API_KEY.

13. **Essential actions work without WebGL, without a microphone, and without an AI provider.** The accessible DOM mode has feature parity for everything that matters.

14. **No brand characters.** Spider-Man, Elsa, Goku and every franchise character are protected. Public domain, historical figures, and original designs only.

15. **Every deferred capability has a named port.** Multiplayer, PDF ingestion, voice, video export, and AAA assets are separated by interfaces, not by hope.

16. **No speculative abstraction.** A port exists when there is a second implementation (usually the mock) or a named deferred feature. Everything else is concrete code.

## 1.3  Repository map and dependency direction

Dependencies point inward. Nothing may import outward.

```text
apps/web/                  Next.js shell, DOM-first UI, 3D canvas, interaction
  src/app/                 routes
  src/features/            one folder per surface
  src/ui/                  primitives, design tokens consumers
apps/server/               Fastify: sessions, research, planning, validation, notes
  src/modules/             one folder per capability
  src/platform/            adapters (llm, tts, storage, db)
  src/db/                  schema, migrations, queries
packages/timeline/         PURE. Resolver, clock port, player, camera director
packages/scene/            PURE. Scene graph, anchors, primitive registry, validators
packages/contracts/        Zod schemas → inferred types. The only source of shapes
packages/design-tokens/    the only source of colour, space, type, radius
docs/                      SPEC, GOTCHAS, OPENCODE_SETUP, SETUP_AND_VERIFY, TECHNICAL_DESIGN, ROADMAP, TASKS, ADRs, intent
```

Rules:

- **`packages/timeline` and `packages/scene` import nothing from React, the DOM, the network, or the database.** They must run under node in a test with no jsdom. This is what makes them provable.

- **`packages/contracts` is the only place that knows a shape.** If two modules both know the field names of a cue sheet, that knowledge belongs in a schema, not in both.

- **`apps/web` never talks to the database.** It talks to apps/server over typed HTTP.

- **`apps/server` never imports from `apps/web`.**

- **Adapter code lives in `platform/` and is imported only by its consumer module.** No module imports another module’s adapter.

- **No barrel files that re-export everything.** They hide dependency direction.

## 1.4  Skills — load these instead of re-deriving

Skills are instructions with a known shape. Prefer loading a skill over improvising a process.

> **⚠ Verify before relying**
>
> Skill availability depends on your install. Before a task that expects one, ask OpenCode which skills it has. If a skill is missing, say which one is missing and continue with the written rule in this file — do not silently skip the intent behind it.

| **When the task is…** | **Load skill** |
| --- | --- |
| Anything touching UI, layout, components, styling | frontend-ui-engineering |
| Writing logic, fixing a bug, or changing behaviour | test-driven-development |
| Recording a decision or changing a public interface | documentation-and-adrs |
| Touching auth, uploads, user input, secrets, third parties | security-and-hardening |
| Suspecting slowness, N+1s, bundle size, frame drops | performance-optimization |
| Breaking a spec into implementable steps | planning-and-task-breakdown |
| Designing a module boundary or an HTTP contract | api-and-interface-design |
| Setting up or changing CI, gates, deployment | ci-cd-and-automation |
| Debugging something that used to work | debugging-and-error-recovery |
| About to add an abstraction, dependency, or config layer | ponytail |
| Reviewing a diff for over-engineering | ponytail-review |
| Committing, branching, splitting a messy tree, releasing | git-workflow-and-versioning |
| Writing prose for humans (docs, README, release notes) | humanizer |
| Producing diagrams of architecture or state | archify |

Rules for skills:

- **Load on demand.** Do not preload five skills "just in case" — it burns context and dilutes attention.

- A skill overrides this file **only** where it is more specific. It never overrides an invariant in §1.

- If a skill’s advice conflicts with §1 or §4, this file wins and you say so in the report.

## 1.5  Complexity rules — enforced, not aspirational

Most likely to be broken by a well-meaning agent. Each has a concrete failure it prevents.

- **Deep modules.** Simple interface, substantial implementation. A module with a wide interface and a thin body is classitis — merge it.

- **Define errors out of existence.** Do not model failure as “still loading”. A lesson build is exactly one of queued | researching | planning | composing | validating | ready | failed, as one discriminated union, and it is impossible to construct researching forever. Never if (!res.ok) return; with state left half-set.

- **No information leakage.** Field names of a cue sheet exist in packages/contracts and nowhere else. If you type the same shape twice, stop.

- **Different layer, different abstraction.** The research layer speaks evidence vocabulary (claim, source, retrievedAt). The renderer speaks scene vocabulary (anchor, primitive, beat). Translation happens once, at a named boundary.

- **Pull complexity downward.** Hard things belong in pure packages where they are tested. A React component should be boring.

- **Comments explain why, invariants, units, hazards, and ownership.** Not what the next line does. // metres, right-handed, +Y up is a good comment. // increment i is noise.

- **No pass-through functions.** A function that only forwards its arguments is noise — call the target.

- **Strategic, not tactical.** If a fix needs a hack you cannot justify in one sentence, stop and propose the real fix.

## 1.6  Minimalism — climb the ladder before writing code

1. Does this need to exist at all? Speculative need → skip it and say so.

2. Does it already exist in this repo? Reuse before you write.

3. Does the standard library do it?

4. Does the platform do it? Native &lt;dialog&gt;, CSS, HTTP caching, AbortSignal.

5. Does an already-installed dependency do it?

6. Can it be one line?

7. Only then, the minimum code that works.

Corollaries: no interface with one implementation (except a named port with a documented second caller). No factory for one product. No config for a value that never changes. No scaffolding “for later”.

**Feature coverage is not abstraction count.** Implementing all eight camera primitives is a product decision and it is in scope. Building a PrimitiveFramework&lt;T&gt; before the third primitive needs it is not.

Mark deliberate shortcuts with a ponytail: comment naming the ceiling and the upgrade path.

## 1.7  Engine-specific rules — the ones that decide if this product works

These are the rules most likely to be violated by an agent that has not internalised why they exist.

### 1.7.1  Timing discipline

- Every cue is either **word-anchored** ({ utteranceId, wordIndex }) or **explicitly offset**. No cue may rely on “roughly the same time”.

- The resolved timeline is asserted in tests **to the millisecond**: at t = 12400, teacher point target is earth.patch.

- **Drift budget:** worst-case resolved-vs-intended deviation is a measured, reported metric with a hard ceiling. Exceeding it fails the build.

- Silence is content. If the scene needs a two-second beat for the learner to answer, the timeline declares two seconds; it does not emerge from slow speech.

### 1.7.2  Deixis ordering

Within a beat, this order is validated and rejected if violated:

*“`teacher.lookAt(target)` → `teacher.point(target)` → the narration word that names `target`.”*

This single rule is the difference between a teacher and an avatar flailing.

### 1.7.3  Anchors

- Cues reference **named anchors** from the scene graph: sun, earth, earth.axis, earth.patch, teacher.root, teacher.hand.right, learner.camera.

- A cue referencing a missing anchor fails validation. It never falls back to a default position.

- Anchor names are part of the asset contract. Renaming one is a breaking change.

### 1.7.4  Camera

- The camera vocabulary is **small and closed**: lockOff, pushIn, orbitArc, diveThrough, pullOut, cut.

- Every camera move must be declared as **motivated** — the cue sheet states which idea the move follows. An unmotivated move fails review.

- diveThrough (scale transition) may not be used in generated scenes until the hand-authored reference implementation passes its golden tests.

### 1.7.5  Physics

- The sun is a real directional light. Shadow length is derived from sun elevation, not authored. The lesson’s explanation must be physically true of the render.

- Two Earths in one frame share one light. If a scene needs a second key light, the explanation is wrong, not the lighting.

### 1.7.6  Interaction

- A grabbable object exposes a **named parameter** (axisTiltDeg, orbitSpeed) constrained to a range. Clamping is on the parameter, not in the render loop.

- Interaction never triggers a canned animation. It changes state, and the render follows.

## 1.8  The multi-agent protocol

Three roles, isolated context, coordinated on disk. The purpose is **token efficiency and review discipline**, not theatre.

| **Agent** | **Reads** | **May write** | **May not** |
| --- | --- | --- | --- |
| **architect** | [SPEC.md](docs/SPEC.md), [TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md), [ROADMAP.md](docs/ROADMAP.md), [TASKS.md](docs/TASKS.md) | [TASKS.md](docs/TASKS.md) only | Edit source, run destructive commands, invent contracts |
| **coder** | The one task it was given, plus the files listed for it | Source, tests, migrations within scope | Touch [TASKS.md](docs/TASKS.md), spawn agents, change contracts |
| **reviewer** | git diff, the task, the contracts | Nothing | Edit files, approve its own findings |

### 1.8.1  Coordination is on disk, not in chat

[TASKS.md](docs/TASKS.md) is the shared brain. Each entry:

```markdown
### T3.2 — Camera primitive: pushIn

- **Status:** ready
- **Files:** packages/scene/src/primitives/camera.ts, packages/scene/src/primitives/camera.test.ts
- **Contract:** CameraPrimitive in packages/contracts/src/scene.ts (already exists — do not change)
- **Done when:** pushIn interpolates position and FOV over a declared duration; validator rejects a zero duration; three tests cover the happy path, the zero-duration case, and an out-of-range duration.
- **Out of scope:** ease curves beyond linear and easeInOut; any other camera primitive.
```

A task with no file list, no contract reference, and no “done when” is not a task. Send it back.

### 1.8.2  Handoff rules

- **One task in flight.** The architect delegates exactly one task, waits, then reviews.

- **The coder gets only its files.** Do not hand it the repository.

- **The reviewer sees a diff, not a conversation.** If a review needs context, that context belongs in the task.

- **The main agent reads every diff before it lands.** A subagent’s claim about what code does is an INFERENCE until you have read it.

- **Subagents never edit overlapping files in parallel.**

- **A failed review returns to the coder with line-level findings**, not a rewritten solution.

### 1.8.3  Escalate instead of guessing

Stop and ask when the work requires: changing an invariant in §1, changing a public contract, choosing a data model, adding a dependency with architectural weight, or anything in §1.17.

## 1.9  Commands

The canonical interface. If a command changes, update this section in the same commit.

```bash
pnpm install --frozen-lockfile   # what CI runs
pnpm dev                         # web :3000 + server :8081
pnpm dev:web                     # web only
pnpm dev:server                  # server only
pnpm db:up / pnpm db:down        # local Postgres
pnpm db:migrate                  # apply migrations
pnpm check                       # format check + lint + typecheck
pnpm test                        # unit and component tests
pnpm build                       # production build for both apps
pnpm verify                      # check + test + build — the one command that means "is this good?"
```

**Ports:** web 3000, server 8081, Postgres 5432. Port 8080 is deliberately unused — another local service owns it.

### 1.9.1  Token-saving tooling

graphify is an optional local code-graph tool. When installed, prefer it over grep for symbol questions:

```bash
graphify query "where is resolveTimeline defined"
graphify path buildApp validateCueSheet
graphify explain EvidencePacket
graphify update .            # after adding, moving, or deleting modules
```

Rules:

- Query the graph **before** grepping for a name, and before reading whole directories.

- Rebuild after structural change. A stale graph is worse than none.

- **The graph is a map, not evidence.** Edges are EXTRACTED or INFERRED. To claim behaviour as FACT you must still read the file and quote the line.

- If graphify is not installed, fall back to rg and say so once. Do not block work on installing it.

## 1.10  Testing and quality

### 1.10.1  What a test must prove

A useful test is capable of catching a plausible regression in at least one of: a business rule, a state transition, authorization, serialization and compatibility, persistence, a user workflow, failure handling, or a cost/performance/safety invariant.

### 1.10.2  Rejected tests

Do not write tests that merely raise a number:

- a constant equals its literal

- a constructor copies its inputs

- trivial getters and setters

- code executes with no assertion on output

- snapshots of large component trees

- expect(fn).toHaveBeenCalledWith(...) as the only assertion — that verifies wiring, not behaviour

- passWithNoTests

- a test that duplicates what the type checker already guarantees

### 1.10.3  Default to adversarial cases

Every module with a branch, a loop, or a parse gets at least one negative case. Specifically for this project:

- a cue referencing a **missing anchor**

- a cue with an **unknown primitive**

- **NaN / Infinity / out-of-range** coordinates

- a citation ID that **does not resolve**

- word timings that are **out of order** or overlapping

- a TTS response with **no word boundaries**

- a lesson plan with **two ideas in one shot**

- model output wrapped in **markdown fences** when JSON was requested

### 1.10.4  Purity, and how to prove it

packages/timeline and packages/scene must be testable with no DOM, no network, and no clock. If a test needs jsdom to exercise the resolver, the resolver has drifted — fix the code, not the test environment.

### 1.10.5  Coverage

Coverage is a floor, not a target. Never manipulate a threshold to pass. Core pure packages carry the highest bar; validators and cost controls require near-complete negative-case coverage. A number that rises because someone tested a getter is noise, and is a review finding.

### 1.10.6  No test-only branching in production code

If code checks NODE_ENV === ‘test’ or an injected flag only tests set, the design is wrong. Restructure.

## 1.11  Code rules

- TypeScript strict, plus noUncheckedIndexedAccess, noUnusedLocals, noUnusedParameters. Zero any, zero @ts-ignore, zero non-null ! on external data.

- **Validate at every trust boundary.** Model output, retrieved web text, uploaded files, and request bodies are all untrusted. Zod at the edge; typed data inside.

- Model outputs are parsed defensively: strip fences, repair once with a bounded retry, then fail loudly. Never “best effort” a malformed cue sheet into playability.

- Every async operation either returns a typed result or throws. Never undefined meaning “something went wrong”.

- No console.log in shipped code. One logger, silenced in production, correlation IDs on server paths.

- Numbers carry units in the name: positionM, durationMs, axisTiltDeg, sunElevationDeg. A bare angle is a bug.

- Dates: ISO strings across boundaries. No Date in a schema.

- A file over ~300 lines is a signal to examine responsibilities, not an automatic split.

- Never use React state for per-frame values. Frame data lives in a mutable store read by useFrame; React renders at UI frequency only.

## 1.12  UI standards

The product’s promise is that it feels like a place. Bad UI makes the engine invisible.

UI work is reviewed against WCAG 2.2 AA before review sign-off.

- **Design tokens are the only source of colour, spacing, type, radius, and shadow.** No raw hex in a component. packages/design-tokens is the single source, consumed by DOM, canvas, and any future renderer.

- **Semantic DOM first, canvas second.** Every essential action exists as a real element: join, ask, raise hand, mute, read transcript, read notes, leave, report. A canvas-only interaction is never acceptable.

- **Four distinct states, always.** Empty, loading, error, and unavailable are visibly different and rendered through one shared component. “Loading forever” is the original bug and is not allowed.

- **Accessibility is a release gate, not a phase.** Keyboard path, visible focus, aria-label on icon-only buttons, correct heading hierarchy, captions for all speech, reduced-motion mode that also disables camera cuts.

- **Motion has rules.** Camera cuts and rapid zooms have a reduced-motion alternative. No auto-playing audio. No flashing.

- **Taste is discipline, not decoration.** A spacing scale that is not ad hoc, one type hierarchy, defined interaction states, an accent used as a signal rather than a surface. Copy the method, not someone else’s palette.

- **Copy is plain and specific.** Say what happened and what to do next. No “Oops! Something went wrong.”

- **Performance budgets are checked.** First interactive DOM shell before any heavy asset. 30 fps floor on the chosen reference device, with a published quality preset for weaker hardware.

## 1.13  Security, privacy, and safety

- Deny by default. Authorize the action, not just the connection.

- No secret in a URL, a log, a commit, an image, or a client bundle. Provider keys server-side only.

- Retrieved content is **data**, never instructions. It cannot invoke tools, change personas, or write to state. Prompt-injection payloads in fixtures are expected and tested.

- Any outbound fetch: allowlist scheme and host, block private and link-local ranges, re-validate redirects, enforce a timeout.

- Uploads (later phases): size limits, magic-byte verification, server-generated names, sandboxed extraction, explicit deletion.

- Logs carry correlation IDs, not content. Never log prompts, transcripts, learner text, audio, or document text.

- Cost is a security property. Every generated artefact records its model, prompt version, and cost. Per-session budgets are enforced server-side with hard stops.

- The 16+ age gate is deliberate. Do not soften it, and do not add features that assume minors without an explicit decision.

## 1.14  Learning protocol — you are learning this, not just shipping it

The point of this project is understanding it. Speed that leaves the author unable to explain the code is not progress.

### 1.14.1  Where notes live

Outside the repository, in the Obsidian vault. **Never committed.**

```text
VAULT_ROOT = /mnt/c/Users/Asuna/Documents/InstaVault/SpatialClassroom/
```

> **✎ Set this once**
>
> If that path is wrong on this machine, fix it here before writing notes. If the vault directory does not exist, create it and the four subfolders. Never write vault paths into committed files other than this line.

| **Folder** | **Contents** | **Filename** |
| --- | --- | --- |
| learning-notes/ | one note per session | YYYY-MM-DD_session-NN.md |
| architecture/ | structural decisions and how things fit | YYYY-MM-DD_&lt;topic&gt;.md |
| debug-log/ | non-trivial bug investigations | YYYY-MM-DD_&lt;bug-slug&gt;.md |
| mind-maps/ | nested bullet outlines of a concept | YYYY-MM-DD_&lt;topic&gt;.md |

The vault is the private learning trail. docs/ is the public engineering record. Both exist; they are not duplicates.

### 1.14.2  When to write — only on trigger

- a milestone completes, or a feature works end to end

- an architecture decision is made (also write architecture/)

- a non-trivial bug is fixed (also write debug-log/)

- a concept is complete enough to summarise (also write mind-maps/)

- end of session

Do not write a note after every exchange. Notes written constantly are notes never read.

### 1.14.3  Rules

- One file per purpose. Never dump everything into one note.

- Never write these files into the repository.

- Write as if teaching a smart beginner. Define a term the first time it appears.

- An architecture note does **not** replace the ADR required by §1.15. Both are written.

### 1.14.4  Linking (for the Obsidian graph)

- Use wikilinks — [[like this]] — never plain text or markdown links. The graph view only sees wikilinks.

- A concept used in more than one session gets a standalone note in learning-notes/concepts/; every session that uses it links there.

- A note recording a decision links its ADR: [[0003-timeline-resolver-is-pure]].

### 1.14.5  Session note format

1. What we worked on

2. What changed — files, one line each

3. Concepts learned — one paragraph each

4. Logic and flow — how the pieces connect

5. Teach-back — three sentences that explain it without notes

6. Open questions / next session

7. Why not the alternative — what was rejected and why

### 1.14.6  Architecture note format

1. What was decided

2. Why — the reasoning

3. Trade-offs — what was rejected and why

4. How it fits the system

### 1.14.7  Debug note format

1. Symptom — what you actually saw

2. Root cause — not the symptom

3. Fix — files and lines

4. Lesson — the general principle

**If a change cannot be explained back, re-explain it or revert it. Never accept an unexplained change.**

## 1.15  Documentation and ADRs

Written in the **same pull request** as the code. A stale document is a defect.

| **File** | **Holds** | **Update when** |
| --- | --- | --- |
| [docs/SPEC.md](docs/SPEC.md) | what the product is, V1/V2 scope | scope changes |
| [TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md) | architecture, contracts, data model, evals | shape changes |
| [GOTCHAS.md](docs/GOTCHAS.md) | real traps with symptom → cause → fix | you lose more than 15 minutes to something |
| [ROADMAP.md](docs/ROADMAP.md) | phases, definitions of done, tickets | a phase or ticket changes |
| docs/adr/NNNN-title.md | one page per expensive-to-reverse decision | the decision is made |

ADR format: context, options considered, decision, consequences (including the negative ones), and the trigger that would make you revisit it.

Write an ADR for: deployable boundaries, durable state technology, public contracts, the coordinate convention, provider topology, retention posture, or a dependency with architectural weight.

Also update, in the same PR: code comments made false by the change, the roadmap checkbox, the asset licence record if art moved, and any command in §1.9 that no longer works.

## 1.16  Git

- **Conventional Commits.** feat, fix, refactor, test, docs, chore, perf, ci, build, with a scope: feat(engine): add camera pushIn primitive.

- Imperative, lowercase, no trailing full stop, ≤ 72 characters in the subject. The body explains **why**.

- One logical change per commit. If the message needs “and”, split the commit.

- Branches: feat/&lt;scope&gt;-&lt;slug&gt;, fix/&lt;scope&gt;-&lt;slug&gt;, chore/&lt;slug&gt;, docs/&lt;slug&gt;, test/&lt;scope&gt;-&lt;slug&gt;.

- main is always green and always deployable. Never commit directly to it.

- Squash merge. Delete the branch.

- Never commit: .env, keys, node_modules, dist, .next, coverage output, user content, or an unlicensed asset.

- **CI is truth.** After a push, before any other work, confirm the run for *your* commit is green. A local green is not a green. If local and CI disagree, CI wins and the difference is a bug in the local gate.

- Never fix red CI by removing a check, skipping a test, or adding --no-verify. If a check is wrong, say so and get approval.

- README badges reflect reality. A red badge is information, not embarrassment — never delete a badge to hide a failure.

## 1.17  Reporting

Every report uses this shape.

- Label claims **FACT** (I read it, here is the line) or **INFERENCE** (best guess). Never blur them.

- Quote code you describe. Never paraphrase a file from memory.

- No “everything works” without the command and its output.

- Every UI claim is paired with what you actually saw, or with a screenshot.

- “Needs the human” is a numbered list of actions only the author can take, each with the exact command or decision. If empty, write “Nothing.”

### 1.17.1  Housekeeping latitude

No permission needed for corrections that are purely internal consistency and change no behaviour. Make them, then list them under **Housekeeping**.

- a stale cross-reference or a dead relative link

- a comment describing code that has moved or changed

- a comment that is now false, or a TODO that is done

- a typo in prose you are already editing

- leftovers from a rename: dead config pointing at old paths

Still stop and ask for: any change to a rule in this file or its meaning; any behaviour change, even one line; deleting a tracked file; renumbering sections; anything where you would be guessing what a document *meant*; and scope widening — "while I was in there I also refactored X" is never housekeeping.

Rule of thumb: if you cannot state the correction as “this sentence is now false because Y”, ask.

## 1.18  Definition of done

**A ticket is not done until:**

1. It does exactly what the ticket asked and nothing adjacent.

2. pnpm verify passes locally.

3. New behaviour has a test that could plausibly fail for a real reason, including its negative case.

4. The failure path has been exercised by hand and observed.

5. Contracts changed before or with the implementation, with a compatibility note.

6. Every document made false by the change is updated.

7. The diff has been read end to end for secrets, dead code, and accidental changes.

8. CI for the commit is green.

9. The report names what is FACT, what is INFERENCE, and what the human must do next.

**A milestone is not done while CI is red, or while the CI run for its commit is unknown.**

A milestone may be reported as explicitly partial — committed, green, and honest — but an uncommitted half-change is never acceptable.

## 1.19  Open decisions — ask, don't assume

- The exact free TTS that reliably returns word boundaries. Until proven, do not build the engine on an assumption.

- The timing-drift ceiling in milliseconds.

- Which three teacher personas launch, and who writes their voice and register.

- Whether V1 includes any live web search or only curated knowledge.

- Retention window for anonymous sessions and generated lessons.

- Product name and domain.

- Asset contract sign-off before custom art work begins.

- Whether hand tracking ships enabled or behind a flag.

## Repository search

`graphify` is the required way to search or understand code. Use `graphify update .` after a structural change, `graphify query "where is X defined"` for discovery, `graphify path "A" "B"` for a dependency path, and `graphify explain "X"` for a symbol. Query the graph before grepping for a name or reading whole directories. A stale graph is worse than none; rebuild after moves and renames. The graph is a map, not evidence — read the file and quote the line before claiming behaviour. Ripgrep is acceptable only for a single known file or to filter a command's output. A task that searched with ripgrep instead of graphify is incomplete. If graphify is unavailable, fall back to ripgrep and say so once.

## Documentation contract

Each document is authoritative for one thing: `docs/SPEC.md` for product scope; `docs/TECHNICAL_DESIGN.md` for architecture, contracts, data, and evaluations; `docs/GOTCHAS.md` for traps; `docs/ROADMAP.md` for phase scope and order; `docs/TASKS.md` for task state; `docs/adr/` for decisions; `AGENTS.md` for rules and invariants; `docs/OPENCODE_SETUP.md` for agent configuration.

A task is not done until its document updates are in the same diff. A new trap goes to `docs/GOTCHAS.md`; a behaviour or structure change goes to `docs/TECHNICAL_DESIGN.md`; an architectural decision gets a new ADR; a scope or order change goes to `docs/ROADMAP.md` with human sign-off; task state goes to `docs/TASKS.md`.

## 1.20  Final instruction

When architecture, commands, behaviour, contracts, setup, assets, privacy, or providers change, update **this file**, the technical design, the gotchas, the ADRs, the diagrams, the roadmap status, and the comments that are now wrong — before declaring the work complete.

The repository is the argument. Keep it honest.
