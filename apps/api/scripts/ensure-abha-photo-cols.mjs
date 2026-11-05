import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/infra/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, '../migrations/011_abha_profile_photo.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

try {
  await pool.query(sql);
  const abha = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'abha_links'
      AND column_name IN ('photo_url','gender','mobile','meta','date_of_birth')
    ORDER BY 1`);
  const users = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name IN ('abha_photo_url','mobile_phone')
    ORDER BY 1`);
  console.log('abha_links:', abha.rows.map((r) => r.column_name).join(', ') || '(none)');
  console.log('users:', users.rows.map((r) => r.column_name).join(', ') || '(none)');
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
