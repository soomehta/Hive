import { db } from "@/lib/db";
import { pinboardLayoutsUser } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

export type PinboardTheme = "paper_classic" | "blueprint" | "studio" | "minimal";

export async function getUserPinboardLayouts(orgId: string, userId: string) {
  return db
    .select()
    .from(pinboardLayoutsUser)
    .where(and(eq(pinboardLayoutsUser.orgId, orgId), eq(pinboardLayoutsUser.userId, userId)))
    .orderBy(desc(pinboardLayoutsUser.updatedAt));
}

export async function getDefaultPinboardLayout(orgId: string, userId: string) {
  return db.query.pinboardLayoutsUser.findFirst({
    where: and(
      eq(pinboardLayoutsUser.orgId, orgId),
      eq(pinboardLayoutsUser.userId, userId),
      eq(pinboardLayoutsUser.isDefault, true)
    ),
  });
}

export async function createPinboardLayout(data: {
  orgId: string;
  userId: string;
  name: string;
  layoutJson: Record<string, unknown>;
  theme?: PinboardTheme;
  isDefault?: boolean;
}) {
  return db.transaction(async (tx) => {
    if (data.isDefault) {
      await tx
        .update(pinboardLayoutsUser)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(pinboardLayoutsUser.orgId, data.orgId),
            eq(pinboardLayoutsUser.userId, data.userId)
          )
        );
    }

    const [created] = await tx
      .insert(pinboardLayoutsUser)
      .values({
        orgId: data.orgId,
        userId: data.userId,
        name: data.name,
        layoutJson: data.layoutJson,
        theme: data.theme ?? "paper_classic",
        isDefault: data.isDefault ?? false,
      })
      .returning();

    return created;
  });
}

export async function updatePinboardLayout(
  layoutId: string,
  orgId: string,
  userId: string,
  data: Partial<{
    name: string;
    layoutJson: Record<string, unknown>;
    theme: PinboardTheme;
    isDefault: boolean;
  }>
) {
  return db.transaction(async (tx) => {
    if (data.isDefault) {
      await tx
        .update(pinboardLayoutsUser)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(pinboardLayoutsUser.orgId, orgId),
            eq(pinboardLayoutsUser.userId, userId)
          )
        );
    }

    const [updated] = await tx
      .update(pinboardLayoutsUser)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(pinboardLayoutsUser.id, layoutId),
          eq(pinboardLayoutsUser.orgId, orgId),
          eq(pinboardLayoutsUser.userId, userId)
        )
      )
      .returning();

    return updated;
  });
}

export async function deletePinboardLayout(layoutId: string, orgId: string, userId: string) {
  const [deleted] = await db
    .delete(pinboardLayoutsUser)
    .where(
      and(
        eq(pinboardLayoutsUser.id, layoutId),
        eq(pinboardLayoutsUser.orgId, orgId),
        eq(pinboardLayoutsUser.userId, userId)
      )
    )
    .returning();

  return deleted;
}
