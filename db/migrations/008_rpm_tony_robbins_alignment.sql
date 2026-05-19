-- ============================================================
-- MIGRACIÓN HITO 4.6 — Alineación Tony Robbins (R-P-M)
-- ============================================================

ALTER TABLE rpm_profiles 
ADD COLUMN IF NOT EXISTS emotional_urgency INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rpm_score INTEGER DEFAULT 0;

-- Si existen market_advantage y strategic_clarity, los mantenemos pero documentamos su nuevo uso
COMMENT ON COLUMN rpm_profiles.market_advantage IS 'En el marco R-P-M, este campo puede ser opcional o mapeado a ventaja competitiva';
COMMENT ON COLUMN rpm_profiles.strategic_clarity IS 'Nivel de claridad en los Resultados (R)';
COMMENT ON COLUMN rpm_profiles.execution_readiness IS 'Nivel de preparación en el Plan de Acción (M)';
