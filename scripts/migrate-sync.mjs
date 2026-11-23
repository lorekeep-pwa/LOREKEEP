import { readdir, readFile } from 'node:fs/promises';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) {
  throw new Error('DATABASE_URL_UNPOOLED is required. Pull Neon variables into .env.neon.local first.');
}

const migrationsDirectory = new URL('../migrations/', import.meta.url);
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((file) => /^\d+_.+\.sql$/u.test(file))
  .sort();
const connection = new URL(connectionString);
// Pin full certificate and hostname verification for compatibility with pg 9+.
connection.searchParams.set('sslmode', 'verify-full');
const pool = new Pool({ connectionString: connection.toString(), max: 1 });
try {
  for (const file of migrationFiles) {
    const migration = await readFile(new URL(file, migrationsDirectory), 'utf8');
    await pool.query(migration);
  }
  process.stdout.write(`LOREKEEP encrypted sync schema is ready (${migrationFiles.length} migrations).\n`);
} finally {
  await pool.end();
}
