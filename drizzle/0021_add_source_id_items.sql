ALTER TABLE "items" ADD COLUMN "source_id" VARCHAR(255);
CREATE UNIQUE INDEX "items_org_source_idx" ON "items" ("org_id", "source_id");
UPDATE "items" SET "source_id" = "id" WHERE "source_id" IS NULL;
