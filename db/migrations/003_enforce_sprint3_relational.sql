-- ============================================================
-- SPRINT 3 — DEFINITIVE RELATIONAL SCHEMA ENFORCEMENT
-- ============================================================

-- 1. STABILIZE PAIN_POINTS
ALTER TABLE IF EXISTS public.pain_points 
  ALTER COLUMN video_id SET NOT NULL,
  ALTER COLUMN title SET DATA TYPE TEXT,
  ALTER COLUMN description SET DATA TYPE TEXT,
  ALTER COLUMN category SET DATA TYPE TEXT,
  ALTER COLUMN market_segment SET DATA TYPE TEXT;

-- 2. STABILIZE PAIN_POINT_SOURCES
-- Remove legacy columns to ensure 100% relational consistency
ALTER TABLE IF EXISTS public.pain_point_sources 
  DROP COLUMN IF EXISTS citation,
  DROP COLUMN IF EXISTS region;

-- 3. ENFORCE FOREIGN KEY AND CASCADE
-- First, remove any existing FK to avoid duplicates or conflicts
ALTER TABLE IF EXISTS public.pain_point_sources 
  DROP CONSTRAINT IF EXISTS pain_point_sources_pain_point_id_fkey;

ALTER TABLE IF EXISTS public.pain_point_sources 
  ADD CONSTRAINT pain_point_sources_pain_point_id_fkey 
  FOREIGN KEY (pain_point_id) 
  REFERENCES public.pain_points(id) 
  ON DELETE CASCADE;

-- 4. FINAL VALIDATION CONSTRAINTS
ALTER TABLE IF EXISTS public.pain_point_sources 
  ALTER COLUMN source_name SET NOT NULL,
  ALTER COLUMN source_type SET NOT NULL;

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_pps_pain_point_id ON public.pain_point_sources(pain_point_id);
CREATE INDEX IF NOT EXISTS idx_pp_video_id ON public.pain_points(video_id);

-- SCHEMA IS NOW 100% ALIGNED WITH SPRINT 3 REQUIREMENTS.
