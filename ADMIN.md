# Running FRONTIER 2026 as an organiser

This is the day-to-day guide for whoever's staffing `/admin` — before the event
(importing registrations, promoting organisers) and during it (the reg desk, checking
on submissions). For first-time project setup (Supabase, Google OAuth, deploying),
see [SETUP.md](SETUP.md) instead — this file assumes that's already done.

---

## Who gets in the door

Sign-in is gated on two checks, enforced in Postgres so they hold even if someone
calls the API directly:

1. The email must end in `@vitstudent.ac.in`.
2. The email must already exist in the `registrations` table.

`registrations` is seeded once from a CSV export of your pre-event sign-up sheet
(SETUP.md step 3). Anyone whose email isn't in there gets turned away at `/login`
with a message telling them to see the registration desk — they are **not** silently
let in, and they are **not** silently rejected forever either; the reg desk can add
them in seconds (below).

---

## The reg desk: handling walk-ins

Someone shows up who isn't on your pre-registered list. Here's the flow:

1. **Verify them in person.** Check whatever your event uses as proof — a payment
   receipt, a ticket, an ID. This app has no way to do that part for you; it's a
   deliberate manual step.
2. An organiser (someone with the `admin` role) opens `/admin` and scrolls to
   **"Reg desk — add a walk-in."**
3. Type in their `@vitstudent.ac.in` email. Name and registration number are
   optional — fill them in if you have them handy (from the receipt, say), since it
   saves the student retyping them, but the email alone is enough to unblock sign-in.
4. Submit. This calls `add_walkin_registration`, a permission-checked Postgres
   function (not a raw table write) that only works for signed-in admins.
5. Tell the student to go to `/login` and sign in with Google now — it'll work
   immediately, no waiting, no redeploy.

If they already have a name/reg_no on file (either from the original Excel import or
from what you typed into the walk-in form), the profile form they see after signing
in will already have those fields filled in — they just confirm and move on.

**Do not** re-run the CSV import to add a single walk-in. That import is for the bulk
pre-event load only; the walk-in form is the correct tool for one-off additions
during the event, because it goes through the permission-checked function instead of
a raw table write.

---

## The data portal

`/admin` is a single page with:

- **Stats row** — accounts created, profiles completed, people on a team, team count,
  and how many emails are on the allowlist (a quick sanity check that your CSV import
  actually landed).
- **Teams per track** — a running count so you can see if a track needs promoting.
- **Reg desk panel** — the walk-in form above.
- **Four tabs**, each backed by live data and each with its own **Download CSV**
  button:

| Tab | What it shows | CSV columns |
|---|---|---|
| **Participants** | Every signed-up person, grouped by team (banded rows, lead shown first per team) | Name, Reg no, Email, Phone, Year, Team, Track, Join Code, Is Lead, Registered At |
| **Teams** | One row per team — member count, lead, submission status at a glance | Team, Track, Join Code, Members, Lead Name, Lead Email, Submission |
| **Submissions** | Every uploaded deck, with a direct download link per row | Team, Track, File Name, Version, Submitted By, Submitted At |
| **Registrations** | The full allowlist — who's on it and how they got there | Email, Full Name, Registration No, Added By, Added At |

The "Added By" column on the Registrations tab tells you whether a row came from the
bulk **Excel import** or was added by a specific organiser at the **reg desk** (shown
as that organiser's email) — useful if you need to trace back a walk-in later.

Each CSV export hits `/admin/export?dataset=<name>` (`participants`, `teams`,
`submissions`, or `registrations`) and re-checks that you're an admin server-side —
the query param alone doesn't grant access.

---

## Making someone an organiser

Requires DB access (Supabase SQL editor), not something `/admin` can do to itself —
deliberately, so a participant's own token can never grant itself admin.

1. They sign in once first (their email needs to already be in `registrations`, same
   as anyone else — see SETUP.md step 3 if this is the very first admin).
2. Run in the SQL editor:

```sql
update public.profiles
set role = 'admin'
where email = 'their.name2023@vitstudent.ac.in';
```

3. They reload `/admin` (or sign out/in) and see the full portal.

---

## Fixing a bad entry

- **Wrong email in `registrations`** — organisers can't edit/delete rows from the UI
  yet (only insert/upsert via the walk-in form). To remove or correct one, use the SQL
  editor directly:
  ```sql
  delete from public.registrations where lower(email) = lower('wrong@vitstudent.ac.in');
  ```
- **Student stuck on the wrong team** — see the "Participant is stuck on a team"
  section of [SETUP.md](SETUP.md).
- **Wrong role** — re-run the promote-to-admin SQL above with `role = 'participant'`
  to demote.
