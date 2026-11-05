import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL || 'postgres://cityhealth_user:cityhealth_secret_password@localhost:5432/cityhealth';

const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

async function runMigrations(direction = 'up') {
  console.log(`[Migration] Starting migrations (direction: ${direction})...`);
  await client.connect();

  try {
    // Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS pgmigrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        run_on TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.resolve(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (direction === 'up') {
      const { rows } = await client.query('SELECT name FROM pgmigrations');
      const applied = new Set(rows.map(r => r.name));

      for (const file of files) {
        if (!applied.has(file)) {
          console.log(`[Migration] Applying ${file}...`);
          const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
          await client.query('BEGIN');
          try {
            await client.query(sql);
            await client.query('INSERT INTO pgmigrations (name) VALUES ($1)', [file]);
            await client.query('COMMIT');
            console.log(`[Migration] Applied ${file} successfully.`);
          } catch (err) {
            await client.query('ROLLBACK');
            console.error(`[Migration] Failed to apply ${file}:`, err.message);
            throw err;
          }
        } else {
          console.log(`[Migration] Already applied ${file}`);
        }
      }
      console.log('[Migration] All pending migrations executed successfully.');
    } else if (direction === 'down') {
      console.log('[Migration] Rollback requested: dropping all public tables and custom types...');
      await client.query(`
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO PUBLIC;
      `);
      console.log('[Migration] Rollback completed: public schema recreated.');
    }
  } finally {
    await client.end();
  }
}

const direction = process.argv[2] || 'up';
runMigrations(direction).catch(err => {
  console.error('[Migration] Migration process error:', err);
  process.exit(1);
});

