-- Performance indexes for notification event scans

-- Tasks: due date and status lookups
CREATE INDEX IF NOT EXISTS tasks_due_status_idx 
  ON public.tasks (status, due_date) 
  WHERE status != 'completed';

CREATE INDEX IF NOT EXISTS tasks_project_status_updated_idx 
  ON public.tasks (project_id, status, updated_at DESC);

-- Projects: deadline and status lookups
CREATE INDEX IF NOT EXISTS projects_status_deadline_idx 
  ON public.projects (status, deadline) 
  WHERE status = 'active' AND deadline IS NOT NULL;

CREATE INDEX IF NOT EXISTS projects_user_updated_idx 
  ON public.projects (user_id, updated_at DESC) 
  WHERE status = 'active';

-- Documents: low alignment score scans
CREATE INDEX IF NOT EXISTS documents_alignment_score_idx 
  ON public.documents (user_id, principle_alignment_score, created_at DESC) 
  WHERE principle_alignment_score < 60 AND user_override = false;