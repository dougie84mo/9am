-- 9am — security/performance hardening (follow-up to 0001_init.sql)
-- ---------------------------------------------------------------------------
-- Applied after running the Supabase advisors against the live project.
-- ---------------------------------------------------------------------------

-- The `photos` bucket is public, so objects are served by their public URL
-- without any SELECT policy. The broad SELECT policy from 0001 only enabled
-- clients to *list* every file in the bucket, which we don't want — drop it.
drop policy if exists "photos public read" on storage.objects;

-- Covering indexes for foreign keys flagged by the performance advisor; they
-- help ON DELETE CASCADE and reverse lookups (e.g. mutual-like detection).
create index if not exists swipes_swipee_idx   on public.swipes (swipee);
create index if not exists matches_user_b_idx  on public.matches (user_b);
create index if not exists messages_sender_idx on public.messages (sender);
