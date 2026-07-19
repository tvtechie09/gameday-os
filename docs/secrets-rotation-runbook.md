# Secrets rotation runbook

**Owner:** Kyle (dashboard access + credentials required — cannot be automated).
**When:** now (two keys were previously exposed), and on any future suspicion,
laptop loss, or contractor offboarding. Budget ~15 minutes.

## What must rotate now

| Secret | Where it lives | Why now |
|---|---|---|
| Supabase **service_role / `sb_secret`** key | Vercel env `SUPABASE_SERVICE_ROLE_KEY` (+ your `.env.local`) | Previously exposed. God-mode over the whole DB incl. kids' PII. |
| **OpenWeather** API key | Vercel env `OPENWEATHER_API_KEY` (+ `.env.local`) | Previously exposed. Low blast radius but leaked = rotate. |
| **`SESSION_COOKIE_SECRET`** (NEW) | Vercel env — **not yet set** | Signs the session cookie (see the cookie-signing change). Must be set before dev-login is ever enabled on a deploy. |

Repo scan (done 2026-07-18): **no secret is committed to git — current tree or
full history.** `.env.example` is placeholders only; `.env*` is gitignored. So
rotation is a dashboard + Vercel-env task; there is no git history to scrub.

## Order of operations (zero downtime)

Rotate one key at a time; each finishes with a Vercel redeploy so the new value
is live before you invalidate the old one.

### 1. Supabase service_role key
1. Supabase dashboard → project `ekkmflksqerdhutqxeii` → **Project Settings → API Keys**.
2. If the project uses the **new API keys** (`sb_publishable_…` / `sb_secret_…`):
   create a new secret key, copy it, and there's a grace window where both work —
   ideal. If it uses the **legacy JWT keys**: note that "Roll JWT secret"
   rotates BOTH anon and service_role at once (see step 4), so prefer the new
   key system if offered.
3. Vercel → project `gameday-os` → **Settings → Environment Variables** →
   `SUPABASE_SERVICE_ROLE_KEY` → set the new value for **Production AND Preview**.
4. Redeploy (Vercel → Deployments → Redeploy latest, or push any commit).
5. Confirm the app still reads/writes (load `/admin`, open a field page).
6. Back in Supabase, **revoke/delete the old secret key**.
7. Update your local `.env.local` with the new value.

### 2. OpenWeather key
1. OpenWeather account → **API keys** → generate a new key, delete the old one.
2. Vercel → `OPENWEATHER_API_KEY` (and `WEATHER_API_KEY` if you set that alias)
   → new value for Production + Preview → redeploy.
3. Confirm: a field page weather panel loads instead of the "missing API key"
   message.

### 3. SESSION_COOKIE_SECRET (set for the first time)
1. Generate a strong random value:
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
2. Vercel → add `SESSION_COOKIE_SECRET` = that value for **Production + Preview**.
3. Redeploy.
   - Effect: any existing dev-login cookies are invalidated (re-login). Real
     Supabase-auth sessions are unaffected — they don't use this cookie.
   - Without it set, dev-login on a deployed environment **fails closed** (no
     session validates), which is safe but means "dev-login won't work on
     staging until this is set."
4. It is already in your local `.env.local` (added 2026-07-18).

## The anon / publishable key (lower priority)

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is public by design (it ships in the browser
bundle) — it is *not* a secret and does not need rotating on its own. It only
matters if you roll the **legacy JWT secret**, which regenerates anon +
service_role together; in that case update BOTH Vercel env vars in the same
redeploy or the app breaks. The anon key's safety comes from RLS + table grants,
which the security audits cover — not from secrecy.

## After any rotation

- Confirm FileVault is on for the Mac holding `.env.local`.
- Note the date here or in the security memory so the next audit knows.
- If a key leaked publicly (git push, screenshot, paste), assume it was scraped
  within minutes — rotate first, investigate second.

## Other env-managed secrets (rotate on the same triggers, not urgent now)

`RESEND_API_KEY`, `SCHEDULE_PUSH_TOKEN`, `CRON_SECRET`, `DAKTRONICS_ADAPTER_TOKEN`,
`TWILIO_AUTH_TOKEN`, `SPORTSENGINE_CLIENT_SECRET`, `STRIPE_SECRET_KEY` (unused —
payments are out of scope). None are known-leaked; rotate if suspected.
