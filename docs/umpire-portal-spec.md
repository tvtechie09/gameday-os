# Umpire portal — build-ready spec

**Status:** specced, not built. Top fast-follow candidate — build when a founding
venue asks (umpire wrangling is a chronic complex pain). Est. Phase 1 ≈ 1 day.

## The problem

Today an official is **not a user** — they're a per-game `session_officials` record
reached by a **per-assignment** magic link (`/officiate/[token]`) that shows one game
(confirm/decline). There is no place an umpire sees **all** their games, and the live
"running 20 min behind" signal — which exists on the venue side — is never shown to
the person driving to the field blind. This portal closes both gaps.

## Design decisions (settled)

- **Lightweight identity, not accounts.** Officials are transient/volunteer; a full
  login is friction. Mirror the coach/reservations pattern: a **stable per-official
  magic link** they bookmark. No password.
- **Group by official identity, keyed on normalized email/phone.** `session_officials`
  is per-game; we add a roster row so all of an umpire's games resolve from one token.
- **Reuse the existing engine.** Live early/late is `minutesBehind(game, now)` from
  `command-center-core` (already per-sport aware). No new delay logic.
- **Tokened, service-role reads, RLS locked** — same posture as every table added this
  session (anon/authenticated revoked; read via the admin client).

## Data model (Phase 1 migration)

```sql
create table official_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  full_name text not null,
  email text,                       -- normalized lower(trim())
  phone text,
  access_token text not null unique default encode(gen_random_bytes(18),'base64'),
  sms_opt_in boolean not null default false,   -- Phase 2 (consent; see SMS note)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index official_identities_email_idx on official_identities (lower(email)) where email is not null;

alter table session_officials add column official_identity_id uuid references official_identities(id) on delete set null;
-- Backfill: match existing session_officials to an identity by normalized email,
-- creating identities as needed. assignOfficial() links/creates the identity going forward.

alter table official_identities enable row level security;
revoke all on official_identities from anon;  revoke all on official_identities from authenticated;
```

`access_token` is unguessable and revocable (regenerate to invalidate a lost link).

## Pure core (testable, IO-free) — `official-schedule-core.ts`

```
buildOfficialSchedule(assignments, games, nowMs) -> OfficialScheduleEntry[]
```
Each entry: game label, venue, field, role, confirm status, and a resolved
`liveState`: `upcoming | on_time | behind(minutes) | in_progress | final | past`,
plus an **arriveBy** hint (scheduled start + current delay). Delay comes straight from
`minutesBehind`. This is where the tests live (mirror the reservations/command-center
pure cores): on-time vs behind, in-progress, done, an evening game across the DST/venue
boundary (reuse `isSameVenueDay`).

## IO + service — `official-schedule.ts`

- `getScheduleByToken(accessToken)` → identity + their session_officials + the games
  those sessions belong to → `buildOfficialSchedule`. Service role. Returns null on a
  bad token (never leaks which tokens exist).
- `confirmFromSchedule(accessToken, sessionOfficialId, "confirmed"|"declined")` —
  reuses `respondToAssignment` logic, scoped to that identity's own rows only.
- `assignOfficial()` (existing) gains: find-or-create the `official_identities` row and
  set `official_identity_id`; include the **portal link** (not just the per-assignment
  link) in the invite.

## UI — `/officiate/me/[token]/page.tsx`

Public, tokened, no login. Mirrors the wall-display polish (dark, big, glanceable):
- Header: official name · today's date.
- **Today** section first: each game as a row — time, field, teams, role, and a live
  chip: `On time` (green) · `Running 20 min behind` (amber = Signal) · `In progress`
  · `Final`. Amber only for attention, per brand.
- Each upcoming game: **Confirm / Decline** inline (updates status; clears the venue's
  "unconfirmed official" attention-queue item — nice loop).
- "Arrive by ~3:20" hint when a game is running behind.
- Auto-refresh ~30–60s (like the display board) so "behind" stays current.
- Rest-of-week below today.

Security: the page shows only THAT official's games — no venue-wide data, no other
officials. Token is random + revocable.

## Phase 2 — notifications (depends on SMS setup)

- Day-of reminder + **"your next game is running late/early"** text/email, driven by
  the same `liveState`. Reuses `sms.ts` (Twilio).
- **Gated on `sms_opt_in`** and honors STOP. NOTE: family/official SMS needs 10DLC
  registration + TCPA consent — see the SMS discussion; keep this behind opt-in and
  route consent wording past the lawyer. Umpires gave their phone at assignment, so
  consent is cleaner than family SMS, but still opt-out.

## Out of scope (v1)

No official self-scheduling/claiming (assigner's job), no pay tracking, no cross-venue
umpire marketplace. Read + confirm/decline + live status only.

## Why it's a strong fast-follow

It reuses everything we already have (session_officials, minutesBehind, sms.ts, the
tokened-surface + pure-core patterns), it visibly improves the venue's confirmation
rate (closes an attention-queue item), and it's the kind of concrete feature a GM
lights up about in a walkthrough. When one asks — this is ready to build.
