# Secrets rotation runbook

**Owner:** Kyle (dashboard access + credentials required — cannot be automated).
**When:** now (two keys were previously exposed), and on any future suspicion,
laptop loss, or contractor offboarding. Budget ~15 minutes.

## What must rotate now

| Secret | Where it lives | Why now |
|---|---|---|
| ~~Supabase **service_role**~~ ✅ **ROTATED 2026-08-10** | Vercel env `SUPABASE_SERVICE_ROLE_KEY` (+ `.env.local`) | Was exposed. Now a `sb_secret_…` key; the leaked legacy key is **disabled**. |
| **OpenWeather** API key | Vercel env `OPENWEATHER_API_KEY` (+ `.env.local`) | Previously exposed. Low blast radius but leaked = rotate. |
| **`SESSION_COOKIE_SECRET`** (NEW) | Vercel env — **not yet set** | Signs the session cookie (see the cookie-signing change). Must be set before dev-login is ever enabled on a deploy. |

Repo scan (done 2026-07-18): **no secret is committed to git — current tree or
full history.** `.env.example` is placeholders only; `.env*` is gitignored. So
rotation is a dashboard + Vercel-env task; there is no git history to scrub.

## Order of operations (zero downtime)

Rotate one key at a time; each finishes with a Vercel redeploy so the new value
is live before you invalidate the old one.

### 1. Supabase service_role key — ✅ DONE 2026-08-10

**The original plan in this runbook was not possible, and the reason matters.**

There is no longer a "roll the JWT secret" button. This project migrated to ECC
(P-256) JWT signing keys on 2026-06-10, after which the legacy HS256 shared
secret became verify-only: the dashboard states it "can only be changed by
rotating to a standby key and then revoking it." So legacy `anon` and
`service_role` keys **cannot be regenerated** — only revoked. There was no
fast-cutover option; migrating to the new key format was the only path.

Which was the better path anyway: new-format keys work *alongside* legacy ones,
so nothing broke until we chose to break it, and we broke it only after proving
the replacement worked. Zero downtime.

What was actually done:

1. Created a fresh secret key (Settings → API Keys → **Publishable and secret
   API keys** → New secret key). Did not reuse the June `default` secret, whose
   exposure history is unknown.
2. Set **the same variable names** to new-format values — no code changes, since
   nothing decodes these keys as JWTs:
   - `SUPABASE_SERVICE_ROLE_KEY` = `sb_secret_…`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_…`
   Applied in **both** Vercel projects — `gameday-os` (Production + Preview) and
   `game-day-team` (**Production only**; its Preview points at the staging
   Supabase project and must keep that project's own keys) — plus
   `gameday-venue-os/.env.local`.
3. Redeployed both projects with **"Use existing Build Cache" unchecked**;
   `NEXT_PUBLIC_*` is inlined at build time, so a cached build keeps the old key.
4. Verified both apps served real database content.
5. Settings → API Keys → **Legacy anon, service_role API keys** → Disable.

**Only two variable names mattered.** The projects carry nine Supabase env vars
between them (`SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_ANON_KEY`,
the publishable ones…), but a grep showed the code reads exactly two. The rest
are leftovers from the Vercel–Supabase integration and were left alone.

**Gotchas worth knowing next time:**

- **Two dialogs.** The first is a generic OAuth-integration warning. The second
  is the real one and requires typing `disable`. Clicking through the first
  changes nothing — easy to believe you're done when you aren't.
- **~45 seconds of propagation.** The legacy key kept returning HTTP 200 for
  roughly a minute after the switch flipped. Do not conclude the disable failed.
- **Verify with the REAL key, never a hand-made one.** A fabricated legacy-format
  key returns `{"message":"Invalid API key"}` whether or not legacy keys are
  disabled, which reads as success and proves nothing. The genuine
  disabled-state response is distinct: `{"message":"Legacy API keys are
  disabled"}`. Fetch the real key via the Management API
  (`/v1/projects/{ref}/api-keys?reveal=true`) and test with that.
- **Reversible.** After disabling, the panel offers "Re-enable JWT-based API
  keys". Good to know before you flip it on production.
- **No forced logouts.** User sessions are signed by the current ECC key, not the
  legacy secret, so nobody was signed out.

**Verified after the cutover:** the real legacy key returns 401 "Legacy API keys
are disabled"; `gameday-os` renders live venue data; both apps' pages return 200
with no error markers; `.env.local` works against production; the staging
project (separate) is unaffected.

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
