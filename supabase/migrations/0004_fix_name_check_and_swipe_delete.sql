-- 9am — fix empty starter-profile check + allow swipe deletion
-- ---------------------------------------------------------------------------

-- BUGFIX: handle_new_user() (from 0001) inserts an empty starter profile with
-- name '', but the original constraint required char_length(name) >= 1. That
-- made the AFTER INSERT trigger raise and roll back EVERY real signup. Allow the
-- empty starter row; the app treats name '' as "onboarding not finished yet".
alter table public.profiles drop constraint if exists profiles_name_check;
alter table public.profiles
  add constraint profiles_name_check check (char_length(name) <= 60);

-- Dev "reset deck / clear my swipes" needs the user to remove their own swipes.
create policy "delete own swipes"
  on public.swipes for delete to authenticated
  using ((select auth.uid()) = swiper);
grant delete on public.swipes to authenticated;
