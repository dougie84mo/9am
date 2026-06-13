# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# Supabase: no MCP for this project

The Supabase MCP server is NOT connected to 9AM. Do not call `apply_migration` /
`execute_sql` / `list_*` — they won't reach this project. All DB work is hand-off:
write the SQL, have the user run it, paste results back. See **SUPABASE-ACCESS.md**.
