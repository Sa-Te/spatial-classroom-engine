import { existsSync, readFileSync } from 'node:fs';

const ENV_FILE = '.env';
const REQUIRED = ['DATABASE_URL'];

function parseEnvFile(path) {
  const values = {};

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) value = value.slice(1, -1);

    values[key] = value;
  }

  return values;
}

const fileValues = existsSync(ENV_FILE) ? parseEnvFile(ENV_FILE) : {};
const env = { ...fileValues, ...process.env };
const missing = REQUIRED.filter((name) => !env[name]);

if (missing.length > 0) {
  console.error('Missing required environment variables:');
  for (const name of missing) console.error(`  - ${name}`);
  console.error('');
  console.error(`Copy ${ENV_FILE}.example to ${ENV_FILE} and fill in the required values:`);
  console.error(`  cp ${ENV_FILE}.example ${ENV_FILE}`);
  process.exit(1);
}

console.log('Environment looks valid.');
