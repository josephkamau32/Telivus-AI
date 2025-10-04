/*
  # Add Report Cache for Performance Optimization

  1. New Tables
    - `report_cache`
      - `id` (uuid, primary key)
      - `cache_key` (text, unique) - Hash of symptoms, age, feelings
      - `report_data` (jsonb) - Cached report JSON
      - `hit_count` (integer) - Number of times cache was used
      - `created_at` (timestamp)
      - `expires_at` (timestamp) - Cache expiration (24 hours)
  
  2. Security
    - Enable RLS on `report_cache` table
    - Service role can read/write cache entries
    - Regular users cannot access cache directly
  
  3. Indexes
    - Index on cache_key for fast lookups
    - Index on expires_at for cleanup
*/

CREATE TABLE IF NOT EXISTS public.report_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  report_data JSONB NOT NULL,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.report_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can read cache"
  ON public.report_cache
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert cache"
  ON public.report_cache
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update cache"
  ON public.report_cache
  FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role can delete cache"
  ON public.report_cache
  FOR DELETE
  TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS idx_report_cache_key ON public.report_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_report_cache_expires ON public.report_cache(expires_at);

-- Function to clean up expired cache entries (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.report_cache
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;