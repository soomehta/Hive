import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { orgRoleEnum, pathwayEnum } from "./enums";

// ─── Organizations ───────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  logoUrl: text("logo_url"),
  pathway: pathwayEnum("pathway").default("boards").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── Organization Members ────────────────────────────────

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    role: orgRoleEnum("role").default("member").notNull(),
    jobTitle: varchar("job_title", { length: 255 }),
    department: varchar("department", { length: 255 }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("org_members_org_user_idx").on(table.orgId, table.userId),
    index("org_members_user_idx").on(table.userId),
  ]
);

// ─── Invitations ─────────────────────────────────────────

export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: orgRoleEnum("role").default("member").notNull(),
  invitedBy: varchar("invited_by", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
