import pg from 'pg';

const c = new pg.Client({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://neondb_owner:npg_qOpx8as5RBIe@ep-soft-water-bd20h9y8-pooler.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require',
});

await c.connect();

const hospitals = await c.query(
  'SELECT status, count(*)::int AS count FROM hospitals GROUP BY status ORDER BY status'
);
console.log('hospitals_by_status', hospitals.rows);

const sample = await c.query(
  'SELECT id, name, status, city FROM hospitals ORDER BY name LIMIT 10'
);
console.log('sample_hospitals', sample.rows);

const users = await c.query(
  'SELECT email, role, status FROM users ORDER BY created_at DESC LIMIT 15'
);
console.log('recent_users', users.rows);

const tables = await c.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1"
);
console.log(
  'tables',
  tables.rows.map((r) => r.table_name)
);

const cols = await c.query(
  "SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position"
);
console.log(
  'users_columns',
  cols.rows.map((r) => r.column_name)
);

await c.end();
