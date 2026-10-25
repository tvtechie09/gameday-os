# Weather & Safety Operations 1.0A — implementation contract

Issue: #18

## Objective

Deliver the first reusable Weather & Safety slice on a clean branch from current `main`:

`authorized manual Lightning Hold while provider/detector is OFFLINE -> affected field/game operational HOLD -> role-scoped coach/family presentation -> authorized ALL CLEAR -> prior-state-safe recovery -> audit history`

This is a sport-neutral operational incident workflow. It must not fork a second weather stack or hard-code baseball/soccer behavior into the underlying model.

## Reuse decisions already made

Reuse/extend the existing primitives documented in #18:

- weather/provider evidence from `weather-live.ts` and `storm-watch.ts`
- field operational projection through existing field status + `updateFieldStatus()` authorization/audit path
- alerts/notifications as projections of incident truth, never as the source of truth
- session/game records remain scheduled/active/final; expose weather HOLD as an operational overlay rather than corrupting core game state
- existing storm-response side effects may be refactored behind incident orchestration instead of duplicated
- existing role/permission, tenant-isolation, provenance, and audit primitives remain authoritative

## Required canonical incident behavior

The implementation needs one durable incident identity/state that can answer, together:

- incident type and lifecycle (`LIGHTNING_HOLD`, active, cleared/resolved)
- venue/tenant
- source/provenance and provider-health snapshot (including OFFLINE/UNAVAILABLE)
- declaring actor/authority and clearing actor/authority
- affected fields/pitches and games/matches
- declared/updated/cleared timestamps
- next-update target when used
- clearance rule/criteria description
- audit/state-transition history
- enough prior field state to restore safely after All Clear

Provider health is evidence, not authority. An OFFLINE detector must not block an authorized manual hold.

## Recovery invariant

All Clear must not blindly set every affected field to `open`.

Capture or otherwise preserve the pre-incident operational state so a field already closed, delayed for another reason, or under maintenance remains in the correct state after the lightning incident clears.

Likewise, games/matches should lose the incident HOLD overlay when cleared without rewriting their underlying scheduled/active/final lifecycle.

## Authorization

Only roles with the appropriate venue/tournament incident authority may declare or clear the incident. Staff/Coach/Parent remain read-only unless separately granted.

Tenant isolation is mandatory: no cross-venue/cross-organization read or mutation path.

## First-slice acceptance matrix

Before this PR may leave draft, prove all of the following with automated tests where practical and hosted/manual evidence where necessary:

1. **Provider OFFLINE + authorized manual hold succeeds.**
2. **Unauthorized declaration is denied** and writes no operational mutation.
3. **Affected fields project HOLD/delayed** using existing field primitives.
4. **Affected games expose a HOLD overlay** without corrupting core game/session state.
5. **Coach sees only relevant scoped incident/game instruction.**
6. **Family sees one authoritative scoped status** with source attribution and next-update language when present.
7. **Authorized All Clear restores correct prior field state**, removes game HOLD overlay, and preserves the incident record/history.
8. **Tenant-isolation negative tests pass.**
9. **Alert/notification delivery failure does not roll back incident truth.**
10. **NLSA synthetic demo can consume the same shared incident behavior** without soccer-specific weather logic in the core model.

## Explicitly out of scope for 1.0A

- live detector integration
- automated weather-provider declaration
- SMS/email/external-platform fan-out beyond existing reusable delivery plumbing
- changes to registration, scorekeeping, streaming, payments, or league-management scope
- production data mutation or production deployment
- claims that New Lenox Baseball or NLSA has adopted the product

## Operating direction

Daniel/engineering owns implementation on this clean branch now that the Pointman access incident is closed. Priya validates workflow/authority semantics; Owen validates role, tenant, and audit boundaries. Rachel/Alex may use the flow for demo/creative only after Product/Engineering marks depicted behavior as implemented versus roadmap. Elena reviews external safety/product claims before publication.

Keep changes bounded to #18. Do not pull unrelated NLSA historical branch divergence into this branch.