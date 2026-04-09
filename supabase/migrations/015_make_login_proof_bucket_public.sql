-- Ensure selfie proof objects can be served through Supabase public object URLs.

update storage.buckets
set public = true
where id = 'login-proof';