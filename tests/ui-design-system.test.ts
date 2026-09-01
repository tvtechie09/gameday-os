import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const primitives = readFileSync("src/components/ui/gameday-ui.tsx", "utf8");
const overlays = readFileSync("src/components/ui/overlays.tsx", "utf8");
const shell = readFileSync("src/components/access/app-shell.tsx", "utf8");
const bottomNavigation = readFileSync("src/components/access/bottom-navigation.tsx", "utf8");
const commandCenter = readFileSync("src/app/admin/command-center/page.tsx", "utf8");

test("shared GameDay design system exposes the 1.0A component contract", () => {
  for (const component of [
    "PageShell", "PageTitle", "SectionHeader", "Card", "GameDayCard", "StatusChip", "AlertBanner",
    "PrimaryButton", "SecondaryButton", "DestructiveButton", "IconButton", "QuickActionButton", "EmptyState",
    "LoadingState", "ErrorState", "InfoRow", "ActionRow", "FormField", "SelectField", "SearchField", "Tabs",
  ]) {
    assert.match(primitives, new RegExp(`export function ${component}\\b`));
  }
  assert.match(overlays, /export function Modal\b/);
  assert.match(overlays, /export function Sheet\b/);
  assert.match(overlays, /export const Drawer = Sheet/);
});

test("universal GameDay card keeps one primary action and progressively discloses secondary context", () => {
  assert.match(primitives, /export type GameDayCardProps/);
  assert.match(primitives, /primaryAction: ReactNode/);
  assert.match(primitives, /secondaryActions\?: ReactNode/);
  assert.match(primitives, /<summary[^>]*>\s*More details/);
  assert.match(primitives, /export function ScheduleChangeBanner/);
  assert.match(primitives, /export function GameDayCardSkeleton/);
});

test("mobile shell keeps navigation capability-filtered and thumb reachable", () => {
  assert.match(shell, /buildMobileNavigation\(navGroups\)/);
  assert.match(shell, /selected\.slice\(0, 4\)/);
  assert.match(shell, /pb-\[calc\(5\.5rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(bottomNavigation, /aria-label="Mobile primary navigation"/);
  assert.match(bottomNavigation, /min-h-14/);
  assert.match(bottomNavigation, /env\(safe-area-inset-bottom\)/);
  assert.match(bottomNavigation, />More</);
});

test("global bottom navigation replaces the Command Center fixed-route bar", () => {
  assert.doesNotMatch(commandCenter, /fixed inset-x-3 bottom-3/);
  assert.match(commandCenter, /aria-label="Mobile operations"/);
  assert.match(commandCenter, /href="#field-board"/);
  assert.match(commandCenter, /href="#attention-queue"/);
});

test("sheet and modal use native dialog focus and dismissal behavior", () => {
  assert.match(overlays, /showModal\(\)/);
  assert.match(overlays, /onCancel=/);
  assert.match(overlays, /aria-labelledby=/);
  assert.match(overlays, /aria-describedby=/);
});
