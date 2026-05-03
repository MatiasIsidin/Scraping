-- Fase 6: Base de datos para Pain Points del Mercado
-- Ejecutar en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS pain_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    market_segment TEXT NOT NULL,
    severity_score NUMERIC(5,2) DEFAULT 0,
    frequency_score NUMERIC(5,2) DEFAULT 0,
    recency_score NUMERIC(5,2) DEFAULT 0,
    final_score NUMERIC(5,2) DEFAULT 0,
    evidence_sources JSONB DEFAULT '[]'::jsonb,
    version TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Si deseamos buscar y actualizar duplicados por título y segmento:
-- Creamos un constraint único para la agrupación lógica (Opcional, pero recomendado si usamos upsert)
-- ALTER TABLE pain_points ADD CONSTRAINT pain_points_title_segment_version_key UNIQUE (title, market_segment, version);
