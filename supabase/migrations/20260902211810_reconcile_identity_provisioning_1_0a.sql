-- Staging Schema Reconciliation 1.0A: identity provisioning.
--
-- Forward-only delta from the current hosted schema. The historical identity
-- migrations are intentionally not replayed because staging already contains
-- a broader tenant/scope model that must remain intact.

alter table public.identity_invites
  add column organization_id uuid;

alter table public.identity_invites
  add constraint identity_invites_organization_id_fkey
  foreign key (organization_id)
  references public.organizations(id)
  on delete cascade;

create index identity_invites_organization_id_idx
  on public.identity_invites (organization_id);
