# THOTH — Supabase Setup Guide

This guide connects THOTH to your Supabase backend.
THOTH runs in **demo mode** until you complete these steps.

---

## Step 1 — Add environment variables

Create `artifacts/thoth/.env.local` (already done if you followed onboarding):

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Find these in your Supabase project under **Settings → API**.

---

## Step 2 — Run the database schema

> **Do this once on a fresh Supabase project.**

1. Open your Supabase project → **SQL Editor → New query**
2. Copy the entire contents of `schema.sql` (in this folder)
3. Paste and click **Run**

This creates all tables, indexes, RLS policies, and the profile auto-creation trigger.

---

## Step 3 — Configure Google OAuth

1. Go to **Authentication → Providers → Google**
2. Toggle **Enable Google provider** ON
3. Go to [Google Cloud Console](https://console.cloud.google.com):
   - **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URI: `https://your-project-ref.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client Secret** back into Supabase

---

## Step 4 — Disable email confirmation (required)

By default Supabase requires email verification. Since THOTH uses Google login only, disable it:

1. Go to **Authentication → Providers → Email**
2. Turn OFF **"Confirm email"**
3. Click **Save**

This ensures users are not blocked waiting for a confirmation email after Google sign-in.

---

## Step 5 — Set redirect URLs

1. Go to **Authentication → URL Configuration**
2. Set **Site URL** to your app URL (e.g. `https://your-replit-app.replit.app`)
3. Add to **Redirect URLs**: same URL (e.g. `https://your-replit-app.replit.app`)

For local development, also add: `http://localhost:5173`

---

## Step 6 — Restart the dev server

After adding `.env.local`, restart THOTH so it picks up the new variables.
THOTH switches automatically from demo mode to live Supabase mode.

---

## How the auth flow works

```
User clicks "Continue with Google"
  → Supabase redirects to Google
  → Google authenticates user
  → Supabase creates auth.users entry
  → Trigger creates profiles row automatically
  → User redirected back to app

App checks workspace_members:
  → No workspace found → show WorkspaceSetup onboarding (first time only)
  → Workspace found    → go directly to dashboard (returning users)
```

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `PGRST204: Could not find column` | Schema not run yet | Run `schema.sql` in Supabase SQL Editor |
| `Workspace creation failed` | RLS policy blocking insert | Ensure `schema.sql` was run (it includes all policies) |
| Stuck on sign-in after Google redirect | Email confirmation ON | Disable "Confirm email" in Auth → Providers → Email |
| Demo data still showing | Env vars not loaded | Restart dev server after editing `.env.local` |
| `Invalid API key` | Wrong key used | Use the **anon** key, not the service role key |

---

## Security checklist

- [ ] `.env.local` is in `.gitignore` (already done)
- [ ] Only `.env.example` with empty values is committed
- [ ] Supabase anon key is used on the frontend (not service role key)
- [ ] RLS is enabled on all tables (done by `schema.sql`)
