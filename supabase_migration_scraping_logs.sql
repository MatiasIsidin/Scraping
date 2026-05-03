-- Fase 2: Extensión del Esquema para la tabla scraping_logs
-- Este archivo puede ser ejecutado en el SQL Editor de Supabase

-- Agregar las nuevas columnas para el seguimiento y trazabilidad
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS scraper_version TEXT;
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS skipped_existing INTEGER DEFAULT 0;
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS transcripts_created INTEGER DEFAULT 0;
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS fallback_used INTEGER DEFAULT 0;
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS snapshots_created INTEGER DEFAULT 0;
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS execution_time_seconds INTEGER DEFAULT 0;
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS api_calls_estimated INTEGER DEFAULT 0;
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS source TEXT;

-- (Opcional) Puedes asegurar que el status tenga un DEFAULT razonable si no lo tiene
-- ALTER TABLE scraping_logs ALTER COLUMN status SET DEFAULT 'success';

-- ==================================================
-- FASE 7: Consultas SQL de validación recomendadas
-- ==================================================

-- 1. Últimos logs
-- SELECT * FROM scraping_logs ORDER BY executed_at DESC LIMIT 50;

-- 2. Logs con errores
-- SELECT * FROM scraping_logs WHERE errors_count > 0;

-- 3. Logs sin versión
-- SELECT * FROM scraping_logs WHERE scraper_version IS NULL;

-- 4. Métricas por tipo (Agrupación)
-- SELECT run_type, COUNT(*) FROM scraping_logs GROUP BY run_type;
