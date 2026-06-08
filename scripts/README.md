# scripts

Dev/prototype utilities. Not part of the app bundle.

## upload-mock-photos.mjs — give the seeded mock candidates real photos

The mock candidates (see `supabase/seed/mock_candidates.sql`) each have a
`photos` row pointing at `mock/<uuid>.jpg`, but no actual file — so the app shows
gradient-initial cards. This uploads your images to those paths so real photos
appear. Images are matched to candidates **by gender**, in sorted order.

### 1. Lay out your images
```
mock-photos/
  women/   <- ~50 images (jpg/png/webp)
  men/     <- ~50 images
```
(Any folder name works; pass it as the argument. `mock-photos/` is gitignored.)

### 2. Get your service_role key
Supabase Dashboard → **Settings → API → service_role**. It bypasses RLS, so:
**never commit it, never put it in an `EXPO_PUBLIC_*` var.**

### 3. Run it
PowerShell:
```powershell
$env:SUPABASE_URL="https://<ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service_role key>"
node scripts/upload-mock-photos.mjs ./mock-photos
```
bash:
```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role key> \
node scripts/upload-mock-photos.mjs ./mock-photos
```

It prints how many candidates vs images it found and how many it uploaded.
Re-running re-uploads (upsert) — safe. Fewer images than candidates is fine; the
rest stay as placeholders.

> This is only for the **seeded mock** candidates. Real accounts (yours, test
> users) get photos through the in-app camera during the 9–10am window — admins
> can upload any time (server bypass).
