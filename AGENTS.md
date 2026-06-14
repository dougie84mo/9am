# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# Supabase: no MCP for this project

The Supabase MCP server is NOT connected to 9AM — do not call `apply_migration` /
`execute_sql` / `list_*`, they won't reach this project. Instead run SQL through
`scripts/db.mjs` (`npm run db -- "<sql>"` or `node scripts/db.mjs --file x.sql`),
which uses the connection string in the gitignored `scripts/db.env`. If that file
isn't present, fall back to hand-off (write SQL, user runs it). See
**SUPABASE-ACCESS.md**.
