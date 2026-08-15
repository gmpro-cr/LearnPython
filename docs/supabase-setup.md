# Turning on cross-device progress

Until `supabase-config.js` has real values, none of this is live: no sign-in button appears and
progress stays in localStorage on one device, exactly as before. These are the four steps only you
can do — they need your Google and Supabase accounts.

Budget about 15 minutes.

## 1. Create the Supabase project

<https://supabase.com/dashboard> → **New project**. Any region near your learners; Mumbai
(`ap-south-1`) is the closest to Pune.

From **Settings → API**, copy:

- **Project URL** — `https://<project-ref>.supabase.co`
- **anon / publishable key**

Take the **anon** key, never `service_role`. The anon key is designed to ship in the page; the
service_role key bypasses Row Level Security and would hand every learner's row to anyone who
viewed source.

## 2. Create the schema

**SQL Editor** → paste and run:

```sql
create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Without this, the anon key can read every row in the table.
alter table public.progress enable row level security;

create policy "read own progress"
  on public.progress for select
  using (auth.uid() = user_id);

create policy "create own progress"
  on public.progress for insert
  with check (auth.uid() = user_id);

create policy "update own progress"
  on public.progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

RLS is the whole security boundary here — the key is public, so these three policies are what stop
one learner reading another's progress. Do not skip the `enable row level security` line.

## 3. Connect Google

**Google Cloud Console** → APIs & Services → Credentials → **Create credentials → OAuth client ID**
→ Web application.

Authorised redirect URI — take this exact value from Supabase (**Authentication → Providers →
Google**), it looks like:

```
https://<project-ref>.supabase.co/auth/v1/callback
```

Copy the generated **client ID** and **client secret** into that same Supabase Google provider
panel and enable it.

Then, in Supabase under **Authentication → URL Configuration**, add the sites allowed to complete a
sign-in:

```
https://pyquest-one.vercel.app
http://localhost:8777
```

Miss this and sign-in completes at Google, then bounces to an error instead of back to the course.

## 4. Fill in the config

In `supabase-config.js`:

```js
const SUPABASE_CONFIG = {
  url: "https://<project-ref>.supabase.co",
  anonKey: "<the anon key>",
};
```

Commit and push. Vercel redeploys and the sign-in control appears.

## Checking it works

1. Open the site, finish an exercise **without** signing in — it should save as usual.
2. Sign in. The exercise you just finished must still be there: first sign-in merges local progress
   into the account rather than replacing it.
3. Open the site in another browser, sign in as the same person, and confirm the same stage.
4. Sign out — the course keeps working, still saving locally.

## When the project pauses

Supabase pauses free-tier projects after a stretch of inactivity, and the host stops resolving.
This already happened once on CreditGuardAI (2026-08-03, NXDOMAIN on the project host).

PyQuest is built to treat that as a non-event: every call is guarded, progress keeps saving to
localStorage, and the account control quietly reads "on this device". Nobody loses a lesson. To
bring sync back, open the Supabase dashboard and restore the project.

## What is stored

One row per signed-in learner: their Supabase user id, and a JSON blob of course progress — XP,
which exercises are done, badges, streak, and cleared Firewall sectors.

From the Google profile, only what the account menu displays: email, display name, avatar URL.
If you would rather not hold the email, drop it from `syncIdentity()` in `sync.js` and show the
name alone.
