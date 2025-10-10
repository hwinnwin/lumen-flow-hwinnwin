-- Create SOPs (Standard Operating Procedures) table
CREATE TABLE public.sops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Principles table
CREATE TABLE public.principles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Tasks table with project hierarchy
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'blocked', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  estimated_hours NUMERIC(10,2),
  actual_hours NUMERIC(10,2),
  dependencies TEXT[] DEFAULT '{}'::TEXT[],
  sop_id UUID REFERENCES public.sops(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.principles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for SOPs
CREATE POLICY "Users can view their own SOPs"
  ON public.sops FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own SOPs"
  ON public.sops FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SOPs"
  ON public.sops FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SOPs"
  ON public.sops FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for Principles
CREATE POLICY "Users can view their own principles"
  ON public.principles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own principles"
  ON public.principles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own principles"
  ON public.principles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own principles"
  ON public.principles FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for Tasks
CREATE POLICY "Users can view tasks in their projects"
  ON public.tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = tasks.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create tasks in their projects"
  ON public.tasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = tasks.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update tasks in their projects"
  ON public.tasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = tasks.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete tasks in their projects"
  ON public.tasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = tasks.project_id
    AND projects.user_id = auth.uid()
  ));

-- Triggers for updated_at
CREATE TRIGGER update_sops_updated_at
  BEFORE UPDATE ON public.sops
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_principles_updated_at
  BEFORE UPDATE ON public.principles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for performance
CREATE INDEX idx_sops_user_id ON public.sops(user_id);
CREATE INDEX idx_sops_category ON public.sops(category);
CREATE INDEX idx_sops_status ON public.sops(status);

CREATE INDEX idx_principles_user_id ON public.principles(user_id);
CREATE INDEX idx_principles_category ON public.principles(category);

CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_parent_task_id ON public.tasks(parent_task_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_sop_id ON public.tasks(sop_id);