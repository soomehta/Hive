import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core/columns/vector_extension/vector";
import { organizations } from "./organizations";

// ─── Phase 4: Embeddings (pgvector) ─────────────────────

export const embeddings = pgTable(
  "embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    sourceType: varchar("source_type", { length: 50 }).notNull(),
    sourceId: uuid("source_id").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("embeddings_org_idx").on(table.orgId),
    index("embeddings_source_idx").on(table.sourceType, table.sourceId),
  ]
);
