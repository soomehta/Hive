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
  | "integration:manage"
  | "page:create"
  | "page:read"
  | "page:edit"
  | "page:delete"
  | "page:restore_revision"
  | "item:link"
  | "item:unlink"
  | "pinboard:layout_manage_self"
  | "notice:create"
  | "notice:pin"
  | "notice:archive"
  | "notice:moderate"
  | "chat:channel_create"
  | "chat:channel_manage"
  | "chat:channel_join"
  | "chat:message_post"
  | "chat:message_edit_own"
  | "chat:message_delete_own"
  | "chat:message_moderate"
  | "chat:member_add"
  | "chat:member_remove"
  // Phase 7: Workspace permissions
  | "workspace:create"
  | "workspace:manage"
  | "workspace:view"
  | "workspace:invite"
  | "workspace:delete";

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
    "page:create",
    "page:read",
    "page:edit",
    "page:delete",
    "page:restore_revision",
    "item:link",
    "item:unlink",
    "pinboard:layout_manage_self",
    "notice:create",
    "notice:pin",
    "notice:archive",
    "notice:moderate",
    "chat:channel_create",
    "chat:channel_manage",
    "chat:channel_join",
    "chat:message_post",
    "chat:message_edit_own",
    "chat:message_delete_own",
    "chat:message_moderate",
    "chat:member_add",
    "chat:member_remove",
    "workspace:create",
    "workspace:manage",
    "workspace:view",
    "workspace:invite",
    "workspace:delete",
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
    "page:create",
    "page:read",
    "page:edit",
    "page:delete",
    "page:restore_revision",
    "item:link",
    "item:unlink",
    "pinboard:layout_manage_self",
    "notice:create",
    "notice:pin",
    "notice:archive",
    "notice:moderate",
    "chat:channel_create",
    "chat:channel_manage",
    "chat:channel_join",
    "chat:message_post",
    "chat:message_edit_own",
    "chat:message_delete_own",
    "chat:message_moderate",
    "chat:member_add",
    "chat:member_remove",
    "workspace:create",
    "workspace:manage",
    "workspace:view",
    "workspace:invite",
  ]),
  member: new Set([
    "project:create",
    "report:generate",
    "integration:manage",
    "page:create",
    "page:read",
    "page:edit",
    "item:link",
    "item:unlink",
    "pinboard:layout_manage_self",
    "notice:create",
    "chat:channel_join",
    "chat:message_post",
    "chat:message_edit_own",
    "chat:message_delete_own",
    "workspace:view",
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

type ChannelRole = "owner" | "moderator" | "member";

/**
 * Check if a user has a channel-level moderation permission.
 * Channel moderators get elevated permissions for their channel even if
 * they are regular org members.
 */
export function hasChannelPermission(
  orgRole: OrgRole,
  channelRole: ChannelRole | null,
  permission: Permission,
): boolean {
  // Org-level check first
  if (hasPermission(orgRole, permission)) return true;

  // Channel moderator gets moderate/manage/member permissions
  if (channelRole === "moderator") {
    const moderatorPermissions: Permission[] = [
      "chat:message_moderate",
      "chat:channel_manage",
      "chat:member_add",
      "chat:member_remove",
    ];
    if (moderatorPermissions.includes(permission)) return true;
  }

  return false;
}

type WorkspaceRole = "owner" | "admin" | "member";

/**
 * Check workspace-level permission. Combines org role with workspace role.
 * Workspace admins/owners get elevated permissions within their workspace.
 */
export function hasWorkspacePermission(
  orgRole: OrgRole,
  workspaceRole: WorkspaceRole | null,
  permission: Permission,
): boolean {
  // Org-level check first
  if (hasPermission(orgRole, permission)) return true;

  // Workspace owner gets full workspace permissions
  if (workspaceRole === "owner") {
    const ownerPermissions: Permission[] = [
      "workspace:manage",
      "workspace:invite",
      "workspace:view",
    ];
    if (ownerPermissions.includes(permission)) return true;
  }

  // Workspace admin gets manage + invite
  if (workspaceRole === "admin") {
    const adminPermissions: Permission[] = [
      "workspace:manage",
      "workspace:invite",
      "workspace:view",
    ];
    if (adminPermissions.includes(permission)) return true;
  }

  // Workspace member gets view
  if (workspaceRole === "member") {
    if (permission === "workspace:view") return true;
  }

  return false;
}
