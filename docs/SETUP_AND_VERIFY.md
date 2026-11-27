# SETUP_AND_VERIFY.md

**Repository destination:** `/docs/SETUP_AND_VERIFY.md` — repository root; machine setup, GitHub, git workflow, and per-step verification.

**Companion documents:** [AGENTS.md](../AGENTS.md) — rules and invariants, [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md) — architecture, contracts, and evaluations, [GOTCHAS.md](GOTCHAS.md) — known traps, [OPENCODE_SETUP.md](OPENCODE_SETUP.md) — multi-agent configuration

## 1  How to use this document

This is the **only** document you follow with your hands. Everything else describes *what* to build; this describes *how to get to a working machine* and *how to prove each step actually worked*.

Three rules:

1. **Do not skip a VERIFY block.** Every step ends with a command and an expected output. If the output does not match, stop and fix it before moving on. A skipped verification becomes a two-hour debugging session later.

2. **Run commands from the repository root** unless stated otherwise.

3. **Commit after every step that passes.** Small commits are recovery points. If step 9 goes wrong, you want to be able to git reset --hard back to step 8.

> **✎ What this document does NOT contain**
>
> No roadmaps, no phase timelines, no product scope. Those live in the specification and the roadmap. This document gets you from a blank machine to a green, verified, CI-protected repository — and nothing more.

## 2  What “setup done” means

You are finished with this document when **all fourteen** of these are true:

| **#** | **Condition** |
| --- | --- |
| 1 | Git is configured pswith your name, email, and a working SSH key |
| 2 | A public GitHub repository exists and is protected on main |
| 3 | pnpm install completes from a clean clone |
| 4 | pnpm dev starts both web and server |
| 5 | The web page renders and reports the API as healthy |
| 6 | /health/live returns 200 with a JSON body |
| 7 | /health/ready returns 200 only when Postgres is reachable |
| 8 | Stopping Postgres makes readiness fail while liveness still passes |
| 9 | A real migration has been applied and is visible in the database |
| 10 | pnpm check exits 0 (format, lint, typecheck) |
| 11 | pnpm test runs real behavioural tests and exits 0 |
| 12 | pnpm build produces production output for both apps |
| 13 | CI runs the same commands on a pull request and goes green |
| 14 | A second person (or a fresh clone in /tmp) reproduces all of the above in under 15 minutes |

Write these fourteen down. They are your definition of done for the setup phase, and the last one is the only one that really counts.

## 3  Step 1 — Machine prerequisites

### 3.1  Install

| **Tool** | **Version target** | **Why** |
| --- | --- | --- |
| **Git** | any current | version control |
| **Node.js** | **22 LTS or later** | runtime for web and server |
| **pnpm** | **10 or later** | workspace manager |
| **Docker Desktop** (or Docker Engine + Compose v2) | current | Postgres locally |
| **PostgreSQL client** (psql) | optional but useful | inspecting the database |
| **GitHub CLI** (gh) | current | repo creation, PR flow |
| **A modern Chromium browser** | current | 3D and Playwright |
| **OpenCode** | current | the coding agent (installed in Step 15) |

> **⚠ Windows**
>
> Use **WSL2 with Ubuntu**. Native Windows will work for part of this but will fight you on Docker volumes, file watching, and shell scripts. If you are on Windows, install WSL2 first and follow every command inside the Ubuntu shell.

### 3.2  VERIFY

```bash
git --version
node -v
corepack --version
pnpm -v
docker --version
docker compose version
gh --version
psql --version
```

**Pass looks like:** every command prints a version with no error. node -v prints v22.x.x or higher. docker compose version prints a v2 string.

**If it fails:**

- pnpm: command not found → corepack enable && corepack prepare pnpm@latest --activate

- docker compose unknown → you have legacy docker-compose; upgrade Docker Desktop

- Node too old → install via nvm (nvm install 22 && nvm use 22)

Record the exact versions you installed. You will pin them in Step 6.

## 4  Step 2 — Git identity and SSH

### 4.1  Identity

```bash
git config --global user.name "Sai Teja Akkireddy"
git config --global user.email "akkireddytj@gmail.com"
git config --global init.defaultBranch main
git config --global pull.rebase true
git config --global fetch.prune true
git config --global rebase.autoStash true
```

> **ℹ Email choice for a public repository**
>
> A public repo's commit history exposes your email to scrapers and spam. Two safe options:
>
> **Personal email** — fine, but expect spam over time.
>
> **GitHub noreply address** — find yours at *GitHub → Settings → Emails → Keep my email addresses private*. It looks like 12345678+Sa-Te@users.noreply.github.com.
>
> Whichever you choose, use it consistently. Changing it later rewrites history.

Also add a global ignore file so editor and OS noise never reaches a commit:

```bash
git config --global core.excludesfile ~/.gitignore_global
printf '.DS_Store\nThumbs.db\n.idea/\n.vscode/\n*.swp\n' > ~/.gitignore_global
```

### 4.2  SSH key

```bash
ssh-keygen -t ed25519 -C "akkireddytj@gmail.com"
# press Enter for the default path, then set a passphrase
eval "$(ssh-agent -s)" //passphrase here
ssh-add ~/.ssh/id_ed25519
gh auth login          # choose: GitHub.com → SSH → upload your public key → login with browser
```

### 4.3  VERIFY

```bash
git config --global user.name //Sa-Te
git config --global user.email //kennyukking@gmail.com
ssh -T git@github.com
gh auth status
```

**Pass looks like:**

- Your name and email print back.

- ssh -T prints **`Hi Sa-Te! You’ve successfully authenticated, but GitHub does not provide shell access.`** That sentence is a success, not an error.

- gh auth status shows you logged in with the repo and workflow scopes.

**If it fails:** ssh -T returning *Permission denied (publickey)* means the key was not uploaded — run gh ssh-key add ~/.ssh/id_ed25519.pub --title "laptop" and retry.

## 5  Step 3 — Create the GitHub repository

### 5.1  Create the folder and initialise git

```bash
mkdir -p ~/projects/spatial-classroom-engine
cd ~/projects/spatial-classroom-engine
git init -b main
```

### 5.2  First files

Create README.md:

```markdown
# Spatial Classroom Engine

An open-source, browser-first spatial AI classroom. A learner names any topic and a
3D AI teacher delivers a cinematic, grounded, manipulable lesson in a room — then
answers questions and hands over source-cited notes.

> **Status:** early development. Nothing here is stable yet.

## Documents

| Document | Purpose |
|---|---|
| `docs/SPEC.md` | What the product is, and V1/V2 scope |
| `docs/TECHNICAL_DESIGN.md` | How it is built (after setup) |
| `AGENTS.md` | Rules for coding agents |
| `docs/GOTCHAS.md` | Known traps |
| `docs/SETUP_AND_VERIFY.md` | This document |
| `docs/ROADMAP.md` | Phased delivery (after setup) |

## Licence

See `LICENSE`.
```

Create .gitignore:

```gitignore
# dependencies
node_modules/
.pnpm-store/

# builds
dist/
.next/
out/
build/
*.tsbuildinfo

# env and secrets
.env
.env.*
!.env.example
*.pem
*.key

# local data
.data/
uploads/
coverage/
playwright-report/
test-results/

# logs
*.log
npm-debug.log*

# OS / editor
.DS_Store
Thumbs.db
.idea/
.vscode/
```

Create LICENSE — pick one and mean it:

| **Licence** | **Choose if** | **Trade-off** |
| --- | --- | --- |
| **MIT** | You want maximum adoption and contributions | Anyone can close-source a fork |
| **Apache-2.0** | You want adoption **plus** an explicit patent grant | Slightly more ceremony |
| **AGPL-3.0** | You want hosted forks to stay open | Many companies refuse to touch it |

**Recommendation: Apache-2.0.** It is friendly to contributors and companies, and the patent grant matters for an AI project.

Add the full licence text from https://choosealicense.com/ — do not paste a partial file.

### 5.3  First commit

```bash
git add README.md .gitignore LICENSE
git commit -m "chore: initialise repository with readme, gitignore, and licence"
```

### 5.4  Create the remote and push

```bash
gh repo create spatial-classroom-engine \
  --public \
  --source=. \
  --remote=origin \
  --push \
  --description "Open-source browser-first spatial AI classroom: 3D AI teachers, cinema-directed lessons, manipulable demonstrations."
```

### 5.5  VERIFY

```bash
git remote -v
git log --oneline
gh repo view --web
```

**Pass looks like:**

- origin  git@github.com:Sa-Te/spatial-classroom-engine.git (push) — the **SSH** form, not HTTPS.

- One commit in the log.

- The repo opens in your browser with your README rendered.

**If it fails:** if the remote is an https:// URL, fix it now — authentication friction later is not worth it:

```bash
git remote set-url origin git@github.com:Sa-Te/spatial-classroom-engine.git
```

## 6  Step 4 — Repository settings and branch protection

Do these in the GitHub UI once; they save you from yourself forever.

### 6.1  Recommended settings

| **Setting** | **Location** | **Value** |
| --- | --- | --- |
| Default branch | Settings → General | main |
| Require PR before merging | Settings → Branches → add rule for main | **on** |
| Required approvals | same | **1** (or 0 while solo, see note) |
| Dismiss stale approvals | same | **on** |
| Require conversation resolution | same | **on** |
| Require status checks | same | check, test, build (added in Step 13) |
| Require branches to be up to date | same | **on** |
| Block force pushes | same | **on** |
| Block deletions | same | **on** |
| Allow squash merging only | Settings → General → Merge button | **on**; disable merge commits and rebase merging |
| Auto-delete head branches | same | **on** |
| Secret scanning + push protection | Settings → Code security | **on** |
| Dependabot alerts | same | **on** |
| Private vulnerability reporting | same | **on** |

> **✎ Solo developer, required approvals**
>
> While you are the only contributor, requiring 1 approval blocks you from merging your own PRs. Two options:
>
> Set required approvals to **0** but keep *everything else* on, so you still get the CI gate, the up-to-date check, and the squash merge. This is the pragmatic choice now.
>
> Or keep 1 approval and self-approve is impossible — you would need a second account.
>
> When a contributor joins, raise it to 1.

### 6.2  Labels to create

Create these under *Issues → Labels* so commits and PRs mean something:

type: feature, type: bug, type: chore, area: engine, area: ai, area: web, area: infra, area: docs, priority: high, priority: low, good first issue.

### 6.3  VERIFY

Open *Settings → Branches* and confirm a rule exists for main. Then:

```bash
gh api repos/Sa-Te/spatial-classroom-engine/branches/main/protection | head -20
```

**Pass looks like:** JSON describing the protection (or a 404 *Branch not protected* — which means the rule did not save; redo it).

**Proof it actually works:**

```bash
git checkout -b test/protection-check
echo test >> README.md
git commit -am "test: protection check"
git push -u origin test/protection-check
gh pr create --fill --draft
gh pr close --delete-branch
git checkout main
```

**Pass looks like:** the PR is created, and gh pr merge on it would be blocked until checks pass. If you can push directly to main with a pass, protection is not on.

## 7  Step 5 — Repository skeleton

Create the directory structure now, emptily. This is the shape the whole project will grow into, and it is worth getting right once.

```bash
mkdir -p apps/web apps/server
mkdir -p packages/contracts/src packages/timeline/src packages/config
mkdir -p docs/adr docs/intent
mkdir -p fixtures/reference-lesson
mkdir -p scripts
mkdir -p .github/workflows
```

Create .editorconfig:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false

[Makefile]
indent_style = tab
```

Create .nvmrc:

```text
22
```

Create .tool-versions (a single place recording what you actually installed):

```text
nodejs 22
pnpm 10
```

### 7.1  VERIFY

```bash
ls -a
find . -maxdepth 2 -type d -not -path './.git*' | sort
```

**Pass looks like:** the tree matches exactly what you created, apps/web and apps/server exist and are empty, and .nvmrc, .editorconfig, .tool-versions are present.

```bash
git add . && git commit -m "chore: add repository skeleton and editor/tooling config"
```

## 8  Step 6 — Workspace and the web app

### 8.1  Root package.json

Create it at the repository root:

```json
{
  "name": "spatial-classroom-engine",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "pnpm -r --parallel --filter \"./apps/*\" dev",
    "dev:web": "pnpm --filter @sce/web dev",
    "dev:server": "pnpm --filter @sce/server dev",
    "build": "pnpm -r --filter \"./apps/*\" build",
    "check": "pnpm format:check && pnpm lint && pnpm typecheck",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "pnpm -r --if-present lint",
    "typecheck": "pnpm -r --if-present typecheck",
    "test": "pnpm -r --if-present test",
    "db:up": "docker compose up -d postgres",
    "db:down": "docker compose down",
    "db:migrate": "pnpm --filter @sce/server db:migrate",
    "db:studio": "pnpm --filter @sce/server db:studio",
    "verify": "pnpm check && pnpm test && pnpm build"
  },
  "devDependencies": {
    "prettier": "^3.4.0",
    "typescript": "^5.7.0"
  }
}
```

> **ℹ `packageManager` is not decoration**
>
> It pins pnpm via Corepack so every machine and CI run uses the same version. Update it deliberately, in its own commit.

### 8.2  pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 8.3  Prettier config

.prettierrc.json:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

.prettierignore:

```text
node_modules
.next
dist
coverage
pnpm-lock.yaml
*.md
```

### 8.4  Create the Next.js app

```bash
pnpm create next-app@latest apps/web --ts --eslint --app --src-dir --import-alias "@/*" --no-tailwind --use-pnpm
```

Choose the answers explicitly so the setup is reproducible:

| **Prompt** | **Answer** |
| --- | --- |
| TypeScript | **Yes** |
| ESLint | **Yes** |
| Tailwind CSS | **No** for now (add deliberately later) |
| src/ directory | **Yes** |
| App Router | **Yes** |
| Turbopack | **Yes** |
| Import alias | @/* |

Then set the package name and enable strict TypeScript.

apps/web/package.json — change the "name" field to:

```json
"name": "@sce/web"
```

and add the scripts:

```json
"dev": "next dev --port 3000",
"build": "next build",
"start": "next start --port 3000",
"lint": "eslint .",
"typecheck": "tsc --noEmit",
"test": "vitest run --passWithNoTests"
```

apps/web/tsconfig.json — ensure strict is on and add the unused-locals guard:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

Add the test tooling:

```bash
pnpm --filter @sce/web add -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

apps/web/vitest.config.ts:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

apps/web/vitest.setup.ts:

```ts
import '@testing-library/jest-dom/vitest';
```

### 8.5  The first real page

Replace apps/web/src/app/page.tsx with a page that reports API health. This is not decoration — it proves the two apps can talk and gives you a visible target for step 7.

```tsx
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081';

type Health = { status: 'ok' | 'degraded'; service: string; version: string };

async function getHealth(): Promise<Health | null> {
  try {
    const res = await fetch(`${API_BASE}/health/live`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as Health;
  } catch {
    return null;
  }
}

export default async function Home() {
  const health = await getHealth();

  return (
    <main style={{ fontFamily: 'system-ui', padding: 48, maxWidth: 720 }}>
      <h1>Spatial Classroom Engine</h1>
      <p>A browser-first spatial AI classroom. Early development.</p>

      <section aria-labelledby="api-status">
        <h2 id="api-status">System status</h2>
        {health ? (
          <p>
            API: <strong>{health.status}</strong> — {health.service} v{health.version}
          </p>
        ) : (
          <p role="alert">
            API unreachable at <code>{API_BASE}</code>. Start it with{' '}
            <code>pnpm dev:server</code>.
          </p>
        )}
      </section>
    </main>
  );
}
```

Create apps/web/.env.example:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8081
```

### 8.6  VERIFY — web alone

```bash
pnpm install
pnpm dev:web
```

Open http://localhost:3000.

**Pass looks like:** the page renders with a heading, and it shows a **visible red-ish error saying the API is unreachable**. That red error is a pass right now, because the server does not exist yet. A blank page or an unhandled exception is a fail.

Stop with Ctrl+C.

```bash
git add . && git commit -m "feat(web): scaffold next.js app with api health indicator"
```

## 9  Step 7 — The server and its health endpoints

### 9.1  Create the server package

```bash
pnpm --filter @sce/server init   # if this errors, just create the folder manually
```

Simpler: create apps/server/package.json by hand.

```json
{
  "name": "@sce/server",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run"
  },
  "dependencies": {
    "fastify": "^5.2.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "vitest": "^2.1.0",
    "@types/node": "^22.10.0"
  }
}
```

apps/server/tsconfig.json:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"]
}
```

### 9.2  The application

apps/server/src/app.ts — build the Fastify instance without starting it, so tests can import it:

```ts
import Fastify, { type FastifyInstance } from 'fastify';

const VERSION = process.env.APP_VERSION ?? '0.0.0';

export type ReadinessChecker = () => Promise<boolean>;

export function buildApp(opts: { isReady?: ReadinessChecker } = {}): FastifyInstance {
  const app = Fastify({ logger: true });
  const isReady = opts.isReady ?? (async () => true);

  app.get('/health/live', async () => ({
    status: 'ok',
    service: 'sce-server',
    version: VERSION,
  }));

  app.get('/health/ready', async (_req, reply) => {
    const ready = await isReady().catch(() => false);
    if (!ready) {
      return reply.code(503).send({
        status: 'not_ready',
        service: 'sce-server',
        version: VERSION,
        checks: { database: 'down' },
      });
    }
    return {
      status: 'ready',
      service: 'sce-server',
      version: VERSION,
      checks: { database: 'up' },
    };
  });

  return app;
}
```

apps/server/src/index.ts:

```ts
import { buildApp } from './app.js';

const port = Number(process.env.PORT ?? 8081);
const app = buildApp();

app
  .listen({ port, host: '0.0.0.0' })
  .then((address) => app.log.info(`server listening at ${address}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
```

> **⚠ The split between app.ts and index.ts is deliberate**
>
> app.ts exports a factory; index.ts starts a process. This is what makes the server testable — a test imports buildApp() and calls app.inject(...) without binding a port. Keep this pattern forever: **never import a side-effecting module in a test.**

### 9.3  Tests that actually assert something

apps/server/src/app.test.ts:

```ts
import { describe, it, expect } from 'vitest';
import { buildApp } from './app.js';

describe('health endpoints', () => {
  it('reports liveness without touching dependencies', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: '/health/live' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok', service: 'sce-server' });
    await app.close();
  });

  it('reports readiness when the database check passes', async () => {
    const app = buildApp({ isReady: async () => true });
    const res = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(res.statusCode).toBe(200);
    expect(res.json().checks.database).toBe('up');
    await app.close();
  });

  it('returns 503 when the database check fails', async () => {
    const app = buildApp({ isReady: async () => false });
    const res = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(res.statusCode).toBe(503);
    expect(res.json().checks.database).toBe('down');
    await app.close();
  });

  it('returns 503 instead of crashing when the database check throws', async () => {
    const app = buildApp({
      isReady: async () => {
        throw new Error('connection refused');
      },
    });
    const res = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(res.statusCode).toBe(503);
    await app.close();
  });
});
```

> **✖ These tests are the standard, not the exception**
>
> Notice what they do: they assert **behaviour under four conditions**, including the failure and the throw. A test that only checks status === 200 in the happy path proves almost nothing. Every feature in this project is held to this bar — a test must be capable of failing for a real reason.

### 9.4  VERIFY — the API

```bash
pnpm install
pnpm dev:server
```

In a second terminal:

```bash
curl -i http://localhost:8081/health/live
curl -i http://localhost:8081/health/ready
```

**Pass looks like:**

```text
HTTP/1.1 200 OK
{"status":"ok","service":"sce-server","version":"0.0.0"}

HTTP/1.1 200 OK
{"status":"ready","service":"sce-server","version":"0.0.0","checks":{"database":"up"}}
```

Then stop the server and run the tests:

```bash
pnpm --filter @sce/server test
```

**Pass looks like:** 4 passed. If it says No test files found, your test file is not matching the pattern — check that it is named *.test.ts inside src/.

### 9.5  VERIFY — the two apps together

```bash
pnpm dev
```

Open http://localhost:3000.

**Pass looks like:** the page now shows **`API: ok — sce-server v0.0.0`** and the red error is gone. This is the first moment the system is real.

```bash
git add . && git commit -m "feat(server): add fastify app with liveness and readiness endpoints"
```

## 10  Step 8 — Shared contracts package

Small step, large payoff: one place for types that both apps import, so the API cannot drift from the client.

packages/contracts/package.json:

```json
{
  "name": "@sce/contracts",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

packages/contracts/src/health.ts:

```ts
export type HealthStatus = 'ok' | 'degraded' | 'ready' | 'not_ready';

export interface HealthResponse {
  status: HealthStatus;
  service: string;
  version: string;
  checks?: Record<string, 'up' | 'down'>;
}
```

packages/contracts/src/index.ts:

```ts
export * from './health.js';
```

Wire it in:

```bash
pnpm --filter @sce/server add @sce/contracts --workspace
pnpm --filter @sce/web add @sce/contracts --workspace
```

Then change the web page’s local Health type to import from the package:

```ts
import type { HealthResponse } from '@sce/contracts';
```

### 10.1  VERIFY

```bash
pnpm typecheck
```

**Pass looks like:** exit 0, no errors. Then deliberately break the contract to prove it works:

```bash
# temporarily rename a field in packages/contracts/src/health.ts, e.g. status -> state
pnpm typecheck
```

**Pass looks like:** **errors appear in both `apps/web` and `apps/server`.** That is the proof the contract is genuinely shared. Undo the change and confirm pnpm typecheck is clean again.

```bash
git add . && git commit -m "feat(contracts): add shared health contract package"
```

## 11  Step 9 — PostgreSQL, migrations, and real readiness

### 11.1  docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: sce-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: sce
      POSTGRES_PASSWORD: sce_dev_password
      POSTGRES_DB: sce_dev
    ports:
      - '5432:5432'
    volumes:
      - sce-pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U sce -d sce_dev']
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  sce-pgdata:
```

> **⚠ Dev credentials in a compose file are fine. Anywhere else is not.**
>
> This password is a local development convenience and is committed on purpose. Every real environment reads a secret from the environment. .env is gitignored; .env.example never contains a working secret.

### 11.2  Install the database layer

```bash
pnpm --filter @sce/server add drizzle-orm pg
pnpm --filter @sce/server add -D drizzle-kit @types/pg
```

apps/server/.env.example:

```dotenv
PORT=8081
DATABASE_URL=postgres://sce:sce_dev_password@localhost:5432/sce_dev
APP_VERSION=0.0.0
```

Copy it and load it. Add dotenv for local runs:

```bash
pnpm --filter @sce/server add dotenv
```

Update apps/server/src/index.ts to load it at the very top:

```ts
import 'dotenv/config';
```

Create apps/server/drizzle.config.ts:

```ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

Create apps/server/src/db/schema.ts:

```ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const appMeta = pgTable('app_meta', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

Create apps/server/src/db/client.ts:

```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString, max: 10 });
  return { db: drizzle(pool, { schema }), pool };
}

export async function pingDatabase(pool: Pool): Promise<boolean> {
  try {
    await pool.query('select 1');
    return true;
  } catch {
    return false;
  }
}
```

Add scripts to apps/server/package.json:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio"
```

### 11.3  Wire readiness to the database

Change apps/server/src/index.ts:

```ts
import 'dotenv/config';
import { buildApp } from './app.js';
import { createDb, pingDatabase } from './db/client.js';

const port = Number(process.env.PORT ?? 8081);
const { pool } = createDb(process.env.DATABASE_URL!);

const app = buildApp({ isReady: () => pingDatabase(pool) });

app
  .listen({ port, host: '0.0.0.0' })
  .then((address) => app.log.info(`server listening at ${address}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
```

### 11.4  Run it

```bash
pnpm db:up
pnpm --filter @sce/server db:generate
pnpm db:migrate
pnpm dev:server
```

### 11.5  VERIFY — four separate proofs

**Proof 1 — the database is running.**

```bash
docker compose ps
```

**Pass looks like:** sce-postgres with status Up (healthy).

**Proof 2 — the migration really landed.**

```bash
docker exec -it sce-postgres psql -U sce -d sce_dev -c '\dt'
```

**Pass looks like:** a table named app_meta **and** a __drizzle_migrations table. Both must be present — the second is proof the migration was recorded, not just executed.

**Proof 3 — readiness reflects reality.**

```bash
curl -i http://localhost:8081/health/ready
```

**Pass looks like:** 200 with “database”:“up”.

**Proof 4 — the failure path.** This is the one people skip, and it is the one that matters.

```bash
docker compose stop postgres
curl -i http://localhost:8081/health/ready     # expect 503, database down
curl -i http://localhost:8081/health/live      # expect 200, still ok
docker compose start postgres
sleep 5
curl -i http://localhost:8081/health/ready     # expect 200 again
```

**Pass looks like:** exactly that sequence. Readiness failing while liveness passes is the entire point of having two endpoints: an orchestrator must not kill a healthy process just because its database blipped.

```bash
git add . && git commit -m "feat(server): add postgres, drizzle migrations, and database-backed readiness"
```

## 12  Step 10 — One command interface

Add these root scripts (already present in Step 6) and confirm they work. pnpm scripts are the canonical interface — they work identically on macOS, Linux, Windows, and in CI, with no tab-vs-space traps.

| **Command** | **Does** |
| --- | --- |
| pnpm dev | web + server together |
| pnpm dev:web | web only |
| pnpm dev:server | server only |
| pnpm db:up / pnpm db:down | Postgres container |
| pnpm db:migrate | apply migrations |
| pnpm check | format check + lint + typecheck |
| pnpm test | all unit tests |
| pnpm build | production build |
| pnpm verify | check + test + build — **the one command that means "is this good?"** |

> **ℹ Optional Makefile**
>
> If you prefer make, create one with .PHONY targets that shell out to the pnpm scripts. Use **real tab characters** for recipe lines — spaces produce missing separator. Keep pnpm as the source of truth so CI never diverges from your local flow.

### 12.1  VERIFY

```bash
pnpm verify
```

**Pass looks like:** three stages run in order and the command exits 0. Copy the output into a scratch note — this is your baseline "everything is fine" snapshot.

## 13  Step 11 — Environment hygiene

Create .env.example at the repository root so a newcomer knows every variable that exists:

```dotenv
# --- app ---
APP_ENV=development
APP_VERSION=0.0.0
MOCK_MODE=true

# --- web ---
NEXT_PUBLIC_API_BASE_URL=http://localhost:8081

# --- server ---
PORT=8081
DATABASE_URL=postgres://sce:sce_dev_password@localhost:5432/sce_dev

# --- providers (leave empty; MOCK_MODE=true means none are required) ---
LLM_PROVIDER=
LLM_API_KEY=
LLM_MODEL=

# --- not yet used; declared now so nobody guesses later ---
TTS_PROVIDER=
STT_PROVIDER=
SEARCH_PROVIDER=
```

Create a scripts/check-env.mjs that fails loudly if a required variable is missing:

```js
import 'dotenv/config';

const REQUIRED = ['DATABASE_URL'];

const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables:\n  ${missing.join('\n  ')}`);
  console.error('\nCopy .env.example to .env and fill it in.');
  process.exit(1);
}

console.log('Environment looks valid.');
```

### 13.1  VERIFY

```bash
node scripts/check-env.mjs          # with no .env present: expect exit 1 and a clear message
cp .env.example .env
node scripts/check-env.mjs          # expect: Environment looks valid.
```

**Pass looks like:** the first run **fails with a helpful message** (a silent success would be the bug), and the second passes.

Also confirm .env cannot be committed:

```bash
git status --short
```

**Pass looks like:** .env does **not** appear. If it does, your .gitignore is wrong — fix it before committing anything.

## 14  Step 12 — CI

.github/workflows/ci.yml:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    name: check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm check

  test:
    name: test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: sce
          POSTGRES_PASSWORD: sce_dev_password
          POSTGRES_DB: sce_test
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U sce -d sce_test"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      DATABASE_URL: postgres://sce:sce_dev_password@localhost:5432/sce_test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  build:
    name: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

> **⚠ Least privilege and fork safety**
>
> Add this at the top of the workflow so a fork PR can never touch your secrets:
>
> And never add pull_request_target with a checkout of the PR head. Secrets granted to an untrusted PR are how supply-chain attacks land.

### 14.1  VERIFY

```bash
git add . && git commit -m "ci: add check, test, and build workflow"
git push
```

Then open the **Actions** tab.

**Pass looks like:** three jobs — check, test, build — all green. If pnpm install --frozen-lockfile fails, you forgot to commit pnpm-lock.yaml; that file must be in the repository.

Now register the checks as required:

*Settings → Branches → main → Edit → Require status checks to pass → select `check`, `test`, `build`.*

## 15  Step 13 — Git workflow

This is the discipline that keeps a solo project from becoming an archaeology exercise. It is not bureaucracy — it is your memory.

### 15.1  Branches

```text
main                     always green, always deployable, never committed to directly
feat/<scope>-<slug>      new capability        feat/engine-camera-director
fix/<scope>-<slug>       defect repair         fix/server-ready-503
chore/<slug>             tooling, deps, config chore/pin-node-22
docs/<slug>              documentation only    docs/setup-verify
refactor/<scope>-<slug>  behaviour-preserving  refactor/timeline-pure-resolver
test/<scope>-<slug>      test-only             test/validator-negative-cases
```

One branch, one purpose. If you cannot name it, the slice is too big.

```bash
git switch main && git pull
git switch -c feat/engine-camera-primitives
```

### 15.2  Commits — Conventional Commits

```text
<type>(<scope>): <subject>

[optional body: why, not what]

[optional footer: BREAKING CHANGE:, Refs: #12]
```

| **Type** | **Use for** |
| --- | --- |
| feat | a user-visible capability |
| fix | a defect |
| refactor | same behaviour, better shape |
| test | tests only |
| docs | documentation only |
| chore | tooling, deps, config |
| perf | measured improvement |
| ci | pipeline changes |
| build | build system changes |

**Subject:** imperative mood, lowercase, no full stop, ≤ 72 characters. feat(engine): add camera push-in primitive — not added push in camera.

**Body:** explain *why*, because the diff already explains *what*.

```text
fix(server): keep readiness separate from liveness

A single health endpoint caused the orchestrator to restart a healthy
process whenever Postgres blipped. Liveness now answers "is the process
alive", readiness answers "can it serve traffic".
```

### 15.3  The loop

```bash
# 1. start
git switch main && git pull
git switch -c feat/engine-cue-sheet-schema

# 2. work in small commits
git add -p                       # stage hunks deliberately, not files blindly
git commit -m "feat(engine): add cue sheet zod schema"

# 3. keep up to date
git fetch origin
git rebase origin/main

# 4. verify before review
pnpm verify

# 5. open a PR
git push -u origin HEAD
gh pr create --fill --web

# 6. after merge, tidy
git switch main && git pull
git branch -d feat/engine-cue-sheet-schema
```

### 15.4  Pull request template

.github/pull_request_template.md:

```markdown
## What changed

## Why

## How I verified
- [ ] `pnpm verify` passes locally
- [ ] Manual check: _describe what you did in the browser_
- [ ] Failure path checked: _what happens when the dependency is down_

## Contract / migration impact

## Screenshots or output

## Risks and follow-ups
```

### 15.5  Tags and releases

```bash
git tag -a v0.1.0 -m "v0.1.0 — first runnable walking skeleton"
git push origin v0.1.0
gh release create v0.1.0 --generate-notes --title "v0.1.0 Walking Skeleton"
```

Semantic versioning, with a rule that suits a pre-1.0 project: 0.MINOR.PATCH where **MINOR** is a meaningful capability milestone and **PATCH** is fixes. Anything that breaks a public schema bumps MINOR and says so in the release notes.

### 15.6  Recovering from a mess

| **Situation** | **Command** |
| --- | --- |
| Undo last commit, keep changes | git reset --soft HEAD~1 |
| Unstage a file | git restore --staged path |
| Discard local changes to a file | git restore path |
| Nuke everything, return to last commit | git reset --hard HEAD |
| Find a lost commit | git reflog, then git switch -c rescue &lt;sha&gt; |
| Undo a pushed commit safely | git revert &lt;sha&gt; (never reset on shared history) |
| See what a branch changed | git diff main...HEAD --stat |

### 15.7  VERIFY

```bash
git log --oneline --graph --decorate -15
gh pr list --state all --limit 5
```

**Pass looks like:** a readable, mostly-linear history where each commit message tells you why the change exists, and at least one PR you created and merged through the gate.

## 16  Step 14 — Install and point OpenCode at the repo

Do this **after** the repository is green, so the agent inherits a working baseline instead of learning from a broken one.

```bash
curl -fsSL https://opencode.ai/install | bash
opencode --version
cd ~/projects/spatial-classroom-engine
opencode
```

Inside the TUI:

1. /connect → choose your provider → enter the key. Credentials are stored in OpenCode’s own data directory, never in the repository.

2. /models → select the exact model ID shown. Do not assume a model name; use what the picker offers.

3. **Do not run `/init` yet.** It generates an AGENTS.md from the repo, and we are about to write a better one by hand. Running it first would give the agent a mediocre constitution that it then defends.

Create opencode.json at the repository root:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "share": "disabled",
  "instructions": ["AGENTS.md"]
}
```

> **✎ Why instructions is a single file for now**
>
> Loading every document into every request burns context and money and dilutes attention. AGENTS.md should tell the agent *which* document to read *for which kind of task*. Add more entries only when you observe it consistently missing something.

### 16.1  VERIFY

```bash
opencode --version
ls -a | grep opencode.json
git status --short
```

**Pass looks like:** a version prints, opencode.json exists, and git status shows **no** credential files. If you see auth.json or any key material in the working tree, stop and remove it from the repository before committing.

Then a smoke test inside OpenCode:

```text
Explain what apps/server/src/app.ts does and why it is split from index.ts.
Do not change any files.
```

**Pass looks like:** an accurate answer that mentions testability. If it hallucinates, the repository is not self-describing enough yet — that is the feedback loop this whole setup exists to create.

## 17  The verification matrix

Print this. Tape it to the wall. Every line is one command and one expectation.

| **#** | **Layer** | **Command** | **Pass** |
| --- | --- | --- | --- |
| 1 | Prerequisites | node -v && pnpm -v && docker --version | three versions, no errors |
| 2 | Git identity | git config --global user.email | your address |
| 3 | SSH | ssh -T git@github.com | Hi Sa-Te! You’ve successfully authenticated |
| 4 | Remote | git remote -v | git@github.com:... |
| 5 | Protection | gh api repos/Sa-Te/spatial-classroom-engine/branches/main/protection | JSON, not 404 |
| 6 | Install | pnpm install | completes, lockfile unchanged |
| 7 | Database up | docker compose ps | Up (healthy) |
| 8 | Migration applied | docker exec -it sce-postgres psql -U sce -d sce_dev -c ‘\dt’ | app_meta + __drizzle_migrations |
| 9 | Liveness | curl -i localhost:8081/health/live | 200, “status”:“ok” |
| 10 | Readiness up | curl -i localhost:8081/health/ready | 200, “database”:“up” |
| 11 | Readiness down | stop Postgres, then curl -i localhost:8081/health/ready | 503, “database”:“down”; liveness still 200 |
| 12 | Web sees API | open localhost:3000 | API: ok — sce-server v0.0.0 |
| 13 | Contract shared | break a field, pnpm typecheck | errors in **both** apps |
| 14 | Failure UX | stop the server, reload the page | visible, actionable error — not a blank page |
| 15 | Tests | pnpm test | all pass, ≥ 4 tests run |
| 16 | Full gate | pnpm verify | exit 0 |
| 17 | CI | open a PR | check, test, build all green |
| 18 | Fresh clone | git clone &lt;repo&gt; /tmp/sce && cd /tmp/sce && pnpm install && pnpm dev | works, under 15 minutes |

Row 18 is the only row that cannot be faked. Do it before you declare setup finished.

## 18  Common failures and what they actually mean

| **Symptom** | **Real cause** | **Fix** |
| --- | --- | --- |
| ERR_PNPM_WORKSPACE_PKG_NOT_FOUND | package name doesn’t match the workspace glob | check “name” in each package.json and pnpm-workspace.yaml |
| pnpm install --frozen-lockfile fails in CI but works locally | pnpm-lock.yaml not committed | git add pnpm-lock.yaml |
| Port 3000 or 8081 in use | an old process still running | lsof -i :3000 then kill &lt;pid&gt; |
| ECONNREFUSED ::1:5432 | Postgres bound to IPv4 only, Node resolving localhost to IPv6 | use 127.0.0.1 in DATABASE_URL |
| password authentication failed | .env still has the example password after you changed compose | make them match, then pnpm db:down && pnpm db:up |
| relation “app_meta” does not exist | migrations were generated but never applied | pnpm db:migrate |
| Readiness stuck at 503 for a minute | Postgres container starting | docker compose logs postgres, wait for database system is ready |
| tsc: not found in a package | dependency installed at the root only | add typescript to that package’s devDependencies |
| Web page throws during build | a fetch at module scope | fetch inside the component, use cache: ‘no-store’ |
| OpenCode model missing in /models | provider/account does not expose it | update OpenCode, re-run /connect, use the exact ID shown |
| git push rejected on main | branch protection working as designed | that is a pass — open a PR instead |
| Docker volume weirdness after a version change | stale data directory | docker compose down -v (**this deletes local data**) |

### 18.1  Safe reset

```bash
pnpm db:down
docker compose down -v          # DELETES the local database volume
pnpm db:up
pnpm db:migrate
pnpm dev
```

> **✖ Never run a reset against anything but localhost**
>
> down -v is irreversible. Confirm DATABASE_URL points at localhost before running it.

## 19  Final checklist

Tick every line. When they are all ticked, the setup phase is complete and the next documents can be written against a real, working repository.

☐ Node 22+, pnpm 10+, Docker, gh, and OpenCode installed and version-checked

☐ Git name, email, and user.email privacy choice made

☐ SSH key uploaded; ssh -T git@github.com authenticates

☐ Public repo created, remote is SSH, README and LICENSE committed

☐ main protected; force pushes blocked; squash merges only

☐ Skeleton directories in place; .editorconfig, .nvmrc, .tool-versions committed

☐ pnpm workspace with @sce/web and @sce/server

☐ Web page renders and reports API status

☐ Server exposes /health/live and /health/ready

☐ Four server tests pass, including the throw and the 503 path

☐ @sce/contracts shared; breaking it breaks **both** apps

☐ Postgres in Docker; migration applied; app_meta and __drizzle_migrations exist

☐ Readiness drops to 503 when Postgres stops, while liveness stays 200

☐ .env.example complete; .env gitignored; check-env.mjs fails helpfully

☐ pnpm verify exits 0

☐ CI green on a real pull request

☐ Branch protection requires check, test, build

☐ At least one PR merged through the gate

☐ v0.1.0 tagged

☐ OpenCode installed, connected, opencode.json committed, no secrets in the tree

☐ **Fresh clone in `/tmp` reproduces everything in under 15 minutes**

That last one is the gate. Everything above it is a claim; that line is the proof.

## 20  What comes next

Setup is done when the checklist is complete. Then, in this order:

1. **`docs/TECHNICAL_DESIGN.md`** — architecture, module boundaries, ports, schemas, data model, evaluation design.

2. **`AGENTS.md`** — the coding-agent constitution: invariants, commands, testing bar, scope rules, documentation duties.

3. **`docs/GOTCHAS.md`** — the traps discovered while building, written down so they are paid for once.

4. **`docs/ROADMAP.md`** — phases with **definitions of done**, effort estimates, and a scope-cut rule instead of dates.

Only after those four exist does the first feature branch make sense. The repository is now a place where good work is verifiable — which is the entire purpose of this document.
