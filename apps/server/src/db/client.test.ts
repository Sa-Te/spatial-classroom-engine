import 'dotenv/config';

import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';
import { createDb, pingDatabase } from './client.js';

describe('pingDatabase', () => {
  it('returns false against an unreachable database', async () => {
    const pool = new Pool({
      connectionString: 'postgres://nobody:nobody@127.0.0.1:1/nothing',
      connectionTimeoutMillis: 500,
    });

    try {
      await expect(pingDatabase(pool)).resolves.toBe(false);
    } finally {
      await pool.end().catch(() => undefined);
    }
  });

  const databaseUrl = process.env.DATABASE_URL;

  it.skipIf(!databaseUrl)('returns true against the configured database', async () => {
    const { pool } = createDb(databaseUrl as string);

    try {
      await expect(pingDatabase(pool)).resolves.toBe(true);
    } finally {
      await pool.end();
    }
  });
});
