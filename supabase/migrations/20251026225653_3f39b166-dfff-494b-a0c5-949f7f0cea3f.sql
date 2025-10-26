-- Fix search_path for has_similar_notification function
CREATE OR REPLACE FUNCTION public.has_similar_notification(
  p_user_id uuid, 
  p_type text, 
  p_entity uuid, 
  p_window_hours int DEFAULT 6
) RETURNS boolean
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = p_user_id
      AND n.type = p_type
      AND (p_entity IS NULL OR n.entity_id = p_entity)
      AND n.created_at >= now() - (p_window_hours || ' hours')::interval
  );
$$;