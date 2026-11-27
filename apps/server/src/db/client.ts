import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString });

  // Idle client failures surface as pool errors. Readiness reports them via pingDatabase;
  // without this listener Node would treat them as unhandled and crash the process.
  pool.on('error', () => undefined);

  const db = drizzle(pool, { schema });

  return { db, pool };
}

export async function pingDatabase(pool: Pool): Promise<boolean> {
  try {
    await pool.query('select 1');
    return true;
  } catch {
    return false;
  }
}
