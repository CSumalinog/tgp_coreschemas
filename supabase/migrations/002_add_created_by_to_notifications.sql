-- Add created_by column to notifications table
-- This tracks who triggered the notification (admin, sec_head, client, staff, etc.)

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for faster lookups when displaying user avatars
CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON public.notifications(created_by);
