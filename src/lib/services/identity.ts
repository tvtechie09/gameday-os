import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { resolveActorUserId } from "./actor";
import type { Database, Json } from "@/lib/supabase/types";
import type {
  IdentityAccessRequest,
  IdentityApproval,
  IdentityAuditLog,
  IdentityInvite,
  IdentityPermission,
  IdentityRole,
  IdentityRoleAssignment,
  IdentityScopeType,
  IdentityUser,
  OrganizationMembership,
} from "@/lib/types";

type IdentityUserRow = Database["public"]["Tables"]["users"]["Row"];
type RoleRow = Database["public"]["Tables"]["roles"]["Row"];
type PermissionRow = Database["public"]["Tables"]["permissions"]["Row"];
type RolePermissionRow = Database["public"]["Tables"]["role_permissions"]["Row"];
type OrganizationMembershipRow = Database["public"]["Tables"]["organization_memberships"]["Row"];
type UserRoleAssignmentRow = Database["public"]["Tables"]["user_role_assignments"]["Row"];
type IdentityInviteRow = Database["public"]["Tables"]["identity_invites"]["Row"];
type IdentityAccessRequestRow = Database["public"]["Tables"]["identity_access_requests"]["Row"];
type IdentityApprovalRow = Database["public"]["Tables"]["identity_approvals"]["Row"];
type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

export class PermissionDeniedError extends Error {
  status = 403;

  constructor(message = "Permission denied") {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

export const identityScopeTypes: IdentityScopeType[] = [
  "platform",
  "organization",
  "venue",
  "field",
  "play_surface",
  "tournament",
  "league",
  "team",
  "player",
  "family",
  "game",
  "session",
  "device",
  "integration",
];

const roleSelect = "id,key,name,description,created_at";
const permissionSelect = "id,key,name,description,created_at";
const userSelect = "id,auth_user_id,email,display_name,avatar_url,user_status,created_at,updated_at";
const membershipSelect = "id,organization_id,user_id,membership_status,joined_at,created_at,updated_at";
const assignmentSelect = "id,user_id,role_id,scope_type,scope_id,starts_at,ends_at,granted_by,assignment_status,revoked_by,revoked_at,approval_notes,created_at";
const inviteSelect = "id,organization_id,email,role_id,scope_type,scope_id,invite_status,invited_by,approved_by,expires_at,approved_at,revoked_at,approval_notes,created_at,updated_at";
const accessRequestSelect = "id,user_id,email,requested_role_id,requested_by,scope_type,scope_id,request_status,reason,approved_by,approved_at,revoked_by,revoked_at,approval_notes,created_at,updated_at";
const approvalSelect = "id,approval_status,approval_type,invite_id,access_request_id,assignment_id,scope_type,scope_id,requested_by,approved_by,revoked_by,reason,approval_notes,starts_at,ends_at,decided_at,created_at,updated_at";
const auditSelect = "id,actor_user_id,action,resource_type,resource_id,scope_type,scope_id,metadata,created_at";

function mapIdentityUser(row: IdentityUserRow): IdentityUser {
  return {
    authUserId: row.auth_user_id,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    displayName: row.display_name,
    email: row.email,
    id: row.id,
    updatedAt: row.updated_at,
    userStatus: row.user_status,
  };
}

function mapRole(row: RoleRow): IdentityRole {
  return {
    createdAt: row.created_at,
    description: row.description,
    id: row.id,
    key: row.key,
    name: row.name,
  };
}

function mapPermission(row: PermissionRow): IdentityPermission {
  return {
    createdAt: row.created_at,
    description: row.description,
    id: row.id,
    key: row.key,
    name: row.name,
  };
}

function mapOrganizationMembership(row: OrganizationMembershipRow): OrganizationMembership {
  return {
    createdAt: row.created_at,
    id: row.id,
    joinedAt: row.joined_at,
    membershipStatus: row.membership_status,
    organizationId: row.organization_id,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

function mapAssignment(row: UserRoleAssignmentRow, role?: IdentityRole): IdentityRoleAssignment {
  return {
    createdAt: row.created_at,
    endsAt: row.ends_at,
    grantedBy: row.granted_by,
    id: row.id,
    roleId: row.role_id,
    roleKey: role?.key ?? "unknown",
    roleName: role?.name ?? "Unknown role",
    scopeId: row.scope_id,
    scopeType: row.scope_type,
    startsAt: row.starts_at,
    assignmentStatus: row.assignment_status,
    revokedAt: row.revoked_at,
    revokedBy: row.revoked_by,
    approvalNotes: row.approval_notes,
    userId: row.user_id,
  };
}

function mapInvite(row: IdentityInviteRow, role?: IdentityRole): IdentityInvite {
  return {
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    approvalNotes: row.approval_notes,
    createdAt: row.created_at,
    email: row.email,
    expiresAt: row.expires_at,
    id: row.id,
    invitedBy: row.invited_by,
    inviteStatus: row.invite_status,
    organizationId: row.organization_id,
    roleId: row.role_id,
    roleKey: role?.key ?? "unknown",
    roleName: role?.name ?? "Unknown role",
    revokedAt: row.revoked_at,
    scopeId: row.scope_id,
    scopeType: row.scope_type,
    updatedAt: row.updated_at,
  };
}

function mapAccessRequest(row: IdentityAccessRequestRow, role?: IdentityRole): IdentityAccessRequest {
  return {
    createdAt: row.created_at,
    email: row.email,
    id: row.id,
    reason: row.reason,
    requestStatus: row.request_status,
    requestedRoleId: row.requested_role_id,
    requestedRoleKey: role?.key ?? null,
    requestedRoleName: role?.name ?? null,
    requestedBy: row.requested_by,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    revokedAt: row.revoked_at,
    revokedBy: row.revoked_by,
    approvalNotes: row.approval_notes,
    scopeId: row.scope_id,
    scopeType: row.scope_type,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

function mapApproval(row: IdentityApprovalRow): IdentityApproval {
  return {
    accessRequestId: row.access_request_id,
    approvalNotes: row.approval_notes,
    approvalStatus: row.approval_status,
    approvalType: row.approval_type,
    approvedBy: row.approved_by,
    assignmentId: row.assignment_id,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    endsAt: row.ends_at,
    id: row.id,
    inviteId: row.invite_id,
    reason: row.reason,
    requestedBy: row.requested_by,
    revokedBy: row.revoked_by,
    scopeId: row.scope_id,
    scopeType: row.scope_type,
    startsAt: row.starts_at,
    updatedAt: row.updated_at,
  };
}

function mapAuditLog(row: AuditLogRow): IdentityAuditLog {
  return {
    action: row.action,
    actorUserId: row.actor_user_id,
    createdAt: row.created_at,
    id: row.id,
    metadata: row.metadata,
    resourceId: row.resource_id,
    resourceType: row.resource_type,
    scopeId: row.scope_id,
    scopeType: row.scope_type,
  };
}

function mapRolesById(roles: IdentityRole[]) {
  return new Map(roles.map((role) => [role.id, role]));
}

function isAssignmentActive(assignment: UserRoleAssignmentRow, now = new Date()) {
  const startsAt = assignment.starts_at ? new Date(assignment.starts_at) : null;
  const endsAt = assignment.ends_at ? new Date(assignment.ends_at) : null;

  return assignment.assignment_status === "approved" && (!startsAt || startsAt <= now) && (!endsAt || endsAt > now);
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function getIdentityRoles(): Promise<IdentityRole[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("roles").select(roleSelect).order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRole);
}

export async function getIdentityUsers(): Promise<IdentityUser[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("users").select(userSelect).order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapIdentityUser);
}

export async function getOrganizationMemberships(): Promise<OrganizationMembership[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("organization_memberships").select(membershipSelect).order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapOrganizationMembership);
}

export async function getIdentityPermissions(): Promise<IdentityPermission[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("permissions").select(permissionSelect).order("key", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapPermission);
}

export async function getIdentityRoleAssignments(): Promise<IdentityRoleAssignment[]> {
  const supabase = getSupabaseAdminClient();
  const [{ data: assignments, error: assignmentError }, roles] = await Promise.all([
    supabase.from("user_role_assignments").select(assignmentSelect).order("created_at", { ascending: false }),
    getIdentityRoles(),
  ]);

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  const rolesById = mapRolesById(roles);
  return (assignments ?? []).map((assignment) => mapAssignment(assignment, rolesById.get(assignment.role_id)));
}

export async function getIdentityInvites(): Promise<IdentityInvite[]> {
  const supabase = getSupabaseAdminClient();
  const [{ data: invites, error }, roles] = await Promise.all([
    supabase.from("identity_invites").select(inviteSelect).order("created_at", { ascending: false }),
    getIdentityRoles(),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const rolesById = mapRolesById(roles);
  return (invites ?? []).map((invite) => mapInvite(invite, rolesById.get(invite.role_id)));
}

export async function getIdentityAccessRequests(): Promise<IdentityAccessRequest[]> {
  const supabase = getSupabaseAdminClient();
  const [{ data: accessRequests, error }, roles] = await Promise.all([
    supabase.from("identity_access_requests").select(accessRequestSelect).order("created_at", { ascending: false }),
    getIdentityRoles(),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const rolesById = mapRolesById(roles);
  return (accessRequests ?? []).map((accessRequest) => mapAccessRequest(accessRequest, accessRequest.requested_role_id ? rolesById.get(accessRequest.requested_role_id) : undefined));
}

export async function getIdentityApprovals(): Promise<IdentityApproval[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("identity_approvals").select(approvalSelect).order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapApproval);
}

export async function createUserRoleAssignment(data: {
  userId: string;
  roleId: string;
  scopeType: IdentityScopeType | string;
  scopeId: string;
  startsAt?: string | null;
  endsAt?: string | null;
  grantedBy?: string | null;
  approvalNotes?: string | null;
}): Promise<IdentityRoleAssignment> {
  const supabase = getSupabaseAdminClient();
  const actor = assertActorUserId(data.grantedBy);
  await requirePermission(actor, "identity.role.manage", data.scopeType, data.scopeId);

  const { data: assignment, error } = await supabase
    .from("user_role_assignments")
    .insert({
      ends_at: normalizeOptionalText(data.endsAt),
      granted_by: actor,
      role_id: data.roleId,
      scope_id: data.scopeId.trim(),
      scope_type: data.scopeType,
      starts_at: normalizeOptionalText(data.startsAt),
      assignment_status: "approved",
      approval_notes: normalizeOptionalText(data.approvalNotes),
      user_id: data.userId.trim(),
    })
    .select(assignmentSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const roles = await getIdentityRoles();
  const mappedAssignment = mapAssignment(assignment, roles.find((role) => role.id === assignment.role_id));
  await safelyLogAudit({
    action: "identity.role_assignment.created",
    actorUserId: actor,
    metadata: {
      assigned_user_id: mappedAssignment.userId,
      role_id: mappedAssignment.roleId,
      role_key: mappedAssignment.roleKey,
    },
    resourceId: mappedAssignment.id,
    resourceType: "user_role_assignment",
    scopeId: mappedAssignment.scopeId,
    scopeType: mappedAssignment.scopeType,
  });
  await createApprovalRecord({
    approvalStatus: "approved",
    approvalType: "role_assignment",
    approvedBy: actor,
    assignmentId: mappedAssignment.id,
    notes: data.approvalNotes,
    requestedBy: mappedAssignment.userId,
    scopeId: mappedAssignment.scopeId,
    scopeType: mappedAssignment.scopeType,
    startsAt: mappedAssignment.startsAt,
    endsAt: mappedAssignment.endsAt,
  });

  return mappedAssignment;
}

export async function createIdentityInvite(data: {
  email: string;
  roleId: string;
  scopeType: IdentityScopeType | string;
  scopeId: string;
  invitedBy: string;
  organizationId?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
}): Promise<IdentityInvite> {
  const supabase = getSupabaseAdminClient();
  const actor = assertActorUserId(data.invitedBy);
  await requirePermission(actor, "identity.role.manage", data.scopeType, data.scopeId);

  const { data: invite, error } = await supabase
    .from("identity_invites")
    .insert({
      email: data.email.trim().toLowerCase(),
      expires_at: normalizeOptionalText(data.expiresAt),
      invited_by: actor,
      organization_id: normalizeOptionalText(data.organizationId),
      role_id: data.roleId,
      scope_id: data.scopeId.trim(),
      scope_type: data.scopeType,
      approval_notes: normalizeOptionalText(data.notes),
    })
    .select(inviteSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const roles = await getIdentityRoles();
  const mappedInvite = mapInvite(invite, roles.find((role) => role.id === invite.role_id));
  await safelyLogAudit({
    action: "identity.invite.created",
    actorUserId: actor,
    metadata: {
      email: mappedInvite.email,
      role_id: mappedInvite.roleId,
      role_key: mappedInvite.roleKey,
    },
    resourceId: mappedInvite.id,
    resourceType: "identity_invite",
    scopeId: mappedInvite.scopeId,
    scopeType: mappedInvite.scopeType,
  });
  await createApprovalRecord({
    approvalStatus: "pending",
    approvalType: "invite",
    inviteId: mappedInvite.id,
    notes: data.notes,
    requestedBy: actor,
    scopeId: mappedInvite.scopeId,
    scopeType: mappedInvite.scopeType,
  });

  return mappedInvite;
}

export async function decideIdentityInvite(data: {
  inviteId: string;
  status: "approved" | "denied";
  decidedBy: string;
  notes?: string | null;
}): Promise<IdentityInvite> {
  const supabase = getSupabaseAdminClient();
  const actor = assertActorUserId(data.decidedBy);
  const { data: existingInvite, error: readError } = await supabase
    .from("identity_invites")
    .select(inviteSelect)
    .eq("id", data.inviteId)
    .single();

  if (readError) {
    throw new Error(readError.message);
  }

  await requirePermission(actor, "identity.role.manage", existingInvite.scope_type, existingInvite.scope_id);

  const { data: invite, error } = await supabase
    .from("identity_invites")
    .update({
      approval_notes: normalizeOptionalText(data.notes),
      approved_at: data.status === "approved" ? new Date().toISOString() : null,
      approved_by: data.status === "approved" ? actor : null,
      invite_status: data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.inviteId)
    .select(inviteSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const roles = await getIdentityRoles();
  const mappedInvite = mapInvite(invite, roles.find((role) => role.id === invite.role_id));
  await updateApprovalRecordForInvite({
    decidedBy: actor,
    inviteId: mappedInvite.id,
    notes: data.notes,
    status: data.status,
  });
  await safelyLogAudit({
    action: `identity.invite.${data.status}`,
    actorUserId: actor,
    metadata: {
      email: mappedInvite.email,
      role_id: mappedInvite.roleId,
      role_key: mappedInvite.roleKey,
    },
    resourceId: mappedInvite.id,
    resourceType: "identity_invite",
    scopeId: mappedInvite.scopeId,
    scopeType: mappedInvite.scopeType,
  });

  return mappedInvite;
}

export async function revokeIdentityInvite(data: {
  inviteId: string;
  revokedBy: string;
  notes?: string | null;
}): Promise<IdentityInvite> {
  const supabase = getSupabaseAdminClient();
  const actor = assertActorUserId(data.revokedBy);
  const { data: existingInvite, error: readError } = await supabase
    .from("identity_invites")
    .select(inviteSelect)
    .eq("id", data.inviteId)
    .single();

  if (readError) {
    throw new Error(readError.message);
  }

  await requirePermission(actor, "identity.role.manage", existingInvite.scope_type, existingInvite.scope_id);

  const { data: invite, error } = await supabase
    .from("identity_invites")
    .update({
      approval_notes: normalizeOptionalText(data.notes),
      invite_status: "revoked",
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.inviteId)
    .select(inviteSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const roles = await getIdentityRoles();
  const mappedInvite = mapInvite(invite, roles.find((role) => role.id === invite.role_id));
  await updateApprovalRecordForInvite({
    decidedBy: actor,
    inviteId: mappedInvite.id,
    notes: data.notes,
    status: "revoked",
  });
  await safelyLogAudit({
    action: "identity.invite.revoked",
    actorUserId: actor,
    metadata: {
      email: mappedInvite.email,
      role_id: mappedInvite.roleId,
      role_key: mappedInvite.roleKey,
    },
    resourceId: mappedInvite.id,
    resourceType: "identity_invite",
    scopeId: mappedInvite.scopeId,
    scopeType: mappedInvite.scopeType,
  });

  return mappedInvite;
}

export async function createIdentityAccessRequest(data: {
  scopeType: IdentityScopeType | string;
  scopeId: string;
  requestedRoleId?: string | null;
  userId?: string | null;
  email?: string | null;
  requestedBy?: string | null;
  reason?: string | null;
}): Promise<IdentityAccessRequest> {
  const supabase = getSupabaseAdminClient();
  const { data: accessRequest, error } = await supabase
    .from("identity_access_requests")
    .insert({
      email: normalizeOptionalText(data.email),
      reason: normalizeOptionalText(data.reason),
      requested_role_id: normalizeOptionalText(data.requestedRoleId),
      requested_by: normalizeOptionalText(data.requestedBy),
      scope_id: data.scopeId.trim(),
      scope_type: data.scopeType,
      user_id: normalizeOptionalText(data.userId),
    })
    .select(accessRequestSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const roles = await getIdentityRoles();
  const mappedRequest = mapAccessRequest(accessRequest, accessRequest.requested_role_id ? roles.find((role) => role.id === accessRequest.requested_role_id) : undefined);
  await createApprovalRecord({
    accessRequestId: mappedRequest.id,
    approvalStatus: "pending",
    approvalType: "access_request",
    notes: mappedRequest.reason,
    requestedBy: mappedRequest.requestedBy ?? mappedRequest.userId,
    scopeId: mappedRequest.scopeId,
    scopeType: mappedRequest.scopeType,
  });

  return mappedRequest;
}

export async function decideIdentityAccessRequest(data: {
  accessRequestId: string;
  status: "approved" | "denied";
  decidedBy: string;
  notes?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}): Promise<IdentityAccessRequest> {
  const supabase = getSupabaseAdminClient();
  const actor = assertActorUserId(data.decidedBy);
  const { data: existingRequest, error: readError } = await supabase
    .from("identity_access_requests")
    .select(accessRequestSelect)
    .eq("id", data.accessRequestId)
    .single();

  if (readError) {
    throw new Error(readError.message);
  }

  await requirePermission(actor, "identity.role.manage", existingRequest.scope_type, existingRequest.scope_id);

  const { data: accessRequest, error } = await supabase
    .from("identity_access_requests")
    .update({
      request_status: data.status,
      approved_at: data.status === "approved" ? new Date().toISOString() : null,
      approved_by: data.status === "approved" ? actor : null,
      approval_notes: normalizeOptionalText(data.notes),
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.accessRequestId)
    .select(accessRequestSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const roles = await getIdentityRoles();
  const mappedRequest = mapAccessRequest(accessRequest, accessRequest.requested_role_id ? roles.find((role) => role.id === accessRequest.requested_role_id) : undefined);
  let assignment: IdentityRoleAssignment | null = null;
  if (data.status === "approved" && mappedRequest.userId && mappedRequest.requestedRoleId) {
    assignment = await createUserRoleAssignment({
      approvalNotes: data.notes,
      endsAt: normalizeOptionalText(data.endsAt),
      grantedBy: actor,
      roleId: mappedRequest.requestedRoleId,
      scopeId: mappedRequest.scopeId,
      scopeType: mappedRequest.scopeType,
      startsAt: normalizeOptionalText(data.startsAt),
      userId: mappedRequest.userId,
    });
  }

  await updateApprovalRecordForAccessRequest({
    accessRequestId: mappedRequest.id,
    assignmentId: assignment?.id ?? null,
    decidedBy: actor,
    notes: data.notes,
    status: data.status,
  });
  await safelyLogAudit({
    action: `identity.access_request.${data.status}`,
    actorUserId: actor,
    metadata: {
      requested_role_id: mappedRequest.requestedRoleId,
      requested_role_key: mappedRequest.requestedRoleKey,
    },
    resourceId: mappedRequest.id,
    resourceType: "identity_access_request",
    scopeId: mappedRequest.scopeId,
    scopeType: mappedRequest.scopeType,
  });

  return mappedRequest;
}

export async function revokeIdentityAccessRequest(data: {
  accessRequestId: string;
  revokedBy: string;
  notes?: string | null;
}): Promise<IdentityAccessRequest> {
  const supabase = getSupabaseAdminClient();
  const actor = assertActorUserId(data.revokedBy);
  const { data: existingRequest, error: readError } = await supabase
    .from("identity_access_requests")
    .select(accessRequestSelect)
    .eq("id", data.accessRequestId)
    .single();

  if (readError) {
    throw new Error(readError.message);
  }

  await requirePermission(actor, "identity.role.manage", existingRequest.scope_type, existingRequest.scope_id);

  const { data: accessRequest, error } = await supabase
    .from("identity_access_requests")
    .update({
      approval_notes: normalizeOptionalText(data.notes),
      request_status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: actor,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.accessRequestId)
    .select(accessRequestSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const roles = await getIdentityRoles();
  const mappedRequest = mapAccessRequest(accessRequest, accessRequest.requested_role_id ? roles.find((role) => role.id === accessRequest.requested_role_id) : undefined);
  await updateApprovalRecordForAccessRequest({
    accessRequestId: mappedRequest.id,
    decidedBy: actor,
    notes: data.notes,
    status: "revoked",
  });
  await safelyLogAudit({
    action: "identity.access_request.revoked",
    actorUserId: actor,
    metadata: {
      requested_role_id: mappedRequest.requestedRoleId,
      requested_role_key: mappedRequest.requestedRoleKey,
    },
    resourceId: mappedRequest.id,
    resourceType: "identity_access_request",
    scopeId: mappedRequest.scopeId,
    scopeType: mappedRequest.scopeType,
  });

  return mappedRequest;
}

export async function revokeUserRoleAssignment(data: {
  assignmentId: string;
  revokedBy: string;
  notes?: string | null;
}): Promise<IdentityRoleAssignment> {
  const supabase = getSupabaseAdminClient();
  const actor = assertActorUserId(data.revokedBy);
  const { data: existingAssignment, error: readError } = await supabase
    .from("user_role_assignments")
    .select(assignmentSelect)
    .eq("id", data.assignmentId)
    .single();

  if (readError) {
    throw new Error(readError.message);
  }

  await requirePermission(actor, "identity.role.manage", existingAssignment.scope_type, existingAssignment.scope_id);

  const { data: assignment, error } = await supabase
    .from("user_role_assignments")
    .update({
      assignment_status: "revoked",
      approval_notes: normalizeOptionalText(data.notes),
      ends_at: new Date().toISOString(),
      revoked_at: new Date().toISOString(),
      revoked_by: actor,
    })
    .eq("id", data.assignmentId)
    .select(assignmentSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const roles = await getIdentityRoles();
  const mappedAssignment = mapAssignment(assignment, roles.find((role) => role.id === assignment.role_id));
  await createApprovalRecord({
    approvalStatus: "revoked",
    approvalType: "role_assignment",
    assignmentId: mappedAssignment.id,
    notes: data.notes,
    requestedBy: mappedAssignment.userId,
    revokedBy: actor,
    scopeId: mappedAssignment.scopeId,
    scopeType: mappedAssignment.scopeType,
  });
  await safelyLogAudit({
    action: "identity.role_assignment.revoked",
    actorUserId: actor,
    metadata: {
      assigned_user_id: mappedAssignment.userId,
      role_id: mappedAssignment.roleId,
      role_key: mappedAssignment.roleKey,
    },
    resourceId: mappedAssignment.id,
    resourceType: "user_role_assignment",
    scopeId: mappedAssignment.scopeId,
    scopeType: mappedAssignment.scopeType,
  });

  return mappedAssignment;
}

async function createApprovalRecord(data: {
  approvalStatus: "pending" | "approved" | "denied" | "expired" | "revoked";
  approvalType: "invite" | "access_request" | "role_assignment";
  scopeType: IdentityScopeType | string;
  scopeId: string;
  inviteId?: string | null;
  accessRequestId?: string | null;
  assignmentId?: string | null;
  requestedBy?: string | null;
  approvedBy?: string | null;
  revokedBy?: string | null;
  reason?: string | null;
  notes?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}): Promise<IdentityApproval> {
  const supabase = getSupabaseAdminClient();
  const decidedAt = data.approvalStatus === "pending" ? null : new Date().toISOString();
  const { data: approval, error } = await supabase
    .from("identity_approvals")
    .insert({
      access_request_id: normalizeOptionalText(data.accessRequestId),
      approval_notes: normalizeOptionalText(data.notes),
      approval_status: data.approvalStatus,
      approval_type: data.approvalType,
      approved_by: normalizeOptionalText(data.approvedBy),
      assignment_id: normalizeOptionalText(data.assignmentId),
      decided_at: decidedAt,
      ends_at: normalizeOptionalText(data.endsAt),
      invite_id: normalizeOptionalText(data.inviteId),
      reason: normalizeOptionalText(data.reason),
      requested_by: normalizeOptionalText(data.requestedBy),
      revoked_by: normalizeOptionalText(data.revokedBy),
      scope_id: data.scopeId,
      scope_type: data.scopeType,
      starts_at: normalizeOptionalText(data.startsAt),
    })
    .select(approvalSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapApproval(approval);
}

async function updateApprovalRecordForAccessRequest(data: {
  accessRequestId: string;
  status: "approved" | "denied" | "revoked";
  decidedBy: string;
  assignmentId?: string | null;
  notes?: string | null;
}) {
  const supabase = getSupabaseAdminClient();
  const updates = {
    approval_notes: normalizeOptionalText(data.notes),
    approval_status: data.status,
    approved_by: data.status === "approved" ? data.decidedBy : null,
    assignment_id: normalizeOptionalText(data.assignmentId),
    decided_at: new Date().toISOString(),
    revoked_by: data.status === "revoked" ? data.decidedBy : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("identity_approvals")
    .update(updates)
    .eq("access_request_id", data.accessRequestId);

  if (error) {
    throw new Error(error.message);
  }
}

async function updateApprovalRecordForInvite(data: {
  inviteId: string;
  status: "approved" | "denied" | "revoked";
  decidedBy: string;
  notes?: string | null;
}) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("identity_approvals")
    .update({
      approval_notes: normalizeOptionalText(data.notes),
      approval_status: data.status,
      approved_by: data.status === "approved" ? data.decidedBy : null,
      decided_at: new Date().toISOString(),
      revoked_by: data.status === "revoked" ? data.decidedBy : null,
      updated_at: new Date().toISOString(),
    })
    .eq("invite_id", data.inviteId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function canUser(userId: string, permissionKey: string, scopeType: IdentityScopeType | string, scopeId: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  const normalizedUserId = userId.trim();
  const normalizedScopeId = scopeId.trim();

  if (!normalizedUserId || !permissionKey.trim() || !scopeType || !normalizedScopeId) {
    return false;
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("user_role_assignments")
    .select(assignmentSelect)
    .eq("user_id", normalizedUserId)
    .eq("scope_type", scopeType)
    .eq("scope_id", normalizedScopeId);

  if (assignmentError) {
    console.error("Failed to check identity role assignments", assignmentError);
    return false;
  }

  const activeRoleIds = [...new Set((assignments ?? []).filter((assignment) => isAssignmentActive(assignment)).map((assignment) => assignment.role_id))];
  if (activeRoleIds.length === 0) {
    return false;
  }

  const { data: permission, error: permissionError } = await supabase
    .from("permissions")
    .select("id")
    .eq("key", permissionKey)
    .maybeSingle();

  if (permissionError || !permission) {
    if (permissionError) console.error("Failed to load identity permission", permissionError);
    return false;
  }

  const { data: rolePermissions, error: rolePermissionError } = await supabase
    .from("role_permissions")
    .select("role_id,permission_id")
    .eq("permission_id", permission.id)
    .in("role_id", activeRoleIds);

  if (rolePermissionError) {
    console.error("Failed to check role permissions", rolePermissionError);
    return false;
  }

  return (rolePermissions ?? []).some((rolePermission: RolePermissionRow) => rolePermission.permission_id === permission.id);
}

export async function requirePermission(
  userId: string,
  permissionKey: string,
  scopeType: IdentityScopeType | string,
  scopeId: string,
): Promise<void> {
  const allowed = await canUser(userId, permissionKey, scopeType, scopeId);

  if (!allowed) {
    throw new PermissionDeniedError(`Missing permission ${permissionKey} for ${scopeType}:${scopeId}`);
  }
}

export async function logAudit(data: {
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  scopeType: IdentityScopeType | string;
  scopeId?: string | null;
  metadata?: Json;
}): Promise<IdentityAuditLog> {
  const supabase = getSupabaseAdminClient();
  const { data: auditLog, error } = await supabase
    .from("audit_logs")
    .insert({
      action: data.action,
      actor_user_id: normalizeOptionalText(data.actorUserId),
      metadata: data.metadata ?? {},
      resource_id: normalizeOptionalText(data.resourceId),
      resource_type: data.resourceType,
      scope_id: normalizeOptionalText(data.scopeId),
      scope_type: data.scopeType,
    })
    .select(auditSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapAuditLog(auditLog);
}

export async function safelyLogAudit(data: Parameters<typeof logAudit>[0]): Promise<void> {
  try {
    await logAudit(data);
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}

export function assertActorUserId(actorUserId: string | null | undefined): string {
  const normalizedActorUserId = normalizeOptionalText(actorUserId);

  if (!normalizedActorUserId) {
    throw new PermissionDeniedError("Authenticated actor is required for this permission-checked action.");
  }

  return normalizedActorUserId;
}

// Single seam for resolving the trusted server-side actor for permission-checked
// mutations. The server Supabase client is anon-key only (see supabase/server.ts),
// so there is no auth session to read yet; a real Supabase Auth user id should be
// resolved here once auth lands. Until then the operator id is read from
// GAMEDAY_OPERATOR_USER_ID and falls back to the seeded platform-admin.
export async function getServerActorUserId(): Promise<string | null> {
  return resolveActorUserId(process.env.GAMEDAY_OPERATOR_USER_ID);
}
