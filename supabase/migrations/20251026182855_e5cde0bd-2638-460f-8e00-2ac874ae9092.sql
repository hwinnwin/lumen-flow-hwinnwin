-- Add type and tags to principles table
ALTER TABLE public.principles 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'core',
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add check constraint for type
ALTER TABLE public.principles 
ADD CONSTRAINT principles_type_check 
CHECK (type IN ('core', 'aspirational'));

-- Add principle links to projects and sops tables if they don't exist
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS primary_principle_id uuid REFERENCES public.principles(id) ON DELETE SET NULL;

ALTER TABLE public.sops 
ADD COLUMN IF NOT EXISTS linked_principle_id uuid REFERENCES public.principles(id) ON DELETE SET NULL;