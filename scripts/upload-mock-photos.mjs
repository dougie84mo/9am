// Bulk-upload real images for the seeded mock candidates.
//
// The seed (supabase/seed/mock_candidates.sql) gives every mock candidate a
// `photos` row whose storage_path is `mock/<uuid>.jpg`, but no actual file — so
// the app shows gradient-initial cards. This script uploads your local images to
// those exact paths so real photos appear. It matches images to candidates BY
// GENDER (women images -> women profiles, men -> men), in sorted order.
//
// Usage:
//   1. Put images in:  <dir>/women/*.jpg   and  <dir>/men/*.jpg
//      (50 each is ideal; fewer is fine — extras/shortfalls are reported.)
//   2. Get your service_role key: Supabase Dashboard -> Settings -> API.
//      NEVER commit it or put it in EXPO_PUBLIC_*; it bypasses RLS.
//   3. Run:
//        SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//          node scripts/upload-mock-photos.mjs ./mock-photos
//
// Re-running re-uploads (upsert) — safe.

import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DIR = process.argv[2] || './mock-photos';

if (!URL || !KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}

const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const isImage = (f) => /\.(jpe?g|png|webp)$/i.test(f);
const contentTypeFor = (f) => {
  const e = extname(f).toLowerCase();
  return e === '.png' ? 'image/png' : e === '.webp' ? 'image/webp' : 'image/jpeg';
};

async function imagesIn(sub) {
  try {
    const files = (await readdir(join(DIR, sub))).filter(isImage).sort();
    return files.map((f) => join(DIR, sub, f));
  } catch {
    return [];
  }
}

async function main() {
  // All seeded mock photo rows + their owners' gender.
  const { data: photos, error: pErr } = await sb
    .from('photos')
    .select('user_id, storage_path')
    .like('storage_path', 'mock/%');
  if (pErr) throw pErr;

  const ids = photos.map((p) => p.user_id);
  const { data: profs, error: prErr } = await sb
    .from('profiles')
    .select('id, gender')
    .in('id', ids);
  if (prErr) throw prErr;
  const genderById = Object.fromEntries(profs.map((p) => [p.id, p.gender]));

  const byPath = (a, b) => a.storage_path.localeCompare(b.storage_path);
  const women = photos.filter((p) => genderById[p.user_id] === 'Woman').sort(byPath);
  const men = photos.filter((p) => genderById[p.user_id] === 'Man').sort(byPath);

  const womenImgs = await imagesIn('women');
  const menImgs = await imagesIn('men');

  console.log(
    `candidates: ${women.length} women / ${men.length} men  |  images: ${womenImgs.length} women / ${menImgs.length} men`,
  );

  let uploaded = 0;
  for (const [rows, imgs, label] of [
    [women, womenImgs, 'women'],
    [men, menImgs, 'men'],
  ]) {
    const n = Math.min(rows.length, imgs.length);
    if (imgs.length < rows.length) {
      console.warn(`  ${label}: only ${imgs.length} images for ${rows.length} candidates — ${rows.length - imgs.length} will stay as placeholders.`);
    }
    for (let i = 0; i < n; i++) {
      const contentType = contentTypeFor(imgs[i]);
      const body = new Blob([await readFile(imgs[i])], { type: contentType });
      const { error } = await sb.storage
        .from('photos')
        .upload(rows[i].storage_path, body, { contentType, upsert: true });
      if (error) {
        console.error(`  ✗ ${rows[i].storage_path}: ${error.message}`);
      } else {
        uploaded++;
      }
    }
  }
  console.log(`Done. Uploaded ${uploaded} image(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
