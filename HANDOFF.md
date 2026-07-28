# Handoff log

What's changed since the last handoff, and why. Newest entry on top. Manual
dashboard/console steps (things no commit can do for you) are called out separately
from code changes.

---

## 2026-07-28 — Bug fix: server actions rejected deck uploads over 1MB

### What changed and why

Uploading a submission deck failed with "Body exceeded 1 MB limit" even though
`uploadSubmission` (`app/actions.ts`) allows up to 25MB. Next.js server actions cap
the request body at 1MB by default, separate from and stricter than the app's own
size check — the framework limit rejected the request before the app's validation
ever ran.

**Fix**: `next.config.mjs` — added `experimental.serverActions.bodySizeLimit: "25mb"`
to match the app's existing cap.

**Action needed**: requires a full dev-server restart (or redeploy in production) —
Next.js only reads this config at startup, a hot reload won't pick it up.

---

## 2026-07-28 — Admin: group participants table by team

### What changed and why

The Participants tab listed everyone in registration order, so teammates were
scattered wherever they happened to sign up relative to other teams — no way to
eyeball a roster at a glance.

**Fix**: `app/admin/data-tabs.tsx` — added a `sortByTeam` helper (team name
alphabetically, "no team" last, lead first within a team) and alternating
row-background shading that changes only when the team changes, so consecutive
teammates are visually grouped. UI-only — the CSV export ordering is unchanged.

---

## 2026-07-28 — Admin data portal: tabs + per-dataset CSV export

### What changed and why

`/admin` only ever showed one table (participants joined with their team) and one CSV
export of that same view. Organisers asked for a proper unified portal to look at
everything that's tracked — teams, submissions, and the registrations allowlist —
each with its own export, not just participants.

### Code changes

| File | Change |
|---|---|
| `lib/csv.ts` | **New.** Extracted the CSV cell-escaping (RFC 4180 quoting) and BOM-prefixed `toCsv()` helper out of `admin/export/route.ts` so every dataset's export can share it instead of duplicating the logic. |
| `app/admin/export/route.ts` | Rewritten to take `?dataset=participants\|teams\|submissions\|registrations` (defaults to `participants`, same shape as the old export). Each branch builds its own header/rows: `teams` aggregates member count + lead + submission status per team; `submissions` resolves `submitted_by` to an email via a `profiles` lookup; `registrations` resolves `added_by` to the admin's email, or labels it "Excel import" when null. |
| `app/admin/data-tabs.tsx` | **New.** Client component — four tabs (Participants / Teams / Submissions / Registrations), each with its own table and a "Download CSV" link pointed at the matching `?dataset=`. Receives all data pre-fetched as props; no client-side fetching. |
| `app/admin/page.tsx` | Now fetches `submissions` and `registrations` alongside `profiles` (parallel `Promise.all`), aggregates teams from the profiles join (member count, lead, submission status), resolves submission download links via `getSubmissionDownloadUrl` per row, and renders `<DataTabs>` instead of the old single table. Removed the old top-level "Download CSV" button — each tab now has its own. |

No schema or RLS changes — this only reads tables that already existed
(`registrations` added in the OAuth/allowlist work above), through the same
`is_admin()`-gated policies.

### Nothing manual needed here — this is a pure code change, works as soon as it's deployed.

Full walkthrough of what organisers see and how to use it during the event is now in
[ADMIN.md](ADMIN.md).

---

## 2026-07-28 — Profile auto-fill from registrations (was proposed, never built)

### What changed and why

Earlier handoff mentioned auto-filling the profile form from the pre-event Excel as a
"nice bonus" of the registrations table — but it was never actually implemented,
only floated as an idea. `handle_new_user()` only ever inserted `id` + `email` into
`profiles`; nothing read `registrations.full_name` / `reg_no` back out. Flagged when
testing showed the onboarding form wasn't pre-filled for a pre-registered account.

**Fix**: `supabase/schema.sql` — `handle_new_user()` now looks up the new user's
`registrations` row by email and carries `full_name`/`reg_no` into the new `profiles`
row. Guards against a bad import with a duplicate `reg_no` (unique constraint on
`profiles`) by silently skipping the reg_no pre-fill rather than blocking account
creation.

Effect: a student who was in the Excel with both name and reg_no now skips straight
to the team-formation step on first login instead of retyping details already on
file. Someone with only a name (or nothing) on file still sees the profile form, just
partially pre-filled where data exists.

**Action needed**: re-run `schema.sql` (idempotent) to pick this up. Only applies to
*new* sign-ups from that point on — accounts created before the fix won't be
retroactively filled in.

---

## 2026-07-28 — Bug fix: admin-role bootstrap was broken

### What changed and why

Found while promoting the first admin on a fresh project: running the documented
`update public.profiles set role = 'admin' where email = ...` in the Supabase SQL
editor failed with `P0001: You cannot change your own role.` — the
`protect_profile_columns` trigger's `is_admin()` check reads `auth.uid()`, which is
only populated for requests that went through the Supabase API with a user JWT. The
SQL editor has no session, so `auth.uid()` is `NULL` there, `is_admin()` always
evaluated to `false`, and the trigger blocked the update unconditionally. This was a
pre-existing bug (not introduced by the OAuth/allowlist work below) — it also silently
broke the "unstick a stuck team member" SQL snippet later in SETUP.md, which changes
`team_id` directly the same way.

**Fix**: `supabase/schema.sql` — `protect_profile_columns()` now only enforces the
role-change and team_id-change checks when `auth.uid() is not null`, i.e. when the
update actually came through the API. Direct SQL-editor / migration access already
implies full trust (anyone with it could bypass the trigger outright), so gating on
API-origin requests only is not a security regression.

**Action needed**: re-run `schema.sql` in any project already provisioned (it's
idempotent) before retrying the admin-role bootstrap step.

---

## 2026-07-28 — Google OAuth sign-in + registration allowlist

### What changed and why

Two related changes, both driven by running this at a real event:

1. **Swapped email-OTP sign-in for Google OAuth.** The old flow emailed a 6-digit
   code via Supabase's built-in mailer, which is rate-limited to a handful of
   messages/hour — fine for testing, not for 60 people registering at once on the
   day. `@vitstudent.ac.in` is confirmed to be a real Google Workspace domain (its MX
   records point at Google), so OAuth sends zero email and sidesteps the limit
   entirely.
2. **Added a registration allowlist.** The organisers already have an Excel of
   everyone who pre-registered for the event. Sign-in is now cross-checked against
   that list in Postgres — not just the email domain — so only actual registrants get
   in. A reg-desk workflow covers walk-ins who aren't on the list yet.

### Code changes

| File | Change |
|---|---|
| `app/login/login-form.tsx` | Replaced the email + OTP form with a single "Continue with Google" button. Sends the `hd=vitstudent.ac.in` hint to Google's account picker. |
| `app/auth/callback/route.ts` | **New.** OAuth needs a server-side code exchange that the old OTP flow didn't require. Exchanges the code for a session, redirects to `next` (or back to `/login` with an error). |
| `app/login/page.tsx` | Copy update: "we email you a code" → "use your VIT Google account". |
| `lib/constants.ts` | Removed `isAllowedEmail()` — no longer used now that the login form doesn't do client-side domain validation before requesting a code. `ALLOWED_EMAIL_DOMAIN` itself is still used for copy text. |
| `supabase/schema.sql` | Added `registrations` table (email/full_name/reg_no, case-insensitive unique on email). Added `enforce_preregistered` trigger on `auth.users` — blocks sign-in for any email not in `registrations`, same pattern as the existing `enforce_vit_domain` trigger. Added `add_walkin_registration(email, name, reg_no)` RPC, admin-only (`is_admin()`), upserts into `registrations`. RLS: `registrations` is admin-select-only, no direct insert/update policy — same reasoning as `teams`. |
| `app/actions.ts` | Added `addWalkinRegistration` server action calling the new RPC. |
| `app/admin/walkin-form.tsx` | **New.** Reg-desk form (email + optional name/reg no) for admins to add a walk-in on the spot. |
| `app/admin/page.tsx` | Added the walk-in form panel, and an "On allowlist" stat card (count of `registrations` rows) so organisers can see the CSV import actually landed. |
| `README.md`, `SETUP.md` | Rewrote the sign-in section/steps: Google Cloud OAuth client setup, Supabase provider config, CSV import of the registration list, and the bootstrap gotcha below. |

### ⚠️ Manual steps required — nothing here works from code alone

1. **Google Cloud Console**: create an OAuth 2.0 Web application client. Authorized
   redirect URI must be `https://<project-ref>.supabase.co/auth/v1/callback`. Copy
   the Client ID + Secret.
2. **Supabase dashboard** → Authentication → Providers → Google: paste the Client ID
   + Secret, enable the provider.
3. **Import the registration Excel** as CSV into the `registrations` table via
   Supabase's Table Editor → Import data from CSV. Column names should be `email`
   (required), `full_name`, `reg_no` (both optional).
4. **Bootstrap gotcha**: because sign-in now requires being in `registrations`,
   whoever sets this up needs to add *their own* email to `registrations` (SQL editor
   or the CSV import) *before* they can sign in for the first time — you can't reach
   `/admin` to use the walk-in form until you've already signed in once. Full
   sequencing is in `SETUP.md` steps 3–8.

Full step-by-step is in [SETUP.md](SETUP.md); this file is the "what and why", not a
replacement for it.
