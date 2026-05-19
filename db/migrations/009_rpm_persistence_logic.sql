-- ============================================================
-- MIGRACIÓN HITO 4.7 — Persistencia y Versionado RPM
-- ============================================================

-- 1. Asegurar que existe user_id y is_active
ALTER TABLE public.rpm_profiles 
ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT 'Matias',
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- 2. Índice para búsqueda rápida del último perfil activo
CREATE INDEX IF NOT EXISTS idx_rpm_profiles_user_active ON public.rpm_profiles(user_id, is_active) WHERE is_active = true;

-- 3. Comentario
COMMENT ON COLUMN public.rpm_profiles.user_id IS 'ID del usuario propietario del perfil';
COMMENT ON COLUMN public.rpm_profiles.is_active IS 'Indica si es el perfil actual que debe mostrarse';
