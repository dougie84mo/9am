# Supabase access — read me before any DB work

**Status (2026-06-13):** the Supabase **MCP server is no longer connected to this
project**. It was repointed at two other projects in another org. So Claude can
**not** run `apply_migration` / `execute_sql` / `list_*` against 9AM anymore.
Until 9AM is moved under that same org/project, all Supabase work is **hand-off**:
Claude writes the SQL, **you run it**, and paste any output back.

## Project identity

| | |
| --- | --- |
| Name | **9AM** |
| Project ref | **`mpoqizpadjfoqgqfpnop`** |
| Dashboard | https://supabase.com/dashboard/project/mpoqizpadjfoqgqfpnop |
| SQL editor | https://supabase.com/dashboard/project/mpoqizpadjfoqgqfpnop/sql |
| DB host | `db.mpoqizpadjfoqgqfpnop.supabase.co` (Postgres 17) |
| App env | `.env` → `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

The app itself is unaffected — it talks to Supabase with the anon key in `.env`.
Only the *Claude → DB admin channel* changed.

## Preferred: scripted direct access (`scripts/db.mjs`)

This restores Claude's ability to run SQL directly (for testing/verification and
applying migrations) without the MCP, using a Postgres connection string.

**One-time setup (you):**
1. Dashboard → **Project Settings → Database → Connection string → URI**. Use the
   **Session / direct** string (port **5432**), not the transaction pooler
   (6543) — multi-statement SQL needs session mode.
2. Create `scripts/db.env` (gitignored) with one line:
   ```
   SUPABASE_DB_URL=postgresql://postgres:[YOUR-DB-PASSWORD]@db.mpoqizpadjfoqgqfpnop.supabase.co:5432/postgres
   ```
   (Or paste whatever exact URI the dashboard shows, password included.)

**Then Claude can run, via the shell:**
```bash
npm run db -- "select count(*) from public.profiles"
node scripts/db.mjs --file supabase/migrations/0009_whatever.sql
```
The connection string lives only in `scripts/db.env`, which is gitignored — it is
never committed. The DB password is **not** an `EXPO_PUBLIC_` var, so it never
ends up in the app bundle either.

## Fallback: hand-off (if `scripts/db.env` isn't set)

If there's no connection string, Claude will **never** claim to have run SQL —
it hands you SQL in one of two forms and you run it:

### 1. Schema changes (DDL) → migration file + apply
- Claude adds a numbered file under `supabase/migrations/` (e.g.
  `0009_xxx.sql`) and tells you it's ready.
- You apply it one of these ways:
  - **Dashboard SQL editor** — paste the file contents and Run (quickest), **or**
  - **Supabase CLI**:
    ```bash
    supabase login                      # once
    supabase link --project-ref mpoqizpadjfoqgqfpnop   # once
    supabase db push                    # applies new migration files
    ```

### 2. Ad-hoc SQL / data fixes / queries → run + paste back
- Claude gives you a fenced ```sql block.
- Run it via the **Dashboard SQL editor**, or with `psql`:
  ```bash
  # connection string: Dashboard → Project Settings → Database → Connection string
  psql "postgresql://postgres:[PASSWORD]@db.mpoqizpadjfoqgqfpnop.supabase.co:5432/postgres" -f file.sql
  ```
- If Claude needs the result (e.g. to verify a column or read a row), paste the
  output back into the chat.

## Conventions (unchanged)
- Migrations are source-of-truth and version-controlled in `supabase/migrations/`
  (currently `0001`–`0008`). Never edit an applied migration; add a new one.
- Seed/mock data lives in `supabase/seed/mock_candidates.sql` (idempotent).
- See `BACKEND.md` for the schema, RLS, and the 9–10am photo-window trigger.

## Current state & one pending item
- Migrations `0001`–`0008` are applied. Mocks have coordinates scattered ~50 mi
  around **NYC** and varied `has_kids` / `wants_kids`.
- **Pending:** once you save your real location in the app (Edit Profile →
  Location → Save writes `latitude`/`longitude`), recenter the mocks on you. The
  admin RPC `spoof_mock_locations_near()` is admin-gated and your account isn't
  admin, so run this directly in the SQL editor instead (replace the coords with
  your saved `latitude`,`longitude`):
  ```sql
  update public.profiles p set
    latitude  = <LAT> + ((50.0*sqrt(random()))/69.0)*cos(2*pi()*random()),
    longitude = <LON> + ((50.0*sqrt(random()))/(69.0*cos(radians(<LAT>))))*sin(2*pi()*random())
  where p.id::text like 'bbbb%';
  ```

## The end goal
Move 9AM under the same org/project as the other two so a single Supabase MCP
server covers everything; then Claude can resume direct `apply_migration` /
`execute_sql` and this hand-off doc can be deleted.
