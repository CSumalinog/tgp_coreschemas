-- 005: Per-user archive / trash state
-- Admin keeps using coverage_requests.archived_at / trashed_at (global).
-- sec_head and regular_staff use this table so each user has their own view.

CREATE TABLE IF NOT EXISTS request_user_state (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id  uuid NOT NULL REFERENCES coverage_requests(id) ON DELETE CASCADE,
  archived_at timestamptz,
  trashed_at  timestamptz,
  purged_at   timestamptz,               -- "delete forever" for non-admin
  PRIMARY KEY (user_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_rus_user    ON request_user_state (user_id);
CREATE INDEX IF NOT EXISTS idx_rus_request ON request_user_state (request_id);

-- RLS
ALTER TABLE request_user_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own request state" ON request_user_state;
CREATE POLICY "Users manage own request state"
  ON request_user_state FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
