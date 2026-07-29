-- Org-level advertising policy (2026-07-29). Phase 2 of
-- docs/sponsor-prohibited-categories.md.
--
-- Policy is set by the governing body, not per complex: a park district sets it
-- once rather than six times. (A later phase lets a venue be STRICTER than its
-- org, never looser — not built yet.)
--
-- Nullable on purpose, and null is NOT the same as an empty array:
--   null = never configured  -> the app falls back to the recommended youth-sports
--          default, and says so plainly in the UI (safe default, visibly editable).
--   []   = configured to prohibit nothing -> a real decision, honored as-is.
-- Collapsing the two would either strip protection from every existing org or
-- silently re-apply a default over a venue's explicit choice.
alter table public.organizations
  add column if not exists prohibited_sponsor_categories jsonb;
