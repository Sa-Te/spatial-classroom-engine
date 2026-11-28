import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The package must run under plain Node, with no jsdom and no DOM shim. If a
// stray `window` ever appears this declaration keeps it typed as unknown, so
// the assertion below still compiles without a cast to any.
declare const window: unknown;

// Patterns that would make the timeline impure: a wall clock, a network call, a
// filesystem read, or randomness. Each is an invariant in AGENTS.md §1 (pure
// resolver, clock injected, no I/O inside the engine).
const FORBIDDEN_PATTERNS = [
  'Date.now',
  'performance.now',
  'fetch',
  'node:fs',
  'Math.random',
] as const;

const SRC_DIR = new URL('.', import.meta.url);

// Reported as `relativePath:lineNumber pattern`, the shape a reviewer needs to
// open the offending line without searching.
function detectHits(relativePath: string, source: string): string[] {
  return source
    .split('\n')
    .flatMap((line, index) =>
      FORBIDDEN_PATTERNS.filter((pattern) => line.includes(pattern)).map(
        (pattern) => `${relativePath}:${index + 1} ${pattern}`,
      ),
    );
}

// Sorted so a failure lists every hit in a stable order.
const sourceFiles = readdirSync(SRC_DIR, { recursive: true, encoding: 'utf8' })
  .filter((entry) => entry.endsWith('.ts') && !entry.endsWith('.test.ts'))
  .sort();

const hits = sourceFiles.flatMap((entry) =>
  detectHits(`src/${entry}`, readFileSync(new URL(entry, SRC_DIR), 'utf8')),
);

describe('package purity', () => {
  it('scans at least one source file, so a clean result cannot be vacuous', () => {
    expect(sourceFiles.length).toBeGreaterThanOrEqual(1);
  });

  it('imports no wall clock, network, filesystem or randomness in src', () => {
    expect(hits).toEqual([]);
  });

  it('reports the file and line of the offending source', () => {
    const source = [
      'const startedMs = Date.now();',
      'const elapsedMs = performance.now();',
      'await fetch(url);',
      "import { readFile } from 'node:fs';",
      'const jitter = Math.random();',
      'const untouchedMs = 0;',
    ].join('\n');

    expect(detectHits('src/probe.ts', source)).toEqual([
      'src/probe.ts:1 Date.now',
      'src/probe.ts:2 performance.now',
      'src/probe.ts:3 fetch',
      'src/probe.ts:4 node:fs',
      'src/probe.ts:5 Math.random',
    ]);
  });

  it('runs under plain Node, so window is undefined and jsdom is not required', () => {
    expect(typeof window).toBe('undefined');
  });
});
