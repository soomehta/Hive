-- Backfill: create items rows for existing projects that don't have one yet
INSERT INTO items (id, org_id, project_id, type, title, owner_id, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  p.org_id,
  p.id,
  'project',
  p.name,
  p.created_by,
  p.status,
  p.created_at,
  COALESCE(p.updated_at, p.created_at)
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM items i
  WHERE i.type = 'project'
    AND i.project_id = p.id
    AND i.org_id = p.org_id
);

-- Backfill: create items rows for existing tasks that don't have one yet
INSERT INTO items (id, org_id, project_id, type, title, owner_id, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  t.org_id,
  t.project_id,
  'task',
  t.title,
  COALESCE(t.assignee_id, t.created_by),
  t.status,
  t.created_at,
  COALESCE(t.updated_at, t.created_at)
FROM tasks t
WHERE NOT EXISTS (
  SELECT 1 FROM items i
  WHERE i.type = 'task'
    AND i.title = t.title
    AND i.org_id = t.org_id
    AND i.project_id IS NOT DISTINCT FROM t.project_id
);
