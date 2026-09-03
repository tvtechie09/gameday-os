import type { SupabaseClient } from "@supabase/supabase-js";
import { actorFromHostedSnapshot, type CanonicalActorAssignment } from "./actor.ts";
import type { AccessContext } from "./capabilities.ts";
import type { Database } from "@/lib/supabase/types";

type AuthUser = { id: string; email: string };

export async function resolveHostedActor(
  authUser: AuthUser,
  supabase: SupabaseClient<Database>,
): Promise<AccessContext | null> {
  try {
    const byAuthId = await supabase
      .from("users")
      .select("id,email,display_name,auth_user_id,user_status")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();
    if (byAuthId.error) return null;

    let user = byAuthId.data;
    if (!user && authUser.email) {
      const byEmail = await supabase
        .from("users")
        .select("id,email,display_name,auth_user_id,user_status")
        .ilike("email", authUser.email)
        .maybeSingle();
      if (byEmail.error) return null;
      user = byEmail.data;
      if (user && !user.auth_user_id) {
        const linked = await supabase.from("users").update({ auth_user_id: authUser.id }).eq("id", user.id);
        if (linked.error) return null;
      } else if (user?.auth_user_id !== authUser.id) {
        return null;
      }
    }
    if (!user || user.user_status !== "active") return null;

    const assignmentResult = await supabase
      .from("user_role_assignments")
      .select("role_id,scope_type,scope_id,assignment_status,starts_at,ends_at,roles:role_id(key)")
      .eq("user_id", user.id);
    if (assignmentResult.error || !assignmentResult.data) return null;

    const now = Date.now();
    const activeRows = assignmentResult.data.filter((row) => {
      const starts = !row.starts_at || new Date(row.starts_at).getTime() <= now;
      const ends = !row.ends_at || new Date(row.ends_at).getTime() > now;
      return row.assignment_status === "approved" && starts && ends;
    });
    if (activeRows.length === 0) return null;

    const roleIds = [...new Set(activeRows.map((row) => row.role_id))];
    const permissionResult = await supabase
      .from("role_permissions")
      .select("role_id,permissions:permission_id(key)")
      .in("role_id", roleIds);
    if (permissionResult.error || !permissionResult.data) return null;

    const permissionsByRole = new Map<string, string[]>();
    for (const row of permissionResult.data as Array<{ role_id: string; permissions?: { key?: string } | { key?: string }[] | null }>) {
      const permission = Array.isArray(row.permissions) ? row.permissions[0] : row.permissions;
      if (permission?.key) permissionsByRole.set(row.role_id, [...(permissionsByRole.get(row.role_id) ?? []), permission.key]);
    }

    const assignments: CanonicalActorAssignment[] = activeRows.map((row) => {
      const related = row.roles as { key?: string } | { key?: string }[] | null;
      const role = Array.isArray(related) ? related[0] : related;
      return {
        roleId: row.role_id,
        roleKey: role?.key ?? "",
        scopeType: row.scope_type,
        scopeId: row.scope_id,
        permissionKeys: permissionsByRole.get(row.role_id) ?? [],
        assignmentStatus: row.assignment_status,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
      };
    });

    const venueIds = [...new Set(assignments.filter((row) => row.scopeType === "venue").map((row) => row.scopeId))];
    const existingVenueIds = new Set<string>();
    if (venueIds.length > 0) {
      const venueResult = await supabase.from("venues").select("id").in("id", venueIds);
      if (venueResult.error || !venueResult.data) return null;
      for (const venue of venueResult.data) existingVenueIds.add(venue.id);
    }

    return actorFromHostedSnapshot({
      authUserId: authUser.id,
      userId: user.id,
      email: user.email ?? authUser.email,
      displayName: user.display_name ?? user.email ?? authUser.email,
      userStatus: user.user_status,
      assignments,
      existingVenueIds,
    });
  } catch {
    return null;
  }
}
