# FRONTIER 2026 — event site

Registration, team formation and (later) deck submission for FRONTIER, the AWS
Student Builder Groups AI challenge at VIT Chennai.

**Setup instructions are in [SETUP.md](SETUP.md).** Start there.

## Stack

Next.js 15 (App Router) · Supabase (auth, Postgres, storage) · Tailwind · TypeScript.

## Routes

| Route | Who | What |
|---|---|---|
| `/` | Everyone | Event landing page |
| `/login` | Everyone | Email → 6-digit code |
| `/onboarding` | Signed in | Profile details, then create or join a team |
| `/dashboard` | Signed in | Team roster, join code, submission status |
| `/team` | Team leads | Add/remove members, transfer lead, rename, change track |
| `/admin` | Organisers | Full roster, per-track counts, CSV export |
| `/admin/export` | Organisers | CSV download |

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

Needs `.env.local` — see [SETUP.md](SETUP.md) step 3.

## Layout

```
app/
  page.tsx              landing page
  login/                email + code sign-in (client)
  onboarding/           profile form, team fork
  dashboard/            participant home
  team/                 lead-only team management
  admin/                organiser roster + CSV route
  actions.ts            all server actions
components/             ui primitives, logo, header
lib/
  constants.ts          tracks, team size, domain, SUBMISSIONS_OPEN flag
  data.ts               profile/team queries
  supabase/             browser + server clients
supabase/schema.sql     the whole database, idempotent
middleware.ts           session refresh + route guards
```
