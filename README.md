# FRONTIER 2026 — event site

Registration, team formation and (later) deck submission for FRONTIER, the AWS
Student Builder Groups AI challenge at VIT Chennai.

**Setup instructions are in [SETUP.md](SETUP.md).** Start there.
**Running the event as an organiser is in [ADMIN.md](ADMIN.md).**

## Stack

Next.js 15 (App Router) · Supabase (auth, Postgres, storage) · Tailwind · TypeScript.

For a subpath deployment such as `/frontier`, set `NEXT_PUBLIC_BASE_PATH=/frontier`
at build time and route that path to the deployment from your root site or reverse
proxy.

## Routes

| Route                     | Who        | What                                                                                      |
| ------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| `/`                       | Everyone   | Event landing page                                                                        |
| `/login`                  | Everyone   | Sign in with VIT Google account                                                           |
| `/onboarding`             | Signed in  | Profile details, then create or join a team                                               |
| `/dashboard`              | Signed in  | Team roster, join code, submission status                                                 |
| `/team`                   | Team leads | Add/remove members, transfer lead, rename, change track                                   |
| `/admin`                  | Organisers | Stats, walk-in sign-in, tabbed data portal (participants/teams/submissions/registrations) |
| `/admin/export?dataset=…` | Organisers | CSV download — `participants` (default), `teams`, `submissions`, or `registrations`       |

## Who can sign in

Sign-in is gated on two checks, both enforced in Postgres so they hold even against
the raw REST API: the email must end in `@vitstudent.ac.in`, and it must already be in
the `registrations` table. That table is seeded from a CSV import of the pre-event
registration list (see [SETUP.md](SETUP.md) step 3) — anyone not on it gets turned
away with a message pointing them to the registration desk.

For people who show up without having pre-registered, organisers add them on the spot
from the **"Add a walk-in"** form on `/admin`, which calls `add_walkin_registration` —
a permission-checked function, not a direct table write — and they can sign in
immediately after. Full reg-desk walkthrough and the rest of the admin portal are in
[ADMIN.md](ADMIN.md).

## How teams work

A person can be on exactly one team, and a team holds at most four people.

Two ways to join, because a lead cannot add someone who hasn't registered yet:

- **Join code** — every team gets a 6-character code. Teammates register on their own
  time and enter it. This is the path that handles "I'll add them later".
- **Direct add** — the lead enters a registered teammate's email and they're added
  immediately. Only works if that person has already filled in their details.

Every team mutation goes through a `SECURITY DEFINER` Postgres function that checks
permissions server-side. The client cannot write to `teams` at all, and cannot change
its own `team_id` — a trigger blocks it. That means the rules hold even if someone
calls the REST API directly with their own token.

## Local development

```bash
npm install
npm run dev
```

Needs `.env.local` — see [SETUP.md](SETUP.md) step 4.

## Layout

```
app/
  page.tsx              landing page
  login/                Google OAuth sign-in (client)
  auth/callback/        OAuth code exchange (route handler)
  onboarding/           profile form, team fork
  dashboard/            participant home
  team/                 lead-only team management
  admin/
    page.tsx             stats, per-track counts, walk-in panel, data portal
    walkin-form.tsx       reg-desk "add a walk-in" form
    data-tabs.tsx         tabbed participants/teams/submissions/registrations views
    export/route.ts       CSV download, ?dataset=participants|teams|submissions|registrations
  actions.ts            all server actions
components/             ui primitives, logo, header
lib/
  constants.ts          tracks, team size, domain, SUBMISSIONS_OPEN flag
  data.ts               profile/team queries
  csv.ts                shared CSV cell-escaping + BOM helpers
  supabase/             browser + server clients
supabase/schema.sql     the whole database, idempotent
middleware.ts           session refresh + route guards
```
