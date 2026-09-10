export type PrivacyRecordCounts = {
  accounts: number;
  identifiers: number;
  sourceIdentities: number;
  organizationLinks: number;
  relationshipsAsSubject: number;
  relationshipsAsRelated: number;
  provenance: number;
  legacyLinks: number;
  domainMemberships: number;
  projectionItems: number;
  auditEvents: number;
};

export type PrivacyImpact = {
  personId: string;
  organizationId: string;
  removable: Array<{ recordClass: string; count: number }>;
  detachable: Array<{ recordClass: string; count: number }>;
  anonymizable: Array<{ recordClass: string; count: number }>;
  retained: Array<{ recordClass: string; count: number; reason: string }>;
  blockers: string[];
  destructiveExecutionAllowed: false;
};

export function buildPrivacyImpact(personId: string, organizationId: string, counts: PrivacyRecordCounts): PrivacyImpact {
  const blockers = [
    "RETENTION_POLICY_REQUIRED",
    "CHILD_GUARDIAN_POLICY_REQUIRED",
    "PROVIDER_RESYNC_TOMBSTONE_POLICY_REQUIRED",
    "REQUESTOR_VERIFICATION_POLICY_REQUIRED",
  ];
  if (counts.relationshipsAsSubject + counts.relationshipsAsRelated > 0) blockers.push("RELATIONSHIP_REVIEW_REQUIRED");
  if (counts.accounts > 0) blockers.push("AUTH_ACCOUNT_SEPARATION_REQUIRED");
  if (counts.projectionItems > 0) blockers.push("DOMAIN_PROJECTION_CLEANUP_REQUIRED");

  return {
    personId,
    organizationId,
    removable: [
      { recordClass: "optional identifiers", count: counts.identifiers },
      { recordClass: "provider links after approved tombstone", count: counts.sourceIdentities },
    ],
    detachable: [
      { recordClass: "authentication account link", count: counts.accounts },
      { recordClass: "organization links", count: counts.organizationLinks },
      { recordClass: "domain memberships and projections", count: counts.domainMemberships + counts.projectionItems },
    ],
    anonymizable: [{ recordClass: "canonical profile", count: 1 }],
    retained: [
      { recordClass: "identity resolution audit events", count: counts.auditEvents, reason: "Security and decision integrity; actor policy pending" },
      { recordClass: "provenance references", count: counts.provenance, reason: "Source accountability; value-retention policy pending" },
      { recordClass: "legacy link history", count: counts.legacyLinks, reason: "Prevents accidental remapping; pseudonymization policy pending" },
      { recordClass: "other people's relationship records", count: counts.relationshipsAsRelated, reason: "One person's request cannot erase another person's history" },
    ],
    blockers,
    destructiveExecutionAllowed: false,
  };
}

export function privacyOperationDefinitions() {
  return {
    export: "Generate a scoped machine-readable copy without changing records.",
    deactivate: "Stop active use while preserving identity and relationship history.",
    erase: "Delete or de-identify approved personal fields only after dependency review and policy approval.",
    providerUnlink: "Disconnect a source identity without deleting the canonical person.",
    accountDeletion: "Remove or disable authentication separately from canonical person semantics.",
  } as const;
}
