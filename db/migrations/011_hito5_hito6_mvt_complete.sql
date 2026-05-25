-- ============================================================
-- MIGRACIÓN 011 — HITO 5 Cierre Completo + HITO 6 MVT Module
-- ============================================================

-- 1. Tabla de selección de soluciones (HITO 5)
CREATE TABLE IF NOT EXISTS public.selected_solutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    solution_id UUID REFERENCES public.solution_engine_outputs(id) ON DELETE CASCADE,
    rpm_profile_id UUID REFERENCES public.rpm_profiles(id) ON DELETE SET NULL,
    criteria_hash TEXT NOT NULL DEFAULT 'local',
    proposal_version INTEGER DEFAULT 1,
    selected_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_selected_solutions_user_active 
ON public.selected_solutions(user_id, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS idx_selected_solutions_unique_active 
ON public.selected_solutions(user_id) WHERE is_active = TRUE;

COMMENT ON TABLE public.selected_solutions IS 'Registro de soluciones seleccionadas por usuario. Solo una activa por usuario.';

-- 2. Historial de generaciones RPM (Dinamismo RPM)
CREATE TABLE IF NOT EXISTS public.solution_generation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    rpm_profile_id UUID REFERENCES public.rpm_profiles(id) ON DELETE SET NULL,
    criteria_hash TEXT NOT NULL,
    rpm_version INTEGER DEFAULT 1,
    rpm_snapshot JSONB DEFAULT '{}'::jsonb,
    solutions_generated INTEGER DEFAULT 0,
    solutions_snapshot JSONB DEFAULT '[]'::jsonb,
    is_current BOOLEAN DEFAULT TRUE,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    invalidated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generation_history_user 
ON public.solution_generation_history(user_id, is_current);

COMMENT ON TABLE public.solution_generation_history IS 'Historial de generaciones para demostrar dinamismo RPM. Cada cambio de perfil genera un nuevo registro.';

-- 3. Tabla MVT principal (estados del proceso)
CREATE TABLE IF NOT EXISTS public.mvt_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    selected_solution_id UUID NOT NULL REFERENCES public.selected_solutions(id) ON DELETE CASCADE,
    solution_title TEXT NOT NULL,
    pain_point_title TEXT,
    fit_score INTEGER DEFAULT 0,
    selected_at TIMESTAMPTZ NOT NULL,
    current_state TEXT NOT NULL DEFAULT 'INMERSION' CHECK (current_state IN ('INMERSION', 'HIPOTESIS', 'TESTING', 'RESULTADOS', 'DECISION')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mvt_processes_user_active 
ON public.mvt_processes(user_id, is_active);

COMMENT ON TABLE public.mvt_processes IS 'Proceso MVT activo vinculado a la solución seleccionada.';

-- 4. Conversaciones de inmersión MVT (Paso 1)
DROP TABLE IF EXISTS public.mvt_conversations CASCADE;
CREATE TABLE IF NOT EXISTS public.mvt_immersion_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mvt_process_id UUID NOT NULL REFERENCES public.mvt_processes(id) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    segment TEXT,
    company TEXT,
    role TEXT,
    conversation_date TIMESTAMPTZ DEFAULT NOW(),
    channel TEXT,
    duration_minutes INTEGER,
    notes TEXT,
    problems_detected TEXT,
    literal_quotes TEXT,
    pain_level INTEGER DEFAULT 5 CHECK (pain_level >= 1 AND pain_level <= 10),
    willingness_to_pay TEXT,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mvt_conversations_process 
ON public.mvt_immersion_conversations(mvt_process_id);

COMMENT ON TABLE public.mvt_immersion_conversations IS 'Entrevistas de inmersión MVT. Mínimo 5 requeridas.';

-- 5. Resumen IA de inmersión
CREATE TABLE IF NOT EXISTS public.mvt_immersion_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mvt_process_id UUID NOT NULL REFERENCES public.mvt_processes(id) ON DELETE CASCADE,
    ai_summary TEXT,
    repeated_patterns TEXT,
    insights TEXT,
    frequent_problems TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Hipótesis MVT (Paso 2)
CREATE TABLE IF NOT EXISTS public.mvt_hypotheses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mvt_process_id UUID NOT NULL REFERENCES public.mvt_processes(id) ON DELETE CASCADE,
    hypothesis TEXT NOT NULL,
    type TEXT,
    risk TEXT CHECK (risk IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
    impact TEXT CHECK (impact IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
    priority INTEGER DEFAULT 0,
    justification TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mvt_hypotheses_process 
ON public.mvt_hypotheses(mvt_process_id);

COMMENT ON TABLE public.mvt_hypotheses IS 'Tablero de hipótesis MVT. Mínimo 5 requeridas.';

-- 7. Tests/Experimentos MVT (Paso 3)
CREATE TABLE IF NOT EXISTS public.mvt_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mvt_process_id UUID NOT NULL REFERENCES public.mvt_processes(id) ON DELETE CASCADE,
    hypothesis_id UUID REFERENCES public.mvt_hypotheses(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    test_type TEXT CHECK (test_type IN ('LANDING_PAGE', 'SMOKE_TEST', 'PREVENTA', 'ENCUESTA', 'ANUNCIO', 'POST_REDES', 'DEMO', 'PROTOTIPO', 'OTRO')),
    description TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status TEXT DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'EN_CURSO', 'COMPLETADO', 'CANCELADO')),
    url TEXT,
    screenshots JSONB DEFAULT '[]'::jsonb,
    target_metric TEXT,
    expected_result TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mvt_tests_process 
ON public.mvt_tests(mvt_process_id);

COMMENT ON TABLE public.mvt_tests IS 'Experimentos reales de validación MVT.';

-- 8. Resultados MVT (Paso 4)
CREATE TABLE IF NOT EXISTS public.mvt_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mvt_process_id UUID NOT NULL REFERENCES public.mvt_processes(id) ON DELETE CASCADE,
    test_id UUID REFERENCES public.mvt_tests(id) ON DELETE SET NULL,
    target_metric TEXT,
    actual_result TEXT,
    difference TEXT,
    fulfillment_percentage NUMERIC(5,2) DEFAULT 0,
    classification TEXT CHECK (classification IN ('VALIDADA', 'INVALIDADA', 'INCONCLUSA')),
    reasoning TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mvt_results_process 
ON public.mvt_results(mvt_process_id);

COMMENT ON TABLE public.mvt_results IS 'Comparación objetivo vs resultado real.';

-- 9. Decisión final MVT (Paso 5)
CREATE TABLE IF NOT EXISTS public.mvt_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mvt_process_id UUID NOT NULL REFERENCES public.mvt_processes(id) ON DELETE CASCADE,
    decision TEXT NOT NULL CHECK (decision IN ('AVANZAR', 'AJUSTAR', 'DESCARTAR')),
    justification TEXT,
    learnings TEXT,
    next_steps TEXT,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mvt_decisions_process 
ON public.mvt_decisions(mvt_process_id);

COMMENT ON TABLE public.mvt_decisions IS 'Decisión final del proceso MVT.';
