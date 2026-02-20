import { db } from "@/lib/db";
import {
  organizations,
  organizationMembers,
  invitations,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// ─── Organization Queries ───────────────────────────────

export async function getUserOrganizations(userId: string) {
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      logoUrl: organizations.logoUrl,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
      role: organizationMembers.role,
      joinedAt: organizationMembers.joinedAt,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.orgId, organizations.id)
    )
    .where(eq(organizationMembers.userId, userId));
}

export async function getOrganization(orgId: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });
}

export async function createOrganization(data: {
  name: string;
  slug: string;
  userId: string;
}) {
  return db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({
        name: data.name,
        slug: data.slug,
      })
      .returning();

    await tx.insert(organizationMembers).values({
      orgId: org.id,
      userId: data.userId,
      role: "owner",
    });

    return org;
  });
}

export async function getOrgMember(orgId: string, userId: string) {
  return db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.orgId, orgId),
      eq(organizationMembers.userId, userId)
    ),
  });
}

export async function getOrgMembers(orgId: string) {
  return db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.orgId, orgId));
}

export async function updateOrganization(
  orgId: string,
  data: Partial<{ name: string; slug: string; logoUrl: string | null }>
) {
  const [updated] = await db
    .update(organizations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))
    .returning();
  return updated;
}

export async function deleteOrganization(orgId: string) {
  const [deleted] = await db
    .delete(organizations)
    .where(eq(organizations.id, orgId))
    .returning();
  return deleted;
}

// ─── Invitation Queries ─────────────────────────────────

export async function createInvitation(data: {
  orgId: string;
  email: string;
  role: "owner" | "admin" | "member";
  invitedBy: string;
  token: string;
  expiresAt: Date;
}) {
  const [invitation] = await db
    .insert(invitations)
    .values(data)
    .returning();
  return invitation;
}

export async function acceptInvitation(token: string, userId: string) {
  return db.transaction(async (tx) => {
    const [invitation] = await tx
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.token, token))
      .returning();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    await tx.insert(organizationMembers).values({
      orgId: invitation.orgId,
      userId,
      role: invitation.role,
    });

    return invitation;
  });
}
