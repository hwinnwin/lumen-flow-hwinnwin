-- Create email_sources table to store connected email accounts
CREATE TABLE public.email_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  email_address TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, email_address)
);

-- Create emails table to store synced emails
CREATE TABLE public.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.email_sources(id) ON DELETE CASCADE,
  subject TEXT,
  sender TEXT NOT NULL,
  recipients TEXT[],
  snippet TEXT,
  body TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  external_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(source_id, external_id)
);

-- Add email_id to ai_chats to link parsed content back to emails
ALTER TABLE public.ai_chats
ADD COLUMN email_id UUID REFERENCES public.emails(id) ON DELETE SET NULL;

-- Enable RLS on email_sources
ALTER TABLE public.email_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email sources"
ON public.email_sources FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email sources"
ON public.email_sources FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email sources"
ON public.email_sources FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email sources"
ON public.email_sources FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on emails
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own emails"
ON public.emails FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own emails"
ON public.emails FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emails"
ON public.emails FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger for email_sources
CREATE TRIGGER update_email_sources_updated_at
BEFORE UPDATE ON public.email_sources
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX idx_emails_user_id ON public.emails(user_id);
CREATE INDEX idx_emails_source_id ON public.emails(source_id);
CREATE INDEX idx_emails_received_at ON public.emails(received_at DESC);
CREATE INDEX idx_email_sources_user_id ON public.email_sources(user_id);
CREATE INDEX idx_ai_chats_email_id ON public.ai_chats(email_id);