const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: '/home/jjhbk/seedhape/apps/api/.env' });

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const queries = [
    "select to_regclass('public.waitlist_signups') as waitlist_signups, to_regclass('public.contact_submissions') as contact_submissions",
    "select indexname from pg_indexes where schemaname='public' and indexname in ('merchants_status_heartbeat_idx','orders_status_expires_idx') order by indexname",
    "select id, created_at, hash from drizzle.__drizzle_migrations order by created_at"
  ];
  for (const sql of queries) {
    const r = await client.query(sql);
    console.log('\n-- ' + sql + '\n' + JSON.stringify(r.rows, null, 2));
  }
  await client.end();
})().catch((e)=>{console.error(e);process.exit(1);});
