-- ============================================================
-- MIGRACIÓN SPRINT 5 — Extensión para Motor de Soluciones e Inserción Inicial MVT
-- ============================================================

-- 1. Actualización de columnas en la tabla solution_engine_outputs
ALTER TABLE public.solution_engine_outputs 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS matched_pain_point_id UUID,
ADD COLUMN IF NOT EXISTS matched_video_ids JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS fit_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS detailed_fit_scores JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_rationale TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS tracking_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS criteria_hash TEXT;

-- 2. Registro de comentarios
COMMENT ON COLUMN public.solution_engine_outputs.title IS 'Título comercial representativo de la propuesta de negocio';
COMMENT ON COLUMN public.solution_engine_outputs.matched_pain_point_id IS 'ID del pain point principal que originó la solución';
COMMENT ON COLUMN public.solution_engine_outputs.matched_video_ids IS 'Array JSON con los IDs de los videos de YouTube relacionados';
COMMENT ON COLUMN public.solution_engine_outputs.fit_score IS 'Score general ponderado calculado en backend (0-100)';
COMMENT ON COLUMN public.solution_engine_outputs.detailed_fit_scores IS 'Desglose detallado de los 7 factores de ajuste calculados';
COMMENT ON COLUMN public.solution_engine_outputs.ai_rationale IS 'Análisis de encaje conversacional generado por la IA';
COMMENT ON COLUMN public.solution_engine_outputs.is_active IS 'Flag de control para invalidación dinámica';
COMMENT ON COLUMN public.solution_engine_outputs.criteria_hash IS 'Hash SHA-256 de parámetros del RPM en el momento de generación';

-- 3. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_solutions_active_rpm_hash 
ON public.solution_engine_outputs(rpm_profile_id, is_active, criteria_hash);

-- 4. Creación preventiva de la tabla mvt_conversations
CREATE TABLE IF NOT EXISTS public.mvt_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solution_id UUID REFERENCES public.solution_engine_outputs(id) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    conversation_date TIMESTAMPTZ DEFAULT NOW(),
    hypothesis TEXT,
    findings TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.mvt_conversations IS 'Persistencia inicial para las conversaciones y entrevistas de validación MVT';
