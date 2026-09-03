import "server-only";

import { hasPermission } from "./capabilities";
import { resolveSession } from "./session";
import { requirePermission } from "@/lib/services/identity";

export class ServerActionAuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ServerActionAuthorizationError";
  }
}

export async function requireServerActionPermission(
  permissionKey: string,
  scopeType?: string,
  scopeId?: string,
): Promise<string> {
  const resolved = await resolveSession();
  if (resolved.kind !== "active") {
    throw new ServerActionAuthorizationError("Sign in with an active Venue OS account to continue.");
  }
  if (!hasPermission(resolved.context, permissionKey)) {
    throw new ServerActionAuthorizationError();
  }
  await requirePermission(
    resolved.context.userId,
    permissionKey,
    scopeType ?? resolved.context.scopeType,
    scopeId ?? resolved.context.scopeId,
  );
  return resolved.context.userId;
}
