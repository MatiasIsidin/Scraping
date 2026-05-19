-- ============================================================
-- MIGRACIÓN HITO 4.5 — Rediseño Profundo RPM
-- Agrega columnas para almacenar datos crudos y análisis IA
-- ============================================================

-- Agregar columnas a rpm_profiles
ALTER TABLE rpm_profiles 
ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS archetype TEXT,
ADD COLUMN IF NOT EXISTS execution_readiness INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS strategic_clarity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS market_advantage INTEGER DEFAULT 0;

-- Comentarios para documentación
COMMENT ON COLUMN rpm_profiles.raw_data IS 'Almacena el objeto RPM completo enviado por el Wizard';
COMMENT ON COLUMN rpm_profiles.ai_analysis IS 'Almacena el resultado JSON completo del perfilamiento IA';
COMMENT ON COLUMN rpm_profiles.archetype IS 'Arquetipo de emprendedor detectado por la IA';
