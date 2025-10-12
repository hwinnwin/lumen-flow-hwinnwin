-- Fix RLS policy issue: Allow the handle_new_user() trigger to assign default roles
-- The trigger runs with SECURITY DEFINER, but we need to ensure it can insert into user_roles

-- Drop the existing "Users can view their own roles" policy and recreate it more specifically
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Allow users to view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- CRITICAL FIX: Allow the system to assign default roles during user creation
-- This policy allows INSERT operations when the role being assigned is 'user'
-- and the user_id matches the authenticated user (during signup)
CREATE POLICY "Allow default role assignment on signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'user'::app_role
);

-- Ensure the handle_new_user function is properly configured
-- (This is idempotent - safe to run multiple times)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error details for debugging
    RAISE LOG 'Error in handle_new_user for user %: % %', NEW.id, SQLERRM, SQLSTATE;
    -- Re-raise the exception to prevent user creation if trigger fails
    RAISE;
END;
$$;