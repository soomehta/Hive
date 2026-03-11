-- Prevent duplicate channel names within the same org+scope (team channels)
CREATE UNIQUE INDEX IF NOT EXISTS "chat_channels_org_scope_name_unique"
  ON "chat_channels" ("org_id", "scope", "name")
  WHERE "project_id" IS NULL;

-- Prevent duplicate channel names within the same project (project channels)
CREATE UNIQUE INDEX IF NOT EXISTS "chat_channels_project_name_unique"
  ON "chat_channels" ("org_id", "project_id", "name")
  WHERE "project_id" IS NOT NULL;
