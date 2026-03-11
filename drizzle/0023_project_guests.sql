CREATE TABLE IF NOT EXISTS project_guests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  email varchar(255),
  role varchar(20) DEFAULT 'viewer' NOT NULL CHECK (role IN ('viewer', 'commenter')),
  created_by varchar(255) NOT NULL,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_project_guests_project ON project_guests(project_id);
CREATE INDEX idx_project_guests_token ON project_guests(token);
