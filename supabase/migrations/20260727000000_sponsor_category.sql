-- Sponsor category (2026-07-27). Phase 1 of BOTH sponsor roadmap features:
-- category exclusivity (docs/sponsor-category-exclusivity.md) and prohibited
-- categories / advertising policy (docs/sponsor-prohibited-categories.md). Both
-- compare sponsors by category, so the field is built once and serves both.
--
-- Nullable on purpose: existing sponsors have no category and that is a normal
-- state, not an error. The app reads an unset value as "Uncategorized" and
-- prompts rather than guessing — a sponsor is never auto-classified.
--
-- No CHECK constraint: the valid vocabulary lives in sponsor-category-core.ts and
-- is validated on write. A DB constraint would mean a migration every time a real
-- venue names an industry we didn't anticipate, and would reject rows the app
-- already treats as harmlessly unknown.
alter table public.sponsors
  add column if not exists category text;

-- Conflict detection (Phase 2) filters by category within an org.
create index if not exists sponsors_category_idx on public.sponsors (organization_id, category) where category is not null;
