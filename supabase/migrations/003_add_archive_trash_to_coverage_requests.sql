-- Migration: Add archive & trash columns to coverage_requests
-- Enables a universal Archive / Trash lifecycle for requests.
--   archived_at  — when set, the request is archived (hidden from active views)
--   trashed_at   — when set, the request is in the trash (soft-deleted)

-- 1. Add columns
ALTER TABLE public.coverage_requests
ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trashed_at  timestamptz DEFAULT NULL;

-- 2. Index for fast filtering (most queries filter on these being NULL)
CREATE INDEX IF NOT EXISTS idx_coverage_requests_archived
  ON public.coverage_requests (archived_at)
  WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coverage_requests_trashed
  ON public.coverage_requests (trashed_at)
  WHERE trashed_at IS NOT NULL;

-- 3. Add comments for documentation
COMMENT ON COLUMN public.coverage_requests.archived_at IS 'Timestamp when the request was archived. NULL = active.';
COMMENT ON COLUMN public.coverage_requests.trashed_at  IS 'Timestamp when the request was moved to trash. NULL = not trashed.';
