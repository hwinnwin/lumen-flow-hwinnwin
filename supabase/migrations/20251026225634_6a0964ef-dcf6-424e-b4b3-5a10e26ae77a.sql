-- Add performance indexes for notifications
CREATE INDEX IF NOT EXISTS notifications_user_created_idx 
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_dedupe_idx 
  ON public.notifications (user_id, type, entity_id, created_at DESC);

-- Helper function for de-duplication checks
CREATE OR REPLACE FUNCTION public.has_similar_notification(
  p_user_id uuid, 
  p_type text, 
  p_entity uuid, 
  p_window_hours int DEFAULT 6
) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = p_user_id
      AND n.type = p_type
      AND (p_entity IS NULL OR n.entity_id = p_entity)
      AND n.created_at >= now() - (p_window_hours || ' hours')::interval
  );
$$;