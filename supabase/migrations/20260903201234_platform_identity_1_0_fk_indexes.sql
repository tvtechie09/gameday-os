-- Platform Identity 1.0 staging follow-up.
-- Cover foreign-key maintenance paths identified by the Supabase performance
-- advisor after the additive foundation migration was applied.

create index if not exists people_organization_id_idx on public.people (organization_id);
create index if not exists people_user_id_idx on public.people (user_id);
create index if not exists account_people_user_id_idx on public.account_people (user_id);
create index if not exists person_source_identities_connection_id_idx on public.person_source_identities (connection_id);
create index if not exists person_identifiers_source_identity_id_idx on public.person_identifiers (source_identity_id);
create index if not exists person_relationships_subject_person_id_idx on public.person_relationships (subject_person_id);
create index if not exists person_relationships_related_person_id_idx on public.person_relationships (related_person_id);
create index if not exists person_relationships_source_identity_id_idx on public.person_relationships (source_identity_id);
create index if not exists person_provenance_assertions_organization_id_idx on public.person_provenance_assertions (organization_id);
create index if not exists identity_resolution_cases_source_identity_id_idx on public.identity_resolution_cases (source_identity_id);
create index if not exists identity_resolution_cases_candidate_person_id_idx on public.identity_resolution_cases (candidate_person_id);
create index if not exists identity_resolution_cases_reviewed_by_user_id_idx on public.identity_resolution_cases (reviewed_by_user_id);
create index if not exists identity_separation_rules_organization_id_idx on public.identity_separation_rules (organization_id);
create index if not exists identity_separation_rules_person_id_idx on public.identity_separation_rules (person_id);
create index if not exists identity_separation_rules_decided_by_user_id_idx on public.identity_separation_rules (decided_by_user_id);
create index if not exists identity_resolution_events_person_id_idx on public.identity_resolution_events (person_id);
create index if not exists identity_resolution_events_source_identity_id_idx on public.identity_resolution_events (source_identity_id);
create index if not exists identity_resolution_events_previous_person_id_idx on public.identity_resolution_events (previous_person_id);
create index if not exists identity_resolution_events_actor_user_id_idx on public.identity_resolution_events (actor_user_id);
create index if not exists identity_authority_rules_organization_id_idx on public.identity_authority_rules (organization_id);
create index if not exists identity_authority_rules_created_by_user_id_idx on public.identity_authority_rules (created_by_user_id);
create index if not exists person_legacy_links_person_id_idx on public.person_legacy_links (person_id);
