# Bad Friends Update — Verification & Safety

> **Status: PLANNED — not started.** This document captures scope and design
> direction only. We agreed to build it *after* the rest of the current work is
> verified. Nothing here is implemented yet.

The goal of the "bad friends" update is to raise trust on 9am by verifying that
people are **who they say they are**, are **old enough to be here**, and are
**not a known safety risk** — without turning onboarding into a chore or
mishandling sensitive personal data.

It has three independent pillars. They can ship one at a time.

---

## 1. Age verification

**Problem:** today age is a self-reported number in onboarding
(`OnboardingScreen` enforces only `>= 18`). That's a soft gate — trivially
bypassed.

**Options (lightest → strongest):**

| Approach | Friction | Strength | Notes |
| --- | --- | --- | --- |
| Self-attest + checkbox (current) | none | very weak | what we have |
| Date-of-birth + soft signals | low | weak | easy to fake |
| ID document + face match | medium | strong | needs a vendor (see §2) |
| Credit-card / bank age signal | medium | medium | privacy-sensitive |
| Government/age-estimation API | medium | medium–strong | jurisdiction-dependent |

**Direction:** treat age as a *byproduct of identity verification* (§2) rather
than a separate step — verifying a government ID yields a trustworthy DOB. Keep
the cheap self-attest gate as a first filter, then require ID verification before
a profile becomes publicly swipeable.

---

## 2. Person / identity verification

**Goal:** confirm a real, unique human controls the account, and that the live
morning photos match their ID — which is a natural fit for 9am, since we already
capture **live** photos in-app (no uploads). The selfie liveness we enforce is
half of an identity check already.

**Building blocks:**

- **Document capture** — scan a government ID (passport / driver's license).
- **Liveness + face match** — match a live selfie to the ID portrait. We already
  have a live-only camera (`CameraScreen`); this extends it.
- **Uniqueness** — prevent one person holding many accounts (duplicate-face or
  duplicate-document detection).
- **Verified badge** — surface a checkmark on verified profiles so users can
  filter for them.

**Likely build:** integrate a third-party KYC/identity vendor (e.g. an
"identity verification API") rather than building document OCR + face match
ourselves. Evaluate at least two vendors on accuracy, price per check, data
residency, and SDK support for Expo / React Native.

---

## 3. Background checks

**Goal:** screen against relevant public-safety records (the "bad friends"
part). This is the most legally and ethically loaded pillar — handle with care.

**Hard constraints to design around (confirm with counsel before building):**

- Background-check data is **highly regulated** (in the US, FCRA and a patchwork
  of state laws; elsewhere, GDPR and local equivalents). Using a consumer report
  to gate access can trigger notice/consent/dispute obligations.
- A check is **point-in-time**, not a guarantee. Records are incomplete and can
  be wrong. Communicate this honestly; never imply "verified safe."
- Requires explicit, informed **user consent** and a path to dispute results.
- Decide the **policy** explicitly: what categories matter, what's
  disqualifying, and the appeals process — *before* writing code.

**Likely build:** a background-check vendor API, run server-side only, with
results stored as a minimal verdict (pass / needs-review) — **not** the raw
report — and an audit trail.

---

## Cross-cutting: data handling & where this lives

- **Server-side, always.** Verification must run against trusted infrastructure,
  not the client — same principle as the 9–10am photo trigger
  (`enforce_photo_window` in `supabase/migrations/0001_init.sql`). The client can
  *initiate* a check; it can never *assert* a result.
- **Store verdicts, not raw PII.** Persist "verified: true, method: …, at: …" and
  a verification level — never raw ID images or full background reports beyond
  what the vendor requires for audit.
- **Supabase shape (future):** a `verifications` table (1:1 with `profiles`) with
  RLS so a user reads only their own status; an Edge Function brokers the vendor
  calls with the secret key; `profiles` gains a `verification_level` column that
  RLS/feed logic uses to decide who is swipeable.
- **Onboarding flow:** self-attest → create profile (limited) → ID + liveness →
  optional background check → fully visible. Each pillar gates a higher tier of
  access.

## Open questions (decide before building)

1. Which pillars are **required** vs optional for a usable account?
2. Which markets launch first? (Drives legal scope for §3 heavily.)
3. Vendor(s) for identity and for background checks?
4. What's the **disqualification policy** and appeals process for §3?
5. Do we expose a "verified only" filter in the swipe deck?

---

## Near-term future updates (do soon)

Smaller trust/safety and quality-of-life items that don't need the full
verification stack — good candidates for the next few iterations:

- **Report & block** — let a user report or block another from the card, chat,
  and matches list. A `blocks` table + RLS, plus a `reports` table for review.
  This is table-stakes safety and should land **before** any public testing.
- **Photo moderation** — auto-screen live morning photos for nudity/abuse before
  they go public (vendor API or an Edge Function), with a manual review queue.
- **`verifications` table scaffold** — add the 1:1 table + `verification_level`
  column described above as an unused migration first, so the UI can show a
  "Verify your profile" call-to-action and a badge slot even before a vendor is
  wired.
- **Selfie-liveness groundwork** — we already capture live in-app; capture a
  quick liveness signal (e.g. a second framed shot) to reuse later for §2 face
  match, so the data exists when we integrate a vendor.
- **Rate-limiting & anti-spam** — cap swipes/messages per window server-side to
  blunt bot/abuse accounts before identity verification exists.
- **Account deletion & data export** — a clean "delete my account + photos" path
  (and export) — needed for app-store review and GDPR/CCPA regardless of the
  verification timeline.
- **Unmatch** — remove a match (and its messages) from either side.

> Sequencing note: **report/block and rate-limiting are the cheapest, highest-
> value safety wins** and don't depend on a vendor — do them first. The three
> verification pillars (§1–§3) remain the larger, vendor-and-legal-gated effort.
