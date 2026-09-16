# GameDay OS delegated engineering authority

## Purpose and precedence

This document is the binding approval policy for Codex and other delegated engineering agents working in this repository. Its purpose is to let routine engineering work continue without avoidable CEO approval pauses while preserving clear gates around production, customer data, security, company commitments, and irreversible decisions.

Default to execution, not approval-seeking. If an action is inside an already-approved issue or pull-request scope and satisfies every delegated-authority condition below, proceed, verify the result, and record evidence without asking Kyle or the CEO for another approval.

This policy grants authority; it does not relax authentication, tenant isolation, audit, change-control, provider, or platform safety requirements. More specific written restrictions in the approved issue, pull request, incident plan, or environment runbook still apply.

## Delegated-authority conditions

An action is delegated only when all of the following are true:

- It is limited to local, development, preview, or staging environments. Production is untouched.
- It is within the stated scope and intended outcome of an approved issue or pull request.
- It does not modify real customer, member, player, parent, operator, or partner data.
- It is routine and reversible or has a tested, practical recovery path.
- It preserves the intended security posture and does not create a material privilege expansion.
- It does not create material spend, a legal or compliance obligation, a public commitment, or an ownership or equity decision.
- It does not establish a new material product or architecture direction.
- Secrets remain undisclosed: do not print, log, commit, paste into tickets, or persist credential values outside the approved secret store.

When these conditions are satisfied, proceed through normal tool or provider confirmations after verifying the target, environment, scope, and recovery path.

## Approval matrix

| Action | Default authority | Required safeguards and evidence | Escalate when |
| --- | --- | --- | --- |
| Recreate a staging Auth user | Delegated | Confirm the account is staging-only and synthetic or internal; scope deletion to the intended Auth record and stale application link; recreate through the provider-supported Auth flow; preserve intended role and tenant assignments; keep the password undisclosed; verify a durable session and expected access. | The identity may be a real customer/user, production or shared customer data could be affected, role intent is unclear, or recovery is uncertain. |
| Rotate a staging credential | Delegated | Generate and store the replacement through the approved secret path; update only staging consumers; revoke the prior credential; verify service recovery; record identifiers/status only, never the secret value. | The credential is used by production, a customer, or an uncontrolled external system; rotation could cause unrecoverable access loss; or legal/notification duties may apply. |
| Clear a stale staging Auth link | Delegated | Confirm the exact identity mapping and environment; change only the stale link; preserve the application user, roles, tenant scope, and audit trail; verify relinking and login behavior. | Identity ownership is ambiguous, real user data is involved, or the change could merge or cross-link tenants. |
| Reseed synthetic or demo data | Delegated | Use clearly synthetic records; keep tenant scope explicit; prefer idempotent fixtures; snapshot or document the prior fixture state when useful; verify cleanup and no customer-row impact. | Data is not provably synthetic, tenant boundaries are uncertain, or the operation would remove nonrecoverable evidence. |
| Repair staging RLS or permissions when the intended policy is already defined | Delegated | Use the documented policy as the source of truth; make the narrowest forward-only change; do not weaken deny-by-default behavior; test allowed and denied paths, cross-tenant isolation, and rollback or forward recovery. | Intended policy is disputed or undefined, access broadens materially, production is involved, or the repair needs an irreversible destructive change. |
| Redeploy a preview | Delegated | Deploy only the approved branch/commit to a preview target; verify target identity, environment variables by name/status without exposing values, deployment readiness, and basic acceptance; do not promote or alias to production. | The action changes production traffic/domain routing, incurs material spend, or requires an unapproved external release. |
| Resolve a routine merge conflict or replay an approved branch | Delegated | Preserve the approved feature intent and unrelated changes; use a recoverable branch; rerun relevant checks; document any nontrivial resolution. | Resolution changes product behavior or architecture beyond approved scope, discards material work, rewrites shared history irreversibly, or cannot be resolved safely. |
| Repair test fixtures | Delegated | Limit changes to synthetic fixtures and test support; retain tenant and authorization semantics; verify the failing test and relevant neighboring checks. | The fixture mirrors or contains real customer data, or the repair would hide a product/security defect instead of testing intended behavior. |
| Apply an approved staging migration | Delegated | Confirm the exact staging project and migration; review its scope, dependencies, backup/forward-recovery plan, tenant effects, and security impact; apply through the supported migration path; verify schema/data behavior and migration history. | The migration targets production, touches real customer data, weakens security, is outside the approved change, or has no safe recovery path. |
| Rerun builds, tests, lint, or typecheck | Delegated | Use the repository's normal commands; avoid exposing secrets in output; report failures accurately and do not broaden scope merely to silence unrelated failures. | The run requires material spend, production mutation, customer-data access, or an unsafe external side effect. |
| Remediate staging credential exposure | Delegated | Immediately contain the staging-only exposure; revoke/rotate the credential; replace affected staging configuration; remove the exposed value from current work artifacts where reversible; scan the scoped surface; verify the old credential is invalid; record the incident without the value. | Production/customer credentials may be affected, shared history must be rewritten, evidence preservation or notification duties are unclear, legal/compliance review may be required, or the blast radius is not bounded. |

The list is intentionally concrete, not exhaustive. Closely analogous local/dev/preview/staging actions are delegated when every delegated-authority condition is satisfied.

## External-system confirmations

A confirmation prompt from Supabase, Vercel, GitHub, a cloud console, or another provider is not by itself an escalation to Kyle or the CEO. These prompts often label deletions, credential changes, migrations, or permission edits as destructive because they mutate provider state.

When the underlying action falls within this policy, Codex should:

1. Reconfirm the exact account/project, environment, resource, and intended scope.
2. Confirm that production and real customer data are excluded.
3. Confirm the recovery, rollback, or forward-repair path and any required evidence preservation.
4. Complete the provider confirmation and execute the action.
5. Verify the persisted result, authorization behavior, and cleanup as applicable.

Escalate based on the action's actual scope and risk, not merely the wording of the provider prompt. A provider-required interactive confirmation may still need to be completed, but it does not create a separate executive approval gate.

## Mandatory escalation gates

Stop and obtain explicit approval before proceeding when any of these applies:

- Production data, infrastructure, configuration, traffic, deployment, domain routing, or credentials would be mutated.
- Real customer, member, player, parent, operator, or partner data would be created, changed, relinked, exported, or deleted.
- The action is irreversible, destroys material evidence or work, or lacks a safe recovery path.
- A security control would be weakened, a deny-by-default boundary relaxed, or privileges materially expanded.
- The action selects a new material architecture, product direction, provider commitment, or scope not already approved.
- The action creates material spend or a contractual, procurement, legal, privacy, regulatory, or compliance obligation.
- The action sends or publishes public, customer-facing, partner-facing, press, incident, or reputational communication.
- The action affects company ownership, equity, financing, or related commitments.
- The action is outside the approved issue or pull-request scope and no safe, reversible containment or diagnostic path remains.

An escalation must state the exact blocked action, environment, affected resources/data, why delegated conditions do not apply, available recovery or containment options, and the smallest decision required. Continue any safe in-scope diagnostic or preparatory work while waiting.

## Execution and evidence standard

Delegated authority is permission to complete the work, not permission to lower the proof standard. For each material action:

- Establish the before state without retrieving or exposing secret values.
- Confirm the environment and exact target immediately before mutation.
- Use the narrowest supported change and preserve tenant isolation and auditability.
- Verify the persisted result, not only a successful command or transport response.
- Test relevant allowed and denied behavior, including cross-tenant denial for authorization changes.
- Clean up temporary synthetic fixtures and credentials when the approved workflow calls for cleanup.
- Record the action, result, relevant non-secret identifiers, checks performed, and any remaining limitation in the issue or pull request.

Do not describe staging proof as production proof. Do not mark work complete if the approved acceptance or cleanup requirements remain unfinished.
