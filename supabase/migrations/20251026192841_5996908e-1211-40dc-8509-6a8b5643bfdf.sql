-- Add missing columns to sops table for enhanced functionality
ALTER TABLE public.sops 
ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS owner TEXT,
ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'ad-hoc',
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;