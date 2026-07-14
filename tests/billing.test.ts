import assert from "node:assert/strict";
import test from "node:test";
import { annualizedCents, monthlyCents, summarizeBilling, type BillingAccount, type BillingInvoice } from "../src/lib/services/billing-core.ts";

const NOW = Date.parse("2026-07-14T12:00:00.000Z");
const day = (offsetDays: number) => new Date(NOW + offsetDays * 86_400_000).toISOString().slice(0, 10);

const account = (over: Partial<BillingAccount> = {}): BillingAccount => ({
  organizationId: "org1",
  planLabel: "Complex",
  amountCents: 150000,
  billingInterval: "month",
  status: "active",
  poNumber: null,
  notes: null,
  updatedAt: day(0),
  ...over,
});

const invoice = (over: Partial<BillingInvoice>): BillingInvoice => ({
  id: "i-" + Math.random(),
  organizationId: "org1",
  description: "Invoice",
  amountCents: 150000,
  status: "open",
  issuedOn: day(-10),
  dueOn: null,
  paidOn: null,
  poNumber: null,
  ...over,
});

test("annualized / monthly conversion respects the interval", () => {
  assert.equal(annualizedCents(150000, "month"), 1_800_000);
  assert.equal(annualizedCents(1_800_000, "year"), 1_800_000);
  assert.equal(monthlyCents(150000, "month"), 150000);
  assert.equal(monthlyCents(1_800_000, "year"), 150000);
});

test("summary rolls up outstanding, overdue, and paid-last-12mo", () => {
  const s = summarizeBilling(account(), [
    invoice({ status: "open", amountCents: 150000, dueOn: day(-2) }),  // overdue
    invoice({ status: "open", amountCents: 150000, dueOn: day(5) }),   // open, not yet due
    invoice({ status: "paid", amountCents: 150000, paidOn: day(-30) }), // paid recently
    invoice({ status: "paid", amountCents: 150000, paidOn: day(-400) }), // paid >12mo ago (excluded)
    invoice({ status: "void", amountCents: 999999 }),                  // ignored
  ], NOW);

  assert.equal(s.hasPlan, true);
  assert.equal(s.annualizedCents, 1_800_000);
  assert.equal(s.outstandingCents, 300000);   // two open
  assert.equal(s.overdueCents, 150000);        // one overdue
  assert.equal(s.overdueCount, 1);
  assert.equal(s.paidLast12moCents, 150000);   // only the recent paid one
  assert.equal(s.openInvoiceCount, 2);
});

test("next due date is the earliest open invoice due date", () => {
  const s = summarizeBilling(account(), [
    invoice({ status: "open", dueOn: day(20) }),
    invoice({ status: "open", dueOn: day(3) }),
    invoice({ status: "paid", dueOn: day(1), paidOn: day(-1) }), // paid, ignored for next-due
  ], NOW);
  assert.equal(s.nextDueOn, day(3));
});

test("no plan yet: zeros, no crash, and hasPlan is false", () => {
  const s = summarizeBilling(null, [invoice({ status: "open", amountCents: 5000 })], NOW);
  assert.equal(s.hasPlan, false);
  assert.equal(s.planLabel, "No plan set");
  assert.equal(s.annualizedCents, 0);
  assert.equal(s.monthlyCents, 0);
  assert.equal(s.outstandingCents, 5000); // an invoice can exist before a plan is set
});

test("a paused yearly plan still annualizes correctly", () => {
  const s = summarizeBilling(account({ billingInterval: "year", amountCents: 1_800_000, status: "paused" }), [], NOW);
  assert.equal(s.status, "paused");
  assert.equal(s.annualizedCents, 1_800_000);
  assert.equal(s.monthlyCents, 150000);
});
