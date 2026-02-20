type OrgRole = "owner" | "admin" | "member";

type Permission =
  | "org:manage"
  | "org:invite"
  | "org:delete"
  | "project:create"
  | "project:manage"
  | "project:view"
  | "task:create"
  | "task:assign_others"
  | "task:delete"
  | "task:edit_any"
  | "message:post"
  | "report:generate"
  | "report:org_wide"
  | "integration:manage";

interface PermissionContext {
  isProjectLead?: boolean;
  isProjectMember?: boolean;
  isCreator?: boolean;
}

const ROLE_PERMISSIONS: Record<OrgRole, Set<Permission>> = {
  owner: new Set([
    "org:manage",
    "org:invite",
    "org:delete",
    "project:create",
    "project:manage",
    "task:assign_others",
    "task:delete",
    "task:edit_any",
    "report:generate",
    "report:org_wide",
    "integration:manage",
  ]),
  admin: new Set([
    "org:manage",
    "org:invite",
    "project:create",
    "project:manage",
    "task:assign_others",
    "task:delete",
    "task:edit_any",
    "report:generate",
    "report:org_wide",
    "integration:manage",
  ]),
  member: new Set([
    "project:create",
    "report:generate",
    "integration:manage",
  ]),
};

export function hasPermission(
  role: OrgRole,
  permission: Permission,
  context?: PermissionContext
): boolean {
  // Direct role-based check
  if (ROLE_PERMISSIONS[role].has(permission)) {
    return true;
  }

  // Context-dependent permissions for members
  if (role === "member" && context) {
    switch (permission) {
      case "project:manage":
        return !!context.isProjectLead;
      case "project:view":
      case "task:create":
      case "message:post":
        return !!context.isProjectMember;
      case "task:assign_others":
      case "task:edit_any":
        return !!context.isProjectLead;
      case "task:delete":
        return !!context.isProjectLead || !!context.isCreator;
    }
  }

  // Owners/admins always have project access regardless of membership
  if (
    (role === "owner" || role === "admin") &&
    (permission === "project:view" ||
      permission === "task:create" ||
      permission === "message:post")
  ) {
    return true;
  }

  return false;
}
