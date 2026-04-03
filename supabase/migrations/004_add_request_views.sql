-- 004: Track which user has viewed which request (Gmail-style unread)
CREATE TABLE IF NOT EXISTS request_views (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES coverage_requests(id) ON DELETE CASCADE,
  viewed_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, request_id)
);

-- Fast lookups by user
CREATE INDEX idx_request_views_user ON request_views (user_id);
-- Fast lookups by request
CREATE INDEX idx_request_views_request ON request_views (request_id);

-- RLS
ALTER TABLE request_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own views"
  ON request_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own views"
  ON request_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);
