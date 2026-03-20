-- Migration: Add dark_mode column to profiles table
-- This enables user-specific dark mode preferences to be stored in the database
-- and synced across devices/sessions for each user.

-- Add dark_mode column to profiles table (boolean, defaults to false)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS dark_mode boolean DEFAULT false;

-- Enable RLS on the column (optional - existing policies should still work)
-- Note: Users can only update their own dark_mode preference

-- Create a policy to allow users to update their own dark_mode preference
DROP POLICY IF EXISTS "Users can update own dark_mode" ON public.profiles;
CREATE POLICY "Users can update own dark_mode" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Set a default value for existing records (false)
UPDATE public.profiles SET dark_mode = false WHERE dark_mode IS NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.profiles.dark_mode IS 'User preference for dark mode theme. When true, the application uses dark mode.';
