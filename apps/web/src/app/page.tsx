import type { HealthResponse } from '@sce/contracts';

export const instant = false;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081';

async function getHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/health/live`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as HealthResponse;
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
            API unreachable at <code>{API_BASE}</code>. Start it with <code>pnpm dev:server</code>.
          </p>
        )}
      </section>
    </main>
  );
}
