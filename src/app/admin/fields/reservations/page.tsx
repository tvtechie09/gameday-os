import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/access/session";
import { canManageFields, isPlatformAdmin } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getFields } from "@/lib/services/fields";
import { listGrants, loadGrantBoard, type BlockGrant } from "@/lib/services/field-reservations";
import { timeLabel } from "@/lib/services/field-reservations-core";
import type { Field } from "@/lib/types";
import { createGrantAction, endGrantAction, cancelClaimAction, approveClaimAction, denyClaimAction } from "./actions";

export const dynamic = "force-dynamic";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const inputCls = "min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm";
const labelCls = "text-xs font-bold text-[var(--muted)]";

function minuteLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function grantLine(g: BlockGrant, fieldName: string): string {
  const days = g.recurrence.daysOfWeek.slice().sort().map((d) => DAYS[d]).join("/");
  return `${fieldName} · ${days} · ${minuteLabel(g.recurrence.windowStartMinute)}–${minuteLabel(g.recurrence.windowEndMinute)}`;
}

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ grant?: string; error?: string; created?: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx || (!isPlatformAdmin(ctx) && !canManageFields(ctx))) redirect(getRoleHome(ctx));

  const sp = await searchParams;
  const [fields, grants] = await Promise.all([getFields().catch(() => [] as Field[]), listGrants().catch(() => [] as BlockGrant[])]);
  const fieldName = new Map(fields.map((f) => [f.id, f.name]));

  const selectedId = sp.grant && grants.some((g) => g.id === sp.grant) ? sp.grant : grants[0]?.id;
  // Next two weeks of slots for the selected block ("now" is captured in the service).
  const board = selectedId ? await loadGrantBoard(selectedId, ctx.userId) : null;
  const requested = board?.claims.filter((c) => c.status === "requested") ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="border-b border-[var(--line)] pb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Fields · Allocation</p>
        <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] sm:text-3xl">Field reservations</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Grant a league a recurring block on a field, then let their coaches claim slots first-come-first-served — no more
          emailing you to reserve time. You monitor every claim here and can bump a team when you need the field back.
        </p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Coaches claim from their own signed-in view (coming next). For now you can grant blocks and manage claims.
        </p>
      </header>

      {sp.error ? <p className="mt-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{sp.error}</p> : null}
      {sp.created ? <p className="mt-5 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">Block granted. Coaches can claim slots within it.</p> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Blocks list + create */}
        <aside className="grid gap-4">
          <section className="rounded-xl border border-[var(--line)] bg-white p-4">
            <h2 className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Blocks</h2>
            {grants.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">No blocks yet. Grant one below.</p>
            ) : (
              <ul className="mt-2 grid gap-1">
                {grants.map((g) => (
                  <li key={g.id}>
                    <Link
                      href={`/admin/fields/reservations?grant=${g.id}`}
                      className={`block rounded-lg px-3 py-2 text-sm ${g.id === selectedId ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--surface-2)]"}`}
                    >
                      <span className="block font-black">{g.granteeName}</span>
                      <span className={`block text-xs ${g.id === selectedId ? "text-white/80" : "text-[var(--muted)]"}`}>
                        {grantLine(g, fieldName.get(g.fieldId) ?? "—")}{g.status !== "active" ? ` · ${g.status}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <details className="rounded-xl border border-[var(--line)] bg-white p-4">
            <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Grant a new block</summary>
            <form action={createGrantAction} className="mt-3 grid gap-3">
              <label className="grid gap-1"><span className={labelCls}>League / club *</span>
                <input name="grantee_name" required placeholder="Illinois Celtics" className={inputCls} />
              </label>
              <label className="grid gap-1"><span className={labelCls}>Field *</span>
                <select name="field_id" required className={`${inputCls} bg-white font-bold`}>
                  <option value="">Pick a field</option>
                  {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </label>
              <fieldset className="grid gap-1">
                <span className={labelCls}>Days</span>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d, i) => (
                    <label key={d} className="flex items-center gap-1 text-xs font-semibold">
                      <input type="checkbox" name="days" value={i} defaultChecked={i >= 2 && i <= 4} /> {d}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1"><span className={labelCls}>Window start</span><input name="window_start" type="time" defaultValue="18:00" className={inputCls} /></label>
                <label className="grid gap-1"><span className={labelCls}>Window end</span><input name="window_end" type="time" defaultValue="21:00" className={inputCls} /></label>
              </div>
              <label className="grid gap-1"><span className={labelCls}>Slot length</span>
                <select name="slot_minutes" defaultValue="90" className={`${inputCls} bg-white font-bold`}>
                  <option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1"><span className={labelCls}>Season start</span><input name="season_start" type="date" required className={inputCls} /></label>
                <label className="grid gap-1"><span className={labelCls}>Season end</span><input name="season_end" type="date" required className={inputCls} /></label>
              </div>
              <label className="grid gap-1"><span className={labelCls}>Claim mode</span>
                <select name="claim_mode" defaultValue="first_come" className={`${inputCls} bg-white font-bold`}>
                  <option value="first_come">First come, first served</option>
                  <option value="approval">Coaches request, you approve</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" name="is_demo" /> Demo block</label>
              <button type="submit" className="min-h-11 rounded-lg bg-[var(--accent)] px-4 text-sm font-black text-white">Grant block</button>
            </form>
          </details>
        </aside>

        {/* Selected block: slots + claims */}
        <section className="grid gap-5">
          {!board ? (
            <p className="rounded-xl border border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)]">Select or grant a block to see its slots and claims.</p>
          ) : (
            <>
              <div className="rounded-xl border border-[var(--line)] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">{board.grant.granteeName}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">{grantLine(board.grant, fieldName.get(board.grant.fieldId) ?? "—")}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {board.grant.recurrence.slotMinutes}-min slots · {board.grant.claimMode === "approval" ? "You approve each request" : "First come, first served"}
                      {board.grant.status !== "active" ? ` · ${board.grant.status.toUpperCase()}` : ""}
                    </p>
                  </div>
                  {board.grant.status === "active" ? (
                    <form action={endGrantAction}>
                      <input type="hidden" name="grant_id" value={board.grant.id} />
                      <button type="submit" className="min-h-9 rounded-lg border border-[var(--line)] px-3 text-xs font-bold">End block</button>
                    </form>
                  ) : null}
                </div>
              </div>

              {/* Pending requests (approval mode) */}
              {requested.length > 0 ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
                  <h3 className="text-sm font-black text-amber-900">Requests waiting on you ({requested.length})</h3>
                  <ul className="mt-3 grid gap-2">
                    {requested.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3">
                        <span className="text-sm font-semibold">{c.claimedByName} — {timeLabel(c.startsAt)}–{timeLabel(c.endsAt)}</span>
                        <span className="flex gap-2">
                          <form action={approveClaimAction}>
                            <input type="hidden" name="claim_id" value={c.id} /><input type="hidden" name="grant_id" value={board.grant.id} />
                            <button className="min-h-9 rounded-lg bg-emerald-600 px-3 text-xs font-black text-white">Approve</button>
                          </form>
                          <form action={denyClaimAction}>
                            <input type="hidden" name="claim_id" value={c.id} /><input type="hidden" name="grant_id" value={board.grant.id} />
                            <button className="min-h-9 rounded-lg border border-[var(--line)] px-3 text-xs font-bold">Deny</button>
                          </form>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* The slot board (next 2 weeks) */}
              <div className="rounded-xl border border-[var(--line)] bg-white p-5">
                <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Next two weeks</h3>
                {board.slots.length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--muted)]">No slots in this window — the season may not have started, or the block has no days selected.</p>
                ) : (
                  <ul className="mt-3 grid gap-1">
                    {board.slots.map((slot) => {
                      const claim = board.claims.find((c) => (c.status === "confirmed" || c.status === "requested") && c.startsAt === slot.startsAt);
                      return (
                        <li key={slot.startsAt} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-soft)] py-2 last:border-0">
                          <span className="text-sm font-semibold">{slot.startLabel}–{slot.endLabel}</span>
                          <span className="flex items-center gap-3">
                            {slot.state.kind === "open" ? <span className="text-xs font-bold text-emerald-700">Open</span> : null}
                            {slot.state.kind === "taken" ? <span className="text-xs font-bold text-[var(--foreground)]">{slot.state.claimedByName}</span> : null}
                            {slot.state.kind === "mine" ? <span className="text-xs font-bold text-[var(--accent-strong)]">{slot.state.claimedByName} ({slot.state.status})</span> : null}
                            {slot.state.kind === "contested" ? <span className="text-xs font-bold text-amber-700">{slot.state.requests.length} requests</span> : null}
                            {claim ? (
                              <form action={cancelClaimAction}>
                                <input type="hidden" name="claim_id" value={claim.id} /><input type="hidden" name="grant_id" value={board.grant.id} />
                                <button className="min-h-8 rounded-lg border border-red-200 bg-red-50 px-2 text-xs font-bold text-red-800">Bump</button>
                              </form>
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
