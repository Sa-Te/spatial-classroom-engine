import 'dotenv/config';

import { buildApp } from './app.js';
import { createDb, pingDatabase } from './db/client.js';

const port = Number(process.env.PORT ?? 8080);
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL is not set; readiness will report the database as down.');
}

const { pool } = createDb(
  connectionString ?? 'postgres://sce:sce_dev_password@localhost:5432/sce_dev',
);

const app = buildApp({ isReady: () => pingDatabase(pool) });

async function shutdown(): Promise<void> {
  await app.close();
  await pool.end();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  await pool.end();
  process.exit(1);
}
