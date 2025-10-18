-- Daily focus snapshots
CREATE TABLE public.daily_focus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  focus_theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  top_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  project_health JSONB NOT NULL DEFAULT '[]'::jsonb,
  insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_overrides JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_focus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily focus"
  ON public.daily_focus FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily focus"
  ON public.daily_focus FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily focus"
  ON public.daily_focus FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily focus"
  ON public.daily_focus FOR DELETE
  USING (auth.uid() = user_id);

-- Action tracking
CREATE TABLE public.focus_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_id TEXT NOT NULL,
  priority_level TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  time_to_complete INTERVAL,
  deferred BOOLEAN DEFAULT false,
  ignored BOOLEAN DEFAULT false
);

ALTER TABLE public.focus_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own focus actions"
  ON public.focus_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own focus actions"
  ON public.focus_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus actions"
  ON public.focus_actions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own focus actions"
  ON public.focus_actions FOR DELETE
  USING (auth.uid() = user_id);

-- Priority learning metrics
CREATE TABLE public.priority_learning (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL,
  ai_suggested BOOLEAN NOT NULL DEFAULT false,
  user_followed BOOLEAN NOT NULL DEFAULT false,
  outcome TEXT,
  learned_pattern TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.priority_learning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own priority learning"
  ON public.priority_learning FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own priority learning"
  ON public.priority_learning FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster date lookups
CREATE INDEX idx_daily_focus_user_date ON public.daily_focus(user_id, date DESC);
CREATE INDEX idx_focus_actions_user_date ON public.focus_actions(user_id, created_at DESC);
CREATE INDEX idx_priority_learning_user_date ON public.priority_learning(user_id, created_at DESC);