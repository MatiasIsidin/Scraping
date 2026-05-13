-- ============================================================
-- MIGRACIÓN 004 — Sincronización con Schema Real de Producción
-- Sprint 3 Cierre Definitivo
-- Fecha: 2026-05-11
--
-- PROPÓSITO:
--   Esta migración documenta el schema REAL en producción y
--   lo convierte en la referencia oficial del Sprint 3.
--   Es idempotente (IF NOT EXISTS / IF EXISTS).
--
-- NOTA: Las migraciones 001-003 crearon un schema que fue
--   iterado manualmente durante el desarrollo del Sprint 3.
--   Esta migración captura el estado final de producción.
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. TABLA: videos (sin cambios estructurales)
-- ──────────────────────────────────────────────
-- Schema existente estable: youtube_video_id (PK), channel_id, channel_name,
-- title, description, url, published_at, duration_seconds, thumbnail_url,
-- is_active, created_at, updated_at

CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_published_at ON videos(published_at);

-- ──────────────────────────────────────────────
-- 2. TABLA: transcripts (sin cambios estructurales)
-- ──────────────────────────────────────────────
-- Schema existente estable: youtube_video_id (FK), transcript, word_count,
-- status, char_count, is_processable, processed_for_painpoints, updated_at

CREATE INDEX IF NOT EXISTS idx_transcripts_status ON transcripts(status);

-- ──────────────────────────────────────────────
-- 3. TABLA: pain_points (SCHEMA REAL DE PRODUCCIÓN)
-- ──────────────────────────────────────────────
-- COLUMNAS REALES (validado contra Supabase 2026-05-11):
--   id              UUID PRIMARY KEY
--   title           TEXT NOT NULL
--   description     TEXT NOT NULL
--   category        TEXT NOT NULL DEFAULT 'General'
--   market_segment  TEXT DEFAULT 'LATAM General'
--   severity_score  INTEGER (1-10)
--   frequency_score INTEGER
--   recency_score   INTEGER DEFAULT 0
--   final_score     NUMERIC
--   version         TEXT DEFAULT 'v1'
--   video_id        TEXT (FK → videos.youtube_video_id)
--   is_active       BOOLEAN DEFAULT TRUE
--   created_at      TIMESTAMPTZ
--   updated_at      TIMESTAMPTZ

-- Asegurar columna is_active existe (idempotente)
ALTER TABLE pain_points ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Asegurar video_id existe (idempotente)
ALTER TABLE pain_points ADD COLUMN IF NOT EXISTS video_id TEXT;

-- Índices de producción
CREATE INDEX IF NOT EXISTS idx_pain_points_category ON pain_points(category);
CREATE INDEX IF NOT EXISTS idx_pain_points_severity ON pain_points(severity_score);
CREATE INDEX IF NOT EXISTS idx_pain_points_final_score ON pain_points(final_score DESC);
CREATE INDEX IF NOT EXISTS idx_pain_points_active ON pain_points(is_active);
CREATE INDEX IF NOT EXISTS idx_pain_points_video_id ON pain_points(video_id);

-- ──────────────────────────────────────────────
-- 4. TABLA: pain_point_sources (SCHEMA REAL DE PRODUCCIÓN)
-- ──────────────────────────────────────────────
-- COLUMNAS REALES (validado contra Supabase 2026-05-11):
--   id                UUID PRIMARY KEY
--   pain_point_id     UUID NOT NULL (FK → pain_points.id ON DELETE CASCADE)
--   source_type       TEXT ('video' | 'report' | 'external_report')
--   source_name       TEXT
--   source_url        TEXT
--   country           TEXT
--   evidence          TEXT
--   credibility_score INTEGER
--   created_at        TIMESTAMPTZ

-- Índices de producción
CREATE INDEX IF NOT EXISTS idx_pp_sources_pain_point ON pain_point_sources(pain_point_id);
CREATE INDEX IF NOT EXISTS idx_pp_sources_type ON pain_point_sources(source_type);

-- ──────────────────────────────────────────────
-- 5. TABLA: extraction_logs (NUEVA — IA Pipeline Traceability)
-- ──────────────────────────────────────────────
-- COLUMNAS REALES (creada en producción 2026-05-11):
--   id              UUID PRIMARY KEY
--   video_id        TEXT (identificador de batch o video individual)
--   pain_point_id   UUID (opcional, para logs granulares)
--   model_used      TEXT
--   tokens_used     INTEGER
--   cost_estimated  NUMERIC
--   status          TEXT ('success' | 'partial' | 'error')
--   error_message   TEXT
--   created_at      TIMESTAMPTZ

CREATE TABLE IF NOT EXISTS extraction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id TEXT,
    pain_point_id UUID,
    model_used TEXT,
    tokens_used INTEGER,
    cost_estimated NUMERIC,
    status TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extraction_logs_status ON extraction_logs(status);
CREATE INDEX IF NOT EXISTS idx_extraction_logs_created ON extraction_logs(created_at DESC);

-- ──────────────────────────────────────────────
-- 6. TABLA: scraping_logs (sin cambios, solo índices)
-- ──────────────────────────────────────────────
-- Contiene SOLO logs operacionales del scraper.
-- Los logs de IA van a extraction_logs.

CREATE INDEX IF NOT EXISTS idx_scraping_logs_status ON scraping_logs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_run_type ON scraping_logs(run_type);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_executed_at ON scraping_logs(executed_at DESC);

-- ──────────────────────────────────────────────
-- 7. TABLA: video_snapshots (sin cambios)
-- ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_snapshots_video_id ON video_snapshots(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_scraped_at ON video_snapshots(scraped_at DESC);

-- ============================================================
-- FIN DE MIGRACIÓN 004 — Schema de Producción Sprint 3
-- ============================================================
--
-- ESTADO POST-MIGRACIÓN ESPERADO:
--   videos:             50 registros
--   transcripts:        50 registros (100% success)
--   pain_points:        109 registros (is_active = TRUE)
--   pain_point_sources: 242 registros (video + report)
--   extraction_logs:    tabla operacional vacía
--   scraping_logs:      11 registros operacionales
--
-- VERIFICACIÓN:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' ORDER BY table_name;
-- ============================================================
