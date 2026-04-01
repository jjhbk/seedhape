const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: '/home/jjhbk/seedhape/apps/api/.env' });

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  async function q(sql) {
    const r = await client.query(sql);
    console.log('\n-- ' + sql + '\n' + JSON.stringify(r.rows, null, 2));
    return r.rows;
  }

  await q("select to_regclass('drizzle.__drizzle_migrations') as regclass");
  await q("select n.nspname as schema, t.typname as type from pg_type t join pg_namespace n on n.oid=t.typnamespace where t.typname='dispute_resolution'");
  const rows = await q("select to_regclass('drizzle.__drizzle_migrations') as regclass");
  if (rows[0] && rows[0].regclass) {
    await q('select id, created_at, hash from drizzle.__drizzle_migrations order by created_at');
  }

  await client.end();
})().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
