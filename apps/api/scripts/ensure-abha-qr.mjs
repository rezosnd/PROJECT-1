import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/infra/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(__dirname, '../migrations/012_abha_qr_code.sql'), 'utf8');
await pool.query(sql);
const r = await pool.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'abha_links' AND column_name LIKE 'qr%'
  ORDER BY 1`);
console.log('qr cols:', r.rows.map((x) => x.column_name).join(', ') || '(none)');
process.exit(0);
