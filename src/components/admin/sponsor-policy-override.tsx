import Link from "next/link";
import { MIN_OVERRIDE_REASON_LENGTH } from "@/lib/services/sponsor-policy-core";

type SponsorPolicyOverrideProps = {
  disabled?: boolean;
};

// Shown only once a placement has actually been blocked. Keeping it hidden until
// then is deliberate: an override field sitting on the form at all times becomes
// a box people fill in by reflex, and the policy stops meaning anything.
export function SponsorPolicyOverride({ disabled }: SponsorPolicyOverrideProps) {
  return (
    <div className="grid gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <span className="text-sm font-black text-amber-950">Override the advertising policy</span>
      <p className="text-sm leading-6 text-amber-950">
        Policies have legitimate exceptions — a brewery backing the adult league, for instance. Record why, and this placement will
        proceed. Your name, the sponsor, the category, and this reason are written to the audit log.
      </p>
      <textarea
        className="min-h-20 rounded-lg border border-amber-300 bg-white px-3 py-2 text-base outline-none"
        disabled={disabled}
        minLength={MIN_OVERRIDE_REASON_LENGTH}
        name="policy_override_reason"
        placeholder="e.g. Adult league sponsorship only, approved by the board on 6/12."
      />
      <span className="text-xs text-amber-900">
        If this category should never have been blocked, fix the policy instead —{" "}
        <Link className="underline" href="/admin/sponsors/policy">
          advertising policy settings
        </Link>
        .
      </span>
    </div>
  );
}
