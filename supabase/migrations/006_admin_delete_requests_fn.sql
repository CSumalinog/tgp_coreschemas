-- 006: Server-side function to delete requests with all dependencies.
-- RLS on coverage_assignments may prevent the admin JS client from deleting
-- other users' assignments, so we use a SECURITY DEFINER function instead.

CREATE OR REPLACE FUNCTION admin_delete_requests(request_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admin role
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  DELETE FROM request_user_state   WHERE request_id = ANY(request_ids);
  DELETE FROM coverage_assignments WHERE request_id = ANY(request_ids);
  DELETE FROM notifications        WHERE request_id = ANY(request_ids);
  DELETE FROM coverage_requests    WHERE id         = ANY(request_ids);
END;
$$;
