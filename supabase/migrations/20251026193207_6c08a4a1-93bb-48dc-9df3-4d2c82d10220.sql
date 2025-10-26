-- Add missing columns to tasks table for enhanced workflow
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS suggestion_id TEXT,
ADD COLUMN IF NOT EXISTS confidence INTEGER,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS primary_principle_id UUID REFERENCES public.principles(id) ON DELETE SET NULL;

-- Create task_activity table for learning feedback
CREATE TABLE IF NOT EXISTS public.task_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on task_activity
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_activity
CREATE POLICY "Users can view activity for their tasks" 
ON public.task_activity 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = task_activity.task_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create activity for their tasks" 
ON public.task_activity 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = task_activity.task_id 
    AND p.user_id = auth.uid()
  )
);