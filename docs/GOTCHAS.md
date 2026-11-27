# GOTCHAS.md

**Repository destination:** `/docs/GOTCHAS.md` — repository root; the trap log.

**Companion documents:** [AGENTS.md](../AGENTS.md) — rules and invariants, [SETUP_AND_VERIFY.md](SETUP_AND_VERIFY.md) — machine setup and verification, [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md) — architecture, contracts, and evaluations

A living list. Every entry has actually cost time, or will. Symptom first, because that is what you will search for.

**The rule:** if you lose more than fifteen minutes to something, add an entry in the same commit that fixes it. An entry earns its place by having a symptom someone would actually type into a search box.

## 1.1  How to read an entry

```text
### N. Title

SYMPTOM   what you actually saw, including the exact error text
CAUSE     the real reason, not the visible one
FIX       what to do
NEVER     the thing not to do, if there is an obvious wrong instinct
```

## 2  Environment and ports

### 2.1  Port 8080 is taken by an unrelated local service

**SYMPTOM** The app starts but the web page shows *“API unreachable at http://localhost:8080”*. EADDRINUSE in the server log if you try to bind it.

**CAUSE** An existing open-webui process owns 8080 on this machine and must keep running.

**FIX** The project’s canonical server port is **8081**, not 8080. Both sides must agree:

```dotenv
# apps/server/.env
PORT=8081

# .env  (root, read by the web app)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8081
```

Verify both at once:

```bash
curl -i http://localhost:8081/health/live
```

**NEVER** Change only one of the two. A port mismatch looks exactly like a server crash, and you will debug the server for an hour.

### 2.2  localhost resolves to IPv6 and Postgres is not listening there

**SYMPTOM** ECONNREFUSED ::1:5432 even though docker compose ps shows the container healthy.

**CAUSE** Node resolves localhost to ::1 first; the container publishes on IPv4.

**FIX** Use 127.0.0.1 in DATABASE_URL, not localhost.

### 2.3  .env must exist in two places

**SYMPTOM** Server starts but readiness is always 503, or the web page cannot find the API base URL.

**CAUSE** The workspace has two env consumers: the web app reads root .env, the server reads apps/server/.env. Copying one is not copying both.

**FIX**

```bash
cp .env.example .env
cp apps/server/.env.example apps/server/.env
```

**NEVER** Commit either file. Both are gitignored; .env.example is the template and contains no working secret.

### 2.4  A broad .env.* deny also matches .env.example

**SYMPTOM** A coder cannot create or update `.env.example`, even though it contains no secret.

**CAUSE** The glob `.env.*` matches `.env.example`. A later broad allow can also silently override the deny because OpenCode permissions use last-match-wins.

**FIX** Deny `.env`, `.env.local`, and `.env.*.local`; allow `.env.example` explicitly. Put the specific rule after the broad one so last-match-wins resolves to the intended effect.

**NEVER** Re-broaden the deny to `.env.*` and assume `.env.example` is safe. It is matched.

### 2.5  A passphrase-protected SSH key cannot be unlocked by an unattended session

**SYMPTOM** `git push` from an agent session fails with `git@github.com: Permission denied (publickey)`, sometimes preceded by `ssh_askpass: exec(/usr/bin/ssh-askpass): No such file or directory`. `gh auth status` looks healthy and `gh ssh-key list` shows the key, so the key appears registered and the diagnosis goes the wrong way.

**CAUSE** The private key is encrypted. Signing needs the passphrase, which needs a TTY or an ssh-agent. `SSH_AUTH_SOCK` is unset in the unattended process, so `ssh` selects the correct identity file and then cannot sign.

**FIX** Establish the cause before changing anything:

```bash
ssh-keygen -y -P "" -f ~/.ssh/id_ed25519   # "incorrect passphrase" = the key is encrypted
echo "$SSH_AUTH_SOCK"                      # empty = no agent in this process
gh ssh-key list                            # the key is usually already registered
```

Then load the agent in the shell that will push (`eval "$(ssh-agent -s)" && ssh-add ~/.ssh/id_ed25519`), or push once over HTTPS without touching the remote:

```bash
git -c credential.helper='!gh auth git-credential' push https://github.com/<owner>/<repo>.git <branch>
```

**NEVER** Re-register the key as a first reaction, and never `git remote set-url` as a workaround. The key was already on the account, so re-adding changes nothing and buries the real cause; and the remote is documented as SSH.

### 2.6  An explicit-URL fetch prunes origin/main when fetch.prune is on

**SYMPTOM** `git fetch <url> main:refs/remotes/origin/main` prints `- [deleted] (none) -> origin/main` before recreating it, so the next command sees a missing ref or a fast-forward that refuses.

**CAUSE** `fetch.prune=true` is set globally (`SETUP_AND_VERIFY.md` §4.1). Pruning applies to the destination namespace even when the source is an explicit URL rather than `origin`.

**FIX**

```bash
git -c fetch.prune=false -c credential.helper='!gh auth git-credential' fetch https://github.com/<owner>/<repo>.git main:refs/remotes/origin/main
```

**NEVER** Treat the delete as harmless and continue. Re-fetch with pruning off before branching or merging.

# 3  Build and TypeScript

### 3.1  A doubled quote in tsconfig.json reports as a Next.js config error

**SYMPTOM**

```text
Failed to transpile "next.config.ts"
```

…even though next.config.ts is perfectly valid.

**CAUSE** apps/web/tsconfig.json contained ""noUncheckedIndexedAccess": true, — one extra quote made the file invalid JSON. Next reads tsconfig.json while transpiling its own config, so the error names the wrong file.

**FIX** Validate JSON before trusting an error message that points elsewhere:

```bash
node -e "JSON.parse(require('fs').readFileSync('apps/web/tsconfig.json','utf8'))"
```

**NEVER** Start rewriting next.config.ts because the message says so. The message names the file that *triggered* the read, not the file that is broken.

**Lesson worth keeping:** when a config error names a file you did not edit, suspect the file it imported.

### 3.2  tsc fails in CI on generated Next.js types that only exist after a build

**SYMPTOM** Locally green, CI red with missing LayoutProps or similar generated types. Or tsc passes on your machine only because .next happens to exist.

**CAUSE** Next generates type helpers during next typegen / next build. A fresh clone has none.

**FIX** The web typecheck script must generate first:

```json
"typecheck": "next typegen && tsc --noEmit"
```

**NEVER** Commit .next or rely on it being present.

### 3.3  Next’s dev type validator breaks tsc under strict unused checks

**SYMPTOM** tsc reports unused imports in .next/dev/.../validator.ts, a file you never wrote.

**CAUSE** Next writes generated dev files into .next/dev, and noUnusedLocals applies to them.

**FIX** Exclude generated output from the tsconfig include:

```json
"exclude": ["node_modules", ".next", ".next/dev"]
```

### 3.4  Prettier fails on next-env.d.ts

**SYMPTOM** pnpm check fails in the format step on a file you did not create.

**CAUSE** Next regenerates next-env.d.ts with its own formatting.

**FIX** Add it to .prettierignore. Never reformat a generated file, and never delete it.

### 3.5  Next 16 Cache Components rejects a deliberately dynamic fetch during prerender

**SYMPTOM** Build fails with a prerender error about a blocking, uncached data access on a page that must stay dynamic.

**CAUSE** Cache Components expects every access to be cacheable or explicitly dynamic. A health check must never be cached.

**FIX** Declare the route dynamic:

```ts
export const instant = false;
```

…and keep cache: ‘no-store’ on the fetch itself.

**NEVER** “Fix” it by caching the health response. A cached health check is a lie.

### 3.6  pnpm build-script allowlists changed names between major versions

**SYMPTOM** A dependency that needs a postinstall step (esbuild, native modules) silently does not build, or pnpm warns about ignored build scripts.

**CAUSE** The config key for permitting dependency build scripts has changed across pnpm majors (historically onlyBuiltDependencies, now allowBuilds in newer releases).

**FIX** Check the actual version before editing config:

```bash
pnpm -v
```

Then use the key that version documents. Record the answer here once verified. If a native module misbehaves, pnpm rebuild &lt;pkg&gt; is the fastest check.

### 3.7  The Next scaffold generates its own AGENTS.md

**SYMPTOM** Two competing instruction files, and the agent starts following the generated one.

**CAUSE** create-next-app writes apps/web/AGENTS.md.

**FIX** Delete it and gitignore the path so it never returns. One constitution, at the root.

## 4  Database

### 4.1  Drizzle’s migration journal lands in a non-public schema

**SYMPTOM** \dt shows app_meta but **not** __drizzle_migrations, so you cannot prove the migration was recorded.

**CAUSE** drizzle-kit defaults migrations.schema to drizzle, not public.

**FIX** Pin it explicitly in drizzle.config.ts:

```ts
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  migrations: { schema: 'public', table: '__drizzle_migrations' },
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

Then re-apply from a clean volume, because the journal location changed:

```bash
docker compose down -v && pnpm db:up && pnpm db:migrate
```

**NEVER** Assume “no journal table” means “migration did not run”. Check both tables.

### 4.2  docker compose down -v deletes your local data

**SYMPTOM** Everything you seeded is gone.

**CAUSE** -v removes named volumes.

**FIX** Use plain docker compose down to stop and keep data. Use -v only when you intend a clean slate, and only ever against localhost.

### 4.3  Readiness and liveness are not the same question

**SYMPTOM** An orchestrator keeps restarting a healthy process, or traffic reaches a process that cannot serve it.

**CAUSE** One health endpoint answering two different questions.

**FIX** Keep them separate and test the separation:

- /health/live → is the process alive? Never touches dependencies, returns 200.

- /health/ready → can it serve traffic? Returns **503** when the database is unreachable.

Prove it by stopping Postgres and checking both:

```bash
docker compose stop postgres
curl -i localhost:8081/health/ready   # expect 503
curl -i localhost:8081/health/live    # expect 200
docker compose start postgres
```

## 5  Engine, 3D, and timing

### 5.1  Sixty-frames-per-second state in React state destroys the frame budget

**SYMPTOM** Stutter, dropped frames, and a component re-rendering thirty times a second.

**CAUSE** Per-frame values (camera, pose, cursor, parameter handles) pushed through useState or a context.

**FIX** Frame data lives in a mutable store read inside useFrame. React renders at UI frequency only — when a label, a message, or a control state actually changes.

**NEVER** “Optimise” by wrapping the hot path in useMemo. The problem is the re-render, not the identity.

### 5.2  Free browser speech synthesis has no word timestamps

**SYMPTOM** Gestures and cuts land late, early, or on the wrong word. The scene feels broken while every individual piece works.

**CAUSE** speechSynthesis fires start and end and nothing between. Word-anchored cues need per-word offsets.

**FIX** Use a TTS that emits word-boundary events behind the TtsProvider port. Fallback: proportional estimation from word lengths against measured audio duration, then hand-nudge — acceptable for a hand-authored reference scene, **not** acceptable as a permanent answer.

**NEVER** Build the cue resolver assuming timestamps exist. The port’s contract must make missing timings an explicit, typed case, not a silent zero.

### 5.3  A scale transition (dive-through) that is slightly wrong destroys spatial sense

**SYMPTOM** The learner loses track of where they are, and the scene reads as a glitch rather than a cut.

**CAUSE** Camera passing through geometry while near/far planes and FOV change without a matched swap point.

**FIX** Hand-author the reference implementation and treat it as the only approved one. Define exactly what interpolates: position, FOV, near/far, and which object is swapped at which instant. Golden-test it.

**NEVER** Let generated scenes use diveThrough until the reference passes. One good transition beats ten approximate ones.

### 5.4  Cue anchors that silently fall back to a default position

**SYMPTOM** The teacher points at empty space, occasionally.

**CAUSE** A missing anchor resolved to (0,0,0) instead of failing.

**FIX** A cue referencing an unknown anchor must fail validation with the anchor name and the cue ID. Loudly.

**NEVER** Add a default target. It converts a build error into a subtle, intermittent visual bug.

### 5.5  Model output arrives wrapped in markdown fences

**SYMPTOM** JSON parse error on output that looks perfectly correct in the log.

**CAUSE** ` `json ` fences around the payload.

**FIX** Strip fences at the parse boundary, retry once with a stricter instruction, then fail with the raw text attached. One retry, then loud failure.

## 6  Providers and cost

### 6.1  A model ID that worked last month is gone

**SYMPTOM** 404 or “model not found” from a provider that worked yesterday.

**CAUSE** Model identifiers are versioned and change. Provider catalogues differ from the vendor’s own docs.

**FIX** Never hardcode a guessed ID. Confirm with the provider’s model listing or OpenCode’s /models picker, then pin it in configuration. A release path never uses a floating latest alias.

### 6.2  Cost creeps in through the repair loop, not the main call

**SYMPTOM** A lesson costs several times the estimate.

**CAUSE** Each structured-output repair is a full extra call, and a failing prompt can repair five times.

**FIX** Bound the retries (one repair, then fail), log tokens per stage, and put a hard per-session ceiling in the ledger. Cheap models for repair and critic passes.

## 7  OpenCode and skills

### 7.1  Old agent frontmatter fields are ignored in V2

**SYMPTOM** Temperature or tool restrictions simply do not take effect.

**CAUSE** V2 deprecated top-level temperature, tools, permission, disable, and maxSteps in agent configuration.

**FIX** Use the current shapes: request.body for sampling parameters, permissions as an ordered rule list, and steps for the step ceiling.

**NEVER** Mix V1 and V2 fields and assume the newer one wins silently.

### 7.2  A skill that is not installed fails quietly

**SYMPTOM** An instruction says “use the X skill” and the agent proceeds without it.

**CAUSE** Skill IDs are path-derived and case-sensitive; a missing skill is simply not advertised.

**FIX** Ask OpenCode which skills it has before relying on one. If it is absent, say so and follow the written rule in AGENTS.md instead.

### 7.3  A stale code graph is worse than no graph

**SYMPTOM** graphify reports a function in a file that no longer exists.

**CAUSE** The graph was not rebuilt after a move or rename.

**FIX** graphify update . after any structural change. Treat graph edges as a map, never as evidence — read the file before claiming behaviour.

## 8  Process

### 8.1  “It works” without the command is not a report

**SYMPTOM** Confidence that evaporates on the next clean clone.

**CAUSE** Verifying from memory, or from a warm local state.

**FIX** Paste the command and its output. Run the fresh-clone check before declaring a milestone done.

### 8.2  Local green is not CI green

**SYMPTOM** “Works on my machine”, red on GitHub.

**CAUSE** Different OS, different Node, a missing lockfile entry, an env var that only exists locally.

**FIX** After every push, check the run for *your* commit before starting anything else. If local and CI disagree, CI is right.

### 8.3  Adding an entry

Copy the four-part shape. Be specific enough that the symptom is greppable. If you cannot name a symptom someone would search for, the entry probably belongs in an ADR instead.
