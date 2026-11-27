# OPENCODE_SETUP.md

**Repository destination:** `/docs/OPENCODE_SETUP.md` — repository root; multi-agent configuration, skills, and task coordination.

**Companion documents:** [AGENTS.md](../AGENTS.md) — rules and invariants, [SETUP_AND_VERIFY.md](SETUP_AND_VERIFY.md) — machine setup and verification, [GOTCHAS.md](GOTCHAS.md) — known traps

Three agents, disk-based coordination, on-demand skills. The goal is **token efficiency and review discipline**, not theatre: agents that talk to each other in chat burn context; agents that coordinate through two files on disk stay cheap and resumable.

> **⚠ Verify before trusting the config**
>
> OpenCode’s configuration surface changes between versions. Every field used here is current as documented for V2 agents (description, mode, model, permissions, steps, hidden, color, disabled, request). If a field is rejected, check the live docs rather than guessing. After writing the files, run the verification steps in §7 before starting any work.

## 2  What gets created

```text
/
├── opencode.json                  provider, default agent, global permissions
├── .opencode/
│   ├── agents/
│   │   ├── architect.md           primary — plans, delegates, updates docs/TASKS.md
│   │   ├── coder.md               subagent — executes one task, tests, verifies
│   │   └── reviewer.md            subagent — audits a diff, returns PASS or FAIL
│   └── skills/                    project skills (installed in §5)
├── docs/TASKS.md                       the shared brain (agent-writable)
└── AGENTS.md                      the constitution (human-owned)
```

Two rules that make the whole thing work:

1. **`AGENTS.md` is human-owned.** No agent edits it. A change to a rule is a conversation.

2. **`docs/TASKS.md` is the only shared mutable state.** Agents coordinate there, not in chat history.

## 3  Ports

| **Service** | **Port** | **Note** |
| --- | --- | --- |
| Web | 3000 | Next.js |
| Server | **8081** | 8080 is owned by an unrelated local service and must stay free |
| Postgres | 5432 | Docker |

Both sides must agree on the server port:

```dotenv
# apps/server/.env
PORT=8081

# .env (root — read by the web app)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8081
```

## 4  opencode.json

At the repository root.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "share": "disabled",
  "default_agent": "architect",
  "instructions": ["AGENTS.md"],
  "permissions": [
    { "action": "edit",   "resource": ".env",    "effect": "deny" },
    { "action": "edit",   "resource": ".env.*",  "effect": "deny" },
    { "action": "edit",   "resource": "AGENTS.md","effect": "deny" },
    { "action": "shell",  "resource": "git push*", "effect": "ask" },
    { "action": "shell",  "resource": "docker compose down -v*", "effect": "ask" },
    { "action": "shell",  "resource": "rm -rf*", "effect": "ask" },
    { "action": "webfetch", "resource": "*", "effect": "allow" },
    { "action": "skill",  "resource": "*",       "effect": "allow" }
  ]
}
```

Why each entry exists:

- share: "disabled" — no session leaves the machine.

- default_agent: "architect" — you start in planning mode by default, which is where most mistakes become cheap.

- instructions: ["AGENTS.md"] — one file, deliberately. Loading five documents into every request burns context and dilutes attention. AGENTS.md tells the agent which document to read per task.

- The deny rules on .env and AGENTS.md prevent the two most expensive accidental edits.

- The ask rules are the three commands that can destroy work or publish prematurely.

## 5  The three agents

### 5.1  .opencode/agents/architect.md

```markdown
---
description: Plans one task at a time, delegates to coder, sends diffs to reviewer, updates docs/TASKS.md
mode: primary
model: openrouter/deepseek/deepseek-v4.1-flash-1017
color: "#7aa2f7"
request:
  body:
    temperature: 0.2
permissions:
  - action: edit
    resource: "*"
    effect: deny
  - action: edit
    resource: "docs/TASKS.md"
    effect: allow
  - action: subagent
    resource: "*"
    effect: allow
  - action: shell
    resource: "*"
    effect: deny
  - action: shell
    resource: "git status*"
    effect: allow
  - action: shell
    resource: "git diff*"
    effect: allow
  - action: webfetch
    resource: "*"
    effect: allow
---

You are the architect. You do not write source code.

## Read, in this order, and only what the task needs
1. `AGENTS.md` — invariants, rules, definition of done.
2. `docs/ROADMAP.md` — the current phase and its definition of done.
3. `docs/TASKS.md` — what is done, what is in flight.
4. `docs/TECHNICAL_DESIGN.md` — only the sections the task touches.

## Your loop
1. Pick exactly ONE unfinished task from `docs/TASKS.md`, respecting phase order.
2. Rewrite it as a precise task record: objective, files in scope, contract
   reference, "done when", explicit out-of-scope list, and the test that must
   exist at the end.
3. Delegate to `@coder` with ONLY those file paths. Never hand over the repo.
4. When the coder returns, hand the diff to `@reviewer`.
5. On FAIL, return the reviewer's line-level findings to `@coder`. On PASS,
   update `docs/TASKS.md` and stop.
6. Ask the human before starting a second task.

## Hard limits
- One task in flight.
- Never change a public contract in `packages/contracts` — if a task needs it,
  stop and ask.
- Never edit source, tests, config, or `AGENTS.md`.
- Never invent a requirement that is not in the roadmap or the task record.
- If a task cannot be described with a "done when" line, it is not a task.

## Report
Task id, files delegated, reviewer verdict, what changed in `docs/TASKS.md`,
and what the human must decide next.
```

### 5.2  .opencode/agents/coder.md

````markdown
---
description: Implements exactly one task, writes real tests, runs verification, returns a summary
mode: subagent
model: openrouter/deepseek/deepseek-v4.1-flash-1017
steps: 25
color: "#9ece6a"
request:
  body:
    temperature: 0.1
permissions:
  - action: edit
    resource: "*"
    effect: allow
  - action: edit
    resource: "AGENTS.md"
    effect: deny
  - action: edit
    resource: ".env"
    effect: deny
  - action: shell
    resource: "*"
    effect: allow
  - action: shell
    resource: "git push*"
    effect: deny
  - action: shell
    resource: "docker compose down -v*"
    effect: ask
  - action: shell
    resource: "rm -rf*"
    effect: ask
---

You implement ONE task. Nothing else.

## Before writing code
1. Read `AGENTS.md` — the invariants are not optional.
2. Read the task record and ONLY the files it names.
3. Read the relevant contract in `packages/contracts`.
4. State, in two lines, what you are about to change and which test will prove it.

## While writing code
- Match the surrounding style. Do not reformat files you did not need to touch.
- Validate untrusted data at the boundary with zod. Model output is untrusted.
- Numbers carry units in their names: `durationMs`, `axisTiltDeg`, `positionM`.
- No `any`, no `@ts-ignore`, no non-null assertion on external data.
- If the work needs a change outside your file list, STOP and report it.

## Tests you must write
- A behavioural test that could plausibly fail.
- At minimum one negative case: missing anchor, unknown primitive, NaN,
  out-of-range, unresolved citation, malformed JSON, out-of-order timings.
- Never write a test that only asserts a constant, a constructor copy, or a
  mock call. Never add `passWithNoTests`. Never skip a test to get green.

## Verification you must run
Run all four and paste the real output:

```
pnpm typecheck
pnpm test
pnpm build
pnpm verify
```

## Report
- Files changed, one line each with the reason.
- The test names you added and what each one catches.
- The four command results, pasted.
- Anything you could not do, and why.
- Nothing else. Do not summarise the architecture back.
````

### 5.3  .opencode/agents/reviewer.md

```markdown
---
description: Audits a diff against the task, the contracts, and AGENTS.md; returns PASS or FAIL
mode: subagent
model: openrouter/deepseek/deepseek-v4.1-flash-1017
steps: 15
color: "#f7768e"
request:
  body:
    temperature: 0.1
permissions:
  - action: edit
    resource: "*"
    effect: deny
  - action: shell
    resource: "*"
    effect: deny
  - action: shell
    resource: "git diff*"
    effect: allow
  - action: shell
    resource: "git status*"
    effect: allow
  - action: shell
    resource: "pnpm test*"
    effect: allow
  - action: shell
    resource: "pnpm typecheck*"
    effect: allow
---

You review. You never edit.

## Check, in this order
1. **Scope** — does the diff do only what the task asked? Flag anything adjacent.
2. **Invariants** — `AGENTS.md` §1. A violation is an automatic FAIL.
3. **Contracts** — did a public shape change? Was it versioned and documented?
4. **Tests** — does a test prove the new behaviour, and does it include a
   negative case? Would any of these tests pass against a broken implementation?
5. **Purity** — did anything impure enter `packages/timeline` or `packages/scene`?
6. **Secrets and logs** — keys, tokens, content in logs.
7. **Dead code and noise** — unrelated reformatting, committed build output.

Run the tests yourself. Do not take the coder's word for it.

## Output — exactly this shape
VERDICT: PASS | FAIL

FINDINGS
- [severity] file:line — what is wrong, and the minimal fix.

If PASS, list at most three non-blocking observations.

Never restate the diff. Never praise. Never suggest a rewrite of working code.
```

## 6  Skills

Skills are loaded on demand and cost nothing until used. Install the ones that match this project; skip the rest.

### 6.1  Required set

| **Skill ID** | **Used for** |
| --- | --- |
| test-driven-development | every logic change |
| ponytail | before adding an abstraction, dependency, or config layer |
| ponytail-review | diff review for over-engineering |
| frontend-ui-engineering | any UI work |
| web-design-guidelines | gate before calling a view done |
| documentation-and-adrs | decisions and public interface changes |
| security-and-hardening | untrusted input, uploads, third parties, secrets |
| debugging-and-error-recovery | something that used to work |
| git-workflow-and-versioning | commits, branches, releases |
| performance-optimization | frame budget, bundle size, N+1s |
| api-and-interface-design | module boundaries and HTTP contracts |
| ci-cd-and-automation | gates and pipelines |
| humanizer | README, docs, release notes |

### 6.2  Optional, useful later

planning-and-task-breakdown, spec-driven-development, constraint-driven-development, source-driven-development, shipping-and-launch, deprecation-and-migration, browser-testing-with-devtools, archify, open-code-review, convert-documents-to-markdown.

### 6.3  Installing

Three routes, in order of preference.

**A. Check what is already available.** Start OpenCode and ask: *“List the skills you currently have available.”* Anything already present needs nothing.

**B. Copy into the project.** A skill is a folder with a SKILL.md:

```text
.opencode/skills/test-driven-development/SKILL.md
```

The folder name is the skill ID and it is case-sensitive. The description in frontmatter is what makes it discoverable, so never omit it.

**C. Global install**, for skills you want in every project:

```text
~/.config/opencode/skills/<id>/SKILL.md
```

### 6.4  The token-saving rule

Do not preload skills. AGENTS.md §3 maps *task type → skill*; the agent loads one when the task matches. Loading five skills “just in case” costs more than it saves.

If an instruction names a skill that is not installed, the agent must **say which one is missing** and fall back to the written rule. Silently skipping the intent is the failure mode.

### 6.5  graphify — optional code graph

If installed, it answers “where is this defined” and “who calls this” far cheaper than grep plus reading files:

```bash
graphify query "where is resolveTimeline defined"
graphify path buildApp validateCueSheet
graphify explain EvidencePacket
graphify update .            # after any structural change
```

Rules that must be stated in AGENTS.md (they are):

- Query before grepping; rebuild after moving or renaming files.

- A stale graph is worse than none.

- **The graph is a map, not evidence.** Read the file before claiming behaviour.

- If it is absent, fall back to rg and say so once. Never block work on installing it.

## 7  docs/TASKS.md template

The shared brain. Agent-writable; human-readable.

```markdown
# TASKS

Phase: **P1 — Timeline core**
Phase definition of done: at least one camera primitive and one teacher primitive
resolve against a hand-authored cue sheet, with a golden test asserting state at
three named instants, and drift inside budget.

## In flight
(nothing)

## Ready

### T1.1 — Clock port and ManualClock

- **Status:** ready
- **Files:** `packages/timeline/src/clock.ts`, `packages/timeline/src/clock.test.ts`
- **Contract:** `Clock` in `packages/timeline/src/clock.ts` (new — this task creates it)
- **Done when:** `Clock` has `now(): number`; `ManualClock` advances only when told;
  a test proves two reads without advancement return the same value and that
  advancing by 500 returns exactly 500 more.
- **Out of scope:** any use of the clock by the player, any real clock implementation.

### T1.2 — Timeline entry type and pure sorter

- **Status:** blocked by T1.1
- **Files:** `packages/timeline/src/timeline.ts`, `.../timeline.test.ts`
- **Contract:** `TimelineEntry`, `Timeline` (new)
- **Done when:** entries sort by `atMs` then by a documented track precedence; a
  test covers equal timestamps, and a test proves the function does not mutate
  its input.
- **Out of scope:** cue resolution, the player, any camera primitive.

## Done

- T0.4 — Postgres with Drizzle migrations and database-backed readiness.
```

**Rules for a task record**

- No file list → not a task. No “done when” → not a task.

- One task is in flight at a time. Everything else is ready, blocked, or done.

- Out-of-scope is written down. It is the cheapest defence against scope creep.

- The phase definition of done lives at the top, so the agent always knows what “finished” means.

## 8  Verification

Run these before trusting the setup.

### 8.1  Config accepted

```bash
opencode --version
node -e "JSON.parse(require('fs').readFileSync('opencode.json','utf8')); console.log('opencode.json is valid JSON')"
ls .opencode/agents
```

**Pass:** version prints, JSON parses, three agent files exist.

### 8.2  Agents are visible

Start OpenCode and ask:

```text
List the agents available to you, with their mode and model.
```

**Pass:** architect (primary), coder (subagent), reviewer (subagent), plus the built-ins. If an agent is missing, the frontmatter is malformed or the file is not named .md in .opencode/agents/.

### 8.3  Model resolves

```text
/models
```

**Pass:** the configured model ID appears exactly as written. If it does not, the provider does not expose that ID under that name — correct the string rather than hoping. **Never guess a model ID**; a 404 mid-task wastes far more than the ten seconds this check costs.

### 8.4  Permissions actually deny

```text
Try to edit AGENTS.md, then report what happened.
```

**Pass:** the agent reports it cannot, or asks. If it edits the file, the deny rule is wrong.

```text
Run `git push` without asking me first.
```

**Pass:** it asks, or refuses.

### 8.5  Delegation works

```text
Use @coder to add a single unit test for packages/timeline/src/clock.ts, then
send the diff to @reviewer and report the verdict.
```

**Pass:** the coder returns files and pasted test output; the reviewer returns VERDICT: PASS or FAIL with line references. If the reviewer restates the diff instead of judging it, its prompt is being ignored — check the frontmatter was parsed.

### 8.6  Skills present

```text
List the skills you have available, and say which of the required set from
docs/OPENCODE_SETUP.md §5.1 are missing.
```

**Pass:** an explicit list plus an explicit missing list. An agent that claims all skills exist without listing them is guessing.

## 9  Operating rhythm

Daily, per task:

```text
1. Human: "Next task"                     → architect picks from docs/TASKS.md
2. Architect: rewrites the task, delegates
3. Coder: implements, tests, runs pnpm verify, reports
4. Architect: sends diff to reviewer
5. Reviewer: PASS or FAIL with line references
6. Architect: updates docs/TASKS.md, stops
7. Human: reads the diff, runs the commands, commits
```

The human is the gate at step 7. **Do not let an agent commit.** A commit is a judgement about whether the change is worth keeping, and judgement is the job that stays with you.

### 9.1  Token discipline

- One task per delegation. A delegation that spans two tasks produces two half-reviewed changes.

- Never paste a file into chat when the agent can read it by path.

- steps: 25 on the coder and 15 on the reviewer are circuit breakers, not targets. Hitting the ceiling means the task was too large — split it in docs/TASKS.md.

- When a session drifts, start a new one. Long histories are expensive and produce worse decisions.

### 9.2  When to break the loop

Go straight to a human conversation, bypassing the agents, when:

- a public contract needs to change

- the coordinate convention or units are in question

- a cost or privacy trade-off is being made

- two tasks disagree about who owns a file

- the reviewer and the coder disagree twice on the same finding

Those are architecture decisions. Agents do not make them.

## 10  What this setup deliberately does not do

- No agent commits, merges, or pushes.

- No agent edits AGENTS.md or .env.

- No swarm, no negotiation loop, no agents reviewing each other’s reviews.

- No long chat histories as state. docs/TASKS.md is the state.

- No automatic task generation from the roadmap. The architect proposes; the human disposes.

The whole configuration exists to make one thing cheap: **a small, verified, reviewable change.** Everything else is overhead.
