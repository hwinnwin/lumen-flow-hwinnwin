-- Add missing fields to projects table to support advanced project management
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS category text;

-- Add check constraints for valid values
ALTER TABLE public.projects
ADD CONSTRAINT projects_status_check 
CHECK (status IN ('active', 'planning', 'on-hold', 'completed', 'archived'));

ALTER TABLE public.projects
ADD CONSTRAINT projects_priority_check 
CHECK (priority IN ('low', 'medium', 'high', 'critical'));