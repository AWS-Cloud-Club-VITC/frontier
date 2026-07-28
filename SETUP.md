# FRONTIER 2026 — setup

Everything you need to get the site live. Roughly 20 minutes.

Work through these in order. Steps 1–6 get it running locally; 7 gets it in front
of participants.

---

## 1. Create the Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Name it `frontier-2026`. Pick the **Mumbai (ap-south-1)** region — closest to campus,
   so sign-in feels instant on venue wifi.
3. Set a strong database password and save it in your password manager. You won't
   need it for this app, but you cannot retrieve it later.
4. Wait for the project to finish provisioning (about two minutes).

---

## 2. Create the database

1. In the Supabase dashboard, open **SQL Editor** → **New query**.
2. Open [`supabase/schema.sql`](supabase/schema.sql) from this repo, copy the whole
   file, paste it in, and hit **Run**.
3. You should see `Success. No rows returned`.

This creates the `profiles`, `teams` and `submissions` tables, the row-level security
policies, the team-management functions, and the private `submissions` storage bucket.

The file is safe to run again if you need to reapply it.

**What it enforces, so you know it's there:**

| Rule                                                     | Where it lives                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Only `@vitstudent.ac.in` can register                    | Trigger on `auth.users`                                                              |
| Only emails on the `registrations` allowlist can sign in | Trigger on `auth.users`                                                              |
| Max 4 members per team                                   | Trigger with an advisory lock, so two people joining at once can't both slip through |
| Nobody can make themselves an admin                      | Trigger blocking `role` changes                                                      |
| Nobody can join a team without the code                  | Trigger blocking direct `team_id` writes                                             |
| One person, one team                                     | Unique constraint                                                                    |

---

## 3. Import the registration allowlist

Sign-in is gated on the `registrations` table — an email has to be in there before
Google will let that person into the app at all. This is what keeps randoms off the
site and gives you a clean cross-check against who actually registered.

1. **Table Editor** → `registrations` → **Insert** → **Import data from CSV**.
2. Export your registration spreadsheet as CSV with an `email` column (and optionally
   `full_name`, `reg_no` — column names must match exactly, or map them in the import
   dialog). Upload it.
3. **Add yourself now, before you go further** — you can't sign in otherwise, and you
   need to sign in once before you can be made an organiser in step 8. Either add a row
   for yourself in the same import, or run this in the SQL editor:

```sql
insert into public.registrations (email) values ('your.name2023@vitstudent.ac.in')
on conflict (lower(email)) do nothing;
```

Anyone not on this list who tries to sign in gets turned away with a message pointing
them to the registration desk. For people who show up on the day without having
pre-registered, the fix is **not** to re-run this CSV import — that's for the initial
bulk load only. Instead, once you're an organiser (step 8), use the **"Add a walk-in"**
form on `/admin`: it inserts into the same table through a permission-checked function,
so a signed-in organiser can add someone on the spot and they can sign in within
seconds.

---

## 4. Get your keys

**Project Settings** → **API**. You need two values:

| Field in the dashboard | Goes into                       |
| ---------------------- | ------------------------------- |
| Project URL            | `NEXT_PUBLIC_SUPABASE_URL`      |
| `anon` / `public` key  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

Create `.env.local` (copy `.env.local.example`) and paste them in:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Both of these are meant to be public — they ship to the browser, and row-level
security is what protects your data. **Never put the `service_role` key in this
file or anywhere in the repo.** It bypasses every policy above.

`.env.local` is already in `.gitignore`.

---

## 5. Set up Google OAuth sign-in

The app signs people in with their VIT Google account (`@vitstudent.ac.in` is a Google
Workspace domain, confirmed via its MX records) instead of an emailed code. This
sidesteps Supabase's email rate limits entirely — no email is sent to sign in.

1. In [Google Cloud Console](https://console.cloud.google.com), create (or reuse) a
   project, then **APIs & Services** → **Credentials** → **Create Credentials** →
   **OAuth client ID** → type **Web application**.
2. Add this **Authorized redirect URI** (get the exact value from Supabase in the
   next step, it's the same for local dev and production):
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Save, then copy the generated **Client ID** and **Client Secret**.
4. In Supabase: **Authentication** → **Providers** → **Google** → paste the Client ID
   and Client Secret, enable the provider, save.
5. Optional but recommended: on the Google Cloud **OAuth consent screen**, restrict
   the app to your Workspace org (**Internal** user type) if you have access to do so.
   This is a stronger guarantee than the `hd=vitstudent.ac.in` hint the app sends —
   that hint only pre-fills the account picker, it doesn't block other accounts.

The database still enforces the domain regardless of how someone signs in — see
`enforce_vit_domain` in `schema.sql`, which fires on every new `auth.users` row.

---

## 6. Run it locally

```bash
npm install && npm run dev
```

Open <http://localhost:3000>.

Sign in with your own VIT Google account to check the whole flow end to end: Google
consent screen, redirect back, profile form saves, team creation works, join code
appears.

---

## 7. Deploy

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com), import the repo as its **own, separate**
   Vercel project (do not add it to the existing `awscloudclubvit.in` project). Leave
   **Root Directory** at its default — the app lives at the repo root, there is no
   `web/` subfolder.
3. Add both environment variables from step 4 under **Environment Variables**.
4. Also add `NEXT_PUBLIC_BASE_PATH=/frontier` — this mounts the app at
   `awscloudclubvit.in/frontier` instead of its own root.
5. Deploy. You'll get a URL like `frontier-2026.vercel.app` — the app will 404 at
   `/` on that domain since everything now lives under `/frontier`; that's expected,
   `frontier-2026.vercel.app/frontier` is what you check.
6. Back in Supabase: **Authentication** → **URL Configuration** → set **Site URL**
   to `https://awscloudclubvit.in`, and add `https://awscloudclubvit.in/frontier/**`
   under **Redirect URLs**.
7. The Google OAuth redirect URI from step 4 of section 5
   (`https://<project>.supabase.co/auth/v1/callback`) doesn't change for production —
   Supabase is always the OAuth callback target, not Vercel. Nothing to update in
   Google Cloud Console.
8. In the **existing** Vercel project that serves `awscloudclubvit.in`, add (or merge
   into) `vercel.json` at its root:

   ```json
   {
     "rewrites": [
       {
         "source": "/frontier",
         "destination": "https://frontier-2026.vercel.app/frontier"
       },
       {
         "source": "/frontier/:path*",
         "destination": "https://frontier-2026.vercel.app/frontier/:path*"
       }
     ]
   }
   ```

   Replace `frontier-2026.vercel.app` with the actual `.vercel.app` domain from step 5
   (a stable `vercel.app` alias, not a per-deploy preview URL). Commit and redeploy
   that project. Vercel proxies the request server-side, so this works without CORS
   issues and without needing a custom domain on the Frontier project itself.

9. Visit `https://awscloudclubvit.in/frontier` and confirm sign-in works end to end —
   the OAuth redirect has to round-trip through the rewrite correctly.

---

## 8. Make yourself an organiser

The `/admin` page is gated on a role column, not a secret URL. You should already be
able to sign in — you added yourself to `registrations` in step 3. Sign in on the live
site first, then run this in the Supabase SQL editor:

```sql
update public.profiles
set role = 'admin'
where email = 'your.name2023@vitstudent.ac.in';
```

Repeat for each organiser (add each one to `registrations` first if they aren't
already, same as step 3). Reload `/admin` and you'll see the roster, the per-track
counts, the CSV export, and the walk-in registration form for the reg desk.

---

## Things you'll want to change later

### Open submissions

`lib/constants.ts`:

```ts
export const SUBMISSIONS_OPEN = true;
```

Commit and redeploy. The storage bucket, size limit (8 MB) and access policies are
already in place from step 2 — the upload UI is what's gated. The upload form itself
still needs building; the dashboard card and the database side are ready for it.

### Fill in the event flow

Two placeholder blocks are waiting for the schedule:

- `app/page.tsx` — the **Event flow** section on the landing page
- `app/dashboard/page.tsx` — the **Event flow** card in the sidebar

Both are marked with `Coming soon` chips. Replace the dashed placeholder boxes with
the real hour-by-hour schedule when you have it.

### Swap in the real AWS logo

The chip mark in `components/logo.tsx` is a vector stand-in — correct colours and
geometry, but without the AWS smile. Drop the real transparent PNG into
`public/aws-sbg.png` and replace the `<svg>` in `ChipMark` with an `<Image>`.

### Change the allowed email domain

`ALLOWED_EMAIL_DOMAIN` in `lib/constants.ts` for the form message, the `hd`
query param sent to Google in `app/login/login-form.tsx`, **and** the
`enforce_vit_domain` function in `schema.sql` for the real enforcement. Change all
three or they'll disagree. Also confirm the new domain is actually on Google
Workspace (check its MX records) — OAuth won't work otherwise.

---

## If something goes wrong

**"Database error saving new user"** on sign-up — the email isn't a
`@vitstudent.ac.in` address, and the trigger rejected it. Working as intended.

**"This email is not on the FRONTIER registration list"** — the email isn't in the
`registrations` table. Either the CSV import missed them (check with `select * from
registrations where lower(email) = lower('their@email')`), or they're a genuine
walk-in — add them from the **"Add a walk-in"** form on `/admin`, or with the SQL
snippet in step 3.

**"Sign-in failed" after the Google consent screen** — check **Authentication** →
**Logs** in Supabase. Usually the redirect URI in Google Cloud Console doesn't
exactly match `https://<project>.supabase.co/auth/v1/callback`, or the Google
provider isn't enabled/saved in Supabase yet.

**Participant is stuck on a team they shouldn't be on** — as the lead they can remove
members from `/team`. If the lead is unreachable, fix it directly:

```sql
update public.profiles set team_id = null where reg_no = '23BCE1234';
```

Trigger protection doesn't apply here — the SQL editor runs as the database owner.

**"row violates row-level security policy"** — the schema didn't fully apply. Re-run
`schema.sql`; it's idempotent.
