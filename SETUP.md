# FRONTIER 2026 — setup

Everything you need to get the site live. Roughly 20 minutes, plus DNS wait if you
set up a custom sender domain.

Work through these in order. Steps 1–5 get it running locally; 6–7 get it in front
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

| Rule | Where it lives |
|---|---|
| Only `@vitstudent.ac.in` can register | Trigger on `auth.users` |
| Max 4 members per team | Trigger with an advisory lock, so two people joining at once can't both slip through |
| Nobody can make themselves an admin | Trigger blocking `role` changes |
| Nobody can join a team without the code | Trigger blocking direct `team_id` writes |
| One person, one team | Unique constraint |

---

## 3. Get your keys

**Project Settings** → **API**. You need two values:

| Field in the dashboard | Goes into |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

Create `web/.env.local` (copy `web/.env.local.example`) and paste them in:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Both of these are meant to be public — they ship to the browser, and row-level
security is what protects your data. **Never put the `service_role` key in this
file or anywhere in the repo.** It bypasses every policy above.

`.env.local` is already in `.gitignore`.

---

## 4. Switch the email from a link to a code

**This is the step people miss.** Supabase sends a magic *link* by default. The app
asks for a 6-digit *code*. If you skip this, participants get an email with a link
and nothing to type in.

1. **Authentication** → **Emails** → **Magic Link** template.
2. Replace the template body with this:

```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
  <div style="border:3px solid #0E141B;padding:28px;">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7C4DE8;margin:0 0 18px;">
      FRONTIER 2026 &middot; AWS Student Builder Groups
    </p>
    <h1 style="font-size:26px;margin:0 0 14px;color:#0E141B;">Your sign-in code</h1>
    <p style="font-size:15px;line-height:1.5;color:#667180;margin:0 0 22px;">
      Type this into the FRONTIER registration page. It expires in one hour.
    </p>
    <div style="border:3px solid #0E141B;background:#7C4DE8;color:#ffffff;font-family:'Courier New',monospace;font-size:34px;font-weight:bold;letter-spacing:10px;text-align:center;padding:18px 10px;">
      {{ .Token }}
    </div>
    <p style="font-size:13px;line-height:1.5;color:#9AA3AE;margin:22px 0 0;">
      If you didn't request this, ignore this email — nobody can sign in without the code.
    </p>
  </div>
</div>
```

3. Save. The `{{ .Token }}` placeholder is what makes it a code instead of a link.
4. While you're here, set the **subject** to something recognisable:
   `Your FRONTIER sign-in code`.

Also check **Authentication** → **Providers** → **Email** is enabled (it is by default).

---

## 5. Run it locally

```bash
cd web && npm install && npm run dev
```

Open <http://localhost:3000>.

Sign in with your own VIT email to check the whole flow end to end: code arrives,
profile form saves, team creation works, join code appears.

---

## 6. Set up a real email sender — do this before you share the link

Supabase's built-in email service is **rate limited to a handful of messages per
hour**. That is fine while you test and completely inadequate on the day: if 60
students hit register at once, most of them get nothing and you spend the morning
fielding "I didn't get the code" messages.

1. Create a free account with [Resend](https://resend.com) (3,000 emails/month free)
   or Brevo. Verify a sending domain, or use their test sender for a small event.
2. In Supabase: **Project Settings** → **Authentication** → **SMTP Settings** →
   **Enable Custom SMTP**.
3. Fill in the host, port `587`, username and password from your email provider.
   Set the sender name to `FRONTIER 2026`.
4. Then raise the limit: **Authentication** → **Rate Limits** → set
   **Emails per hour** to something realistic for your expected signup burst
   (500 is sensible).

Send yourself a test code afterwards to confirm delivery still works.

---

## 7. Deploy

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com), import the repo.
3. Set **Root Directory** to `web`.
4. Add both environment variables from step 3 under **Environment Variables**.
5. Deploy.
6. Back in Supabase: **Authentication** → **URL Configuration** → set **Site URL**
   to your Vercel domain, and add it under **Redirect URLs**.

---

## 8. Make yourself an organiser

The `/admin` page is gated on a role column, not a secret URL. Register on the live
site first, then run this in the Supabase SQL editor:

```sql
update public.profiles
set role = 'admin'
where email = 'your.name2023@vitstudent.ac.in';
```

Repeat for each organiser. Reload `/admin` and you'll see the roster, the per-track
counts, and the CSV export.

---

## Things you'll want to change later

### Open submissions

`web/lib/constants.ts`:

```ts
export const SUBMISSIONS_OPEN = true;
```

Commit and redeploy. The storage bucket, size limit (25 MB) and access policies are
already in place from step 2 — the upload UI is what's gated. The upload form itself
still needs building; the dashboard card and the database side are ready for it.

### Fill in the event flow

Two placeholder blocks are waiting for the schedule:

- `web/app/page.tsx` — the **Event flow** section on the landing page
- `web/app/dashboard/page.tsx` — the **Event flow** card in the sidebar

Both are marked with `Coming soon` chips. Replace the dashed placeholder boxes with
the real hour-by-hour schedule when you have it.

### Swap in the real AWS logo

The chip mark in `web/components/logo.tsx` is a vector stand-in — correct colours and
geometry, but without the AWS smile. Drop the real transparent PNG into
`web/public/aws-sbg.png` and replace the `<svg>` in `ChipMark` with an `<Image>`.

### Change the allowed email domain

`ALLOWED_EMAIL_DOMAIN` in `web/lib/constants.ts` for the form message, **and** the
`enforce_vit_domain` function in `schema.sql` for the real enforcement. Change both
or the two will disagree.

---

## If something goes wrong

**"Database error saving new user"** on sign-up — the email isn't a
`@vitstudent.ac.in` address, and the trigger rejected it. Working as intended.

**Code email never arrives** — check the spam folder, then check
**Authentication** → **Logs** in Supabase. If you see rate-limit errors, do step 6.

**Participant is stuck on a team they shouldn't be on** — as the lead they can remove
members from `/team`. If the lead is unreachable, fix it directly:

```sql
update public.profiles set team_id = null where reg_no = '23BCE1234';
```

Trigger protection doesn't apply here — the SQL editor runs as the database owner.

**"row violates row-level security policy"** — the schema didn't fully apply. Re-run
`schema.sql`; it's idempotent.
