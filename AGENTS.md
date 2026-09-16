# GameDay OS Codex Instructions

## Delegated engineering authority

Default to execution, not approval-seeking. Within an already-approved issue or pull-request scope, Codex is authorized to perform routine, reversible work in local, development, preview, and staging environments without asking Kyle or the CEO for separate approval.

This authority applies only while production remains untouched, no real customer data is changed, the intended security and access policy is preserved, and the action has a safe recovery path. External-system confirmation prompts, including Supabase destructive-action confirmations, are operational safety checks; they do not automatically create a Kyle/CEO approval requirement when the action is within this delegated authority.

Before requesting approval for engineering work, read and follow [`docs/ENGINEERING_AUTHORITY.md`](docs/ENGINEERING_AUTHORITY.md). That policy is binding and defines the approved action matrix, required safeguards, evidence expectations, and escalation gates.

Escalate only for production mutation or deployment; real customer data; irreversible destructive action; security weakening or material privilege expansion; a new material architecture or product direction; spend; legal or compliance obligations; public or reputational communication; ownership or equity; or work outside approved scope that has no safe reversible path.

Never display, log, commit, or persist secret values. Record what was changed and how it was verified without recording credentials.
