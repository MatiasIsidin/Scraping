-- Fase 5: Estados Finales de Transcripciones y Retry
-- Ejecutar en el SQL Editor de Supabase

-- Agregar columna status a transcripts si no existe
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';

-- Agregar columna retry_count para controlar el backoff y el límite de intentos
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Opcional: Actualizar los registros existentes para que tengan status = 'success'
UPDATE transcripts SET status = 'success' WHERE status IS NULL AND transcript IS NOT NULL AND transcript != '';
