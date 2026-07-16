# Security audit — tenant isolation & public-key exposure (2026-07-15)

**Scope:** what can someone do with the **public anon key**? It ships in both apps'
client bundles and is now published on getgamedayos.com — by design (it's a public
key), which means **RLS and grants are the only thing between the internet and the
data.** This audit tested that claim by actually attacking the production database
as the `anon` role, not by reading policy definitions.

---

## ✅ The most important result: children's data is safe

`gameday_os_state_snapshots` — the GameDay Team snapshot holding **every child,
guardian, registration, and waiver** — is not merely RLS-protected:

```
set local role anon;
select * from gameday_os_state_snapshots;
-- ERROR: 42501: permission denied for table gameday_os_state_snapshots
```

`anon` holds **no table grant at all**. Defense in depth: the grant is missing *and*
there's no policy. Same for `billing_accounts`, `billing_invoices`,
`sponsor_campaigns`, `game_events`, `session_officials`, and `marketing_leads`
(insert-only). 62 tables use the safe "RLS on, no policy = deny-all" pattern.

**No ERROR-level advisor findings. No table has RLS disabled.**

---

## 🔴 CRITICAL — FIXED: scorekeeper credentials were world-readable

`sessions` had a `using (true)` public SELECT policy **and** a blanket table grant
to `anon`, and `sessions` holds `scorekeeper_token` and `scorekeeper_pin`.

**Proven:** as `anon`, read all 19 sessions *including the token and PIN.*

Impact: anyone with the public key could read every game's scorekeeper credentials
and take over any scoreboard. The PIN brute-force rate limiter added earlier was
guarding a door whose key was published.

**Fix applied:** revoked the blanket table SELECT from `anon`/`authenticated` and
re-granted **column-level** SELECT on every column *except* the two credentials.
Nothing in the app reads them with the anon key (`scorekeeper.ts` uses the service
role), so no functionality changed.

Verified: app read still returns all 19 rows; `select scorekeeper_pin` as anon →
`permission denied`.

## 🟠 HIGH — FIXED: fan/parent email harvest

`follows` is publicly readable and stores an optional **email** (collected on the
public field page for delay/alert updates). Anyone with the key could dump the
list. `follows.ts` uses the service role for all reads/writes, so anon never needed
it. **Fix:** same column-level treatment; `select email` as anon → `permission
denied`.

## 🟠 HIGH — FIXED: `work_items` fully open

Policy named *"Service role full access"* was actually granted `FOR ALL TO public
USING (true)` — full read **and write** for the entire internet. **Fix:** re-scoped
to `TO service_role`. Zero public policies remain on it.

---

## 🔴 CRITICAL — STILL OPEN: anyone can forge or delete a venue alert

**Proven** (rolled back, nothing persisted):

```
set local role anon;
insert into alerts (..., title, alert_priority, ...) values ('EVACUATE NOW', 'urgent', ...);
-- => succeeds
```

`anon` holds INSERT/UPDATE/**DELETE** grants plus `with_check (true)` policies on
`alerts`, `sessions`, `venues`, `fields`, `organizations`, `tournaments`,
`resources`, `volunteer_roles`, `amenities`, `audio_systems`, `cameras`,
`maintenance_records`, `scoreboard_profiles`, `session_events`, `sync_jobs`,
`sync_queue`, and more.

So an anonymous attacker can:
- **plant a fake urgent "EVACUATE NOW" emergency alert** at any venue, or
- **delete a real lightning warning**, or
- rewrite scores, reschedule, or delete games.

This is a **life-safety** issue, not just a data issue — the alert system is the one
thing we promised is free at every tier and always works.

### Root cause (architectural)

The venue app's write services use `getSupabaseServerClient()` — **the anon key**.
The app writes *as* `anon`, which is precisely why these wide-open policies exist.
**The app's credential and the attacker's credential are the same public key**, so
Postgres cannot distinguish them. No policy can fix that; the app must stop writing
with the anon key.

### The fix (proposed, not yet applied)

1. Switch the ~19 write services in `src/lib/services/*` from
   `getSupabaseServerClient()` → `getSupabaseAdminClient()` (service role,
   server-side only). 36 services already do this, so the key is configured.
   Authorization already happens in the app layer (capabilities / requirePermission).
2. Then drop every `anon`/`public` INSERT/UPDATE/DELETE policy and revoke the write
   grants, leaving `anon` **read-only** on the public surface.
3. Keep genuine public writes explicitly narrow (e.g. the `marketing_leads`
   insert-only pattern; follows/impressions already go through the service role).

Not applied unilaterally: it touches ~19 production services and deserves a
deliberate pass with tests + live verification.

## 🟡 MEDIUM — open: venue infrastructure disclosure

`venue_assets` is publicly readable and includes `ip_address` and `serial_number` —
internal network details of the venue. Needs the same column-level treatment, but
`venue-assets.ts` reads with the anon client, so the allowed-column list must be
checked against `assetSelect` first to avoid breaking the admin asset page.

## 🟡 Lower priority

- `auth_leaked_password_protection` disabled (enable in Supabase Auth settings).
- `extension_in_public` (pg_net) — cosmetic.
- Duplicate/overlapping legacy policies ("Allow read X" + "Public can read X") —
  cleanup, not a hole.

---

## Bottom line

The thing that would end the company — children's data — **held**. The thing that
could hurt someone — **the alert system** — is wide open and must be closed before
any real venue depends on it.
