-- Add principle-based intelligence columns to documents table
ALTER TABLE public.documents
ADD COLUMN primary_principle_id uuid REFERENCES public.principles(id),
ADD COLUMN principle_alignment_score integer CHECK (principle_alignment_score >= 0 AND principle_alignment_score <= 100),
ADD COLUMN ai_confidence integer CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
ADD COLUMN ai_reasoning text,
ADD COLUMN user_override boolean DEFAULT false;

-- Create AI learning log table to track corrections
CREATE TABLE public.ai_learning_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  ai_suggestion jsonb NOT NULL,
  user_choice jsonb NOT NULL,
  correction_type text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on ai_learning_log
ALTER TABLE public.ai_learning_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_learning_log
CREATE POLICY "Users can view their own learning logs"
ON public.ai_learning_log FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own learning logs"
ON public.ai_learning_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add index for faster principle lookups
CREATE INDEX idx_documents_primary_principle ON public.documents(primary_principle_id);
CREATE INDEX idx_learning_log_document ON public.ai_learning_log(document_id);
CREATE INDEX idx_learning_log_user ON public.ai_learning_log(user_id);