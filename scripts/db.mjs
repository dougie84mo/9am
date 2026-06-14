/**
 * Ad-hoc SQL runner for the 9AM Supabase project — our stand-in for the (now
 * disconnected) Supabase MCP server. See SUPABASE-ACCESS.md.
 *
 * Connection string is read from, in order:
 *   1. process.env.SUPABASE_DB_URL
 *   2. scripts/db.env   (a gitignored file: `SUPABASE_DB_URL=postgresql://...`)
 *
 * Get the string from the dashboard: Project Settings → Database → Connection
 * string → URI. Use the **Session / direct** one (port 5432) so multi-statement
 * SQL (migrations) works — the transaction pooler (6543) rejects some of it.
 *
 * Usage:
 *   node scripts/db.mjs "select count(*) from public.profiles"
 *   node scripts/db.mjs --file supabase/migrations/0009_whatever.sql
 */
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

function loadUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL.trim();
  try {
    const txt = readFileSync(new URL('./db.env', import.meta.url), 'utf8');
    const m = txt.match(/^\s*SUPABASE_DB_URL\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  } catch {
    /* no file — fall through */
  }
  return null;
}

const url = loadUrl();
if (!url) {
  console.error(
    'No connection string found.\n' +
      'Put `SUPABASE_DB_URL=postgresql://...` in scripts/db.env ' +
      '(or export SUPABASE_DB_URL). See SUPABASE-ACCESS.md.',
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const fileIdx = args.indexOf('--file');
const sql = fileIdx !== -1 ? readFileSync(args[fileIdx + 1], 'utf8') : args.join(' ');
if (!sql || !sql.trim()) {
  console.error('No SQL provided. Pass a query string or `--file path.sql`.');
  process.exit(1);
}

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false }, // Supabase requires SSL
});

try {
  await client.connect();
  const res = await client.query(sql);
  for (const r of Array.isArray(res) ? res : [res]) {
    if (r.rows && r.rows.length) console.log(JSON.stringify(r.rows, null, 2));
    else console.log(`(${r.command ?? 'OK'} — ${r.rowCount ?? 0} rows affected)`);
  }
} catch (e) {
  console.error('SQL error:', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
