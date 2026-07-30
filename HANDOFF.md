# Handoff log

What's changed since the last handoff, and why. Newest entry on top. Manual
dashboard/console steps (things no commit can do for you) are called out separately
from code changes.

---

## 2026-07-30 — Admin: attendance tracking (4 sessions)

### What changed and why

Organisers needed a way to mark who actually showed up, per session — Day 1 AM/PM
and Day 2 AM/PM — separate from who's registered or on a team. Registration already
happens well ahead of the event; attendance is a same-day, per-session fact, so it
needed its own table rather than overloading `registrations` or `profiles`.

### Code changes

| File | Change |
|---|---|
| `supabase/schema.sql` | **New `attendance` table** — one row per `(registration_id, session)`, `present` boolean, `marked_by`/`marked_at`. Keyed off `registrations` rather than `profiles` so attendance can be taken for anyone on the allowlist, including a walk-in who hasn't signed in yet. **New `admin_set_attendance(p_registration_id, p_session, p_present)` RPC** — admin-gated, upserts on the `(registration_id, session)` unique constraint so re-toggling a checkbox just updates the row. Admin-only select policy on `attendance`, no insert/update/delete policy — same "writes only through the RPC" pattern as `teams`/`registrations`. |
| `lib/constants.ts` | Added `ATTENDANCE_SESSIONS` (the four session keys + display labels) and the `AttendanceSession` type. |
| `app/actions.ts` | Added `adminSetAttendance()` — called directly from the checkbox's `onChange` (not a `<form>`, since a live toggle doesn't fit the app's `useActionState` form pattern used elsewhere). |
| `app/admin/attendance-row.tsx` | **New.** Client component — one row per registration, a checkbox per session, optimistic toggle with rollback on error. Resyncs its local state from props via `useEffect` so a second admin's concurrent change shows up without a hard reload. |
| `app/admin/data-tabs.tsx` | Added the **Attendance** tab (5th tab) alongside Participants/Teams/Submissions/Registrations. |
| `app/admin/page.tsx` | Fetches `attendance` alongside the other datasets, builds one row per registration defaulting every unmarked session to absent. |
| `app/admin/export/route.ts` | Added `?dataset=attendance` — Email/Full Name/Reg No + Present/Absent per session. |

No schema or RLS changes to any existing table — `profiles`, `teams`, `submissions`,
`registrations`, and the `auth.users` triggers are all untouched.

### ⚠️ Manual step required (already done for this deploy)

Run the additive SQL block (table + RPC + RLS + grants for `attendance` only) in the
Supabase SQL editor — **not** a full re-run of `schema.sql`, to avoid touching the
`auth.users` triggers while sign-ins may be happening live. The block is idempotent,
same as the rest of the file, so it's safe to re-paste if you're ever unsure whether
it already ran.

---

## 2026-07-29 — Correction: upload cap is 8MB, not 25MB

The entry below (2026-07-28) describes bumping the cap to 25MB — that's since
been lowered to 8MB everywhere (`next.config.mjs`, `uploadSubmission` in
`app/actions.ts`, and the `submissions` storage bucket's `file_size_limit` in
`schema.sql`), with the server-action body limit itself kept at 10MB, above
the app's own 8MB check, so an oversized file still gets the friendly error
instead of a framework-level rejection. Leaving the original entry below
as-is for the history; treat 8MB as current.

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
