import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, '../migrations/011_abha_profile_photo.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

try {
  await pool.query(sql);
  const cols = await pool.query(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE (table_name = 'users' AND column_name IN ('abha_photo_url', 'mobile_phone'))
        OR (table_name = 'abha_links' AND column_name IN ('photo_url', 'gender', 'date_of_birth', 'mobile', 'meta'))
     ORDER BY table_name, column_name`
  );
  console.log('011 migration OK');
  console.log(cols.rows);
} catch (err) {
  console.error('011 migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
