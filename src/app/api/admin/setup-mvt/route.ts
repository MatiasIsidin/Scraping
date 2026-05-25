import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

/**
 * POST /api/admin/setup-mvt
 * Crea todas las tablas necesarias para HITO 5/6 MVT.
 * Usa inserción de prueba para verificar si la tabla existe.
 */
export async function POST() {
  const results: Record<string, string> = {};

  // Intentar crear tablas via RPC exec_sql
  const tables = [
    {
      name: 'selected_solutions',
      sql: `CREATE TABLE IF NOT EXISTS public.selected_solutions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        solution_id UUID,
        rpm_profile_id UUID,
        criteria_hash TEXT NOT NULL DEFAULT 'local',
        proposal_version INTEGER DEFAULT 1,
        selected_at TIMESTAMPTZ DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`
    },
    {
      name: 'mvt_processes',
      sql: `CREATE TABLE IF NOT EXISTS public.mvt_processes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        selected_solution_id UUID,
        solution_title TEXT NOT NULL DEFAULT 'Sin titulo',
        pain_point_title TEXT,
        fit_score INTEGER DEFAULT 0,
        selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        current_state TEXT NOT NULL DEFAULT 'INMERSION',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );`
    },
    {
      name: 'solution_generation_history',
      sql: `CREATE TABLE IF NOT EXISTS public.solution_generation_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        rpm_profile_id UUID,
        criteria_hash TEXT NOT NULL DEFAULT '',
        rpm_version INTEGER DEFAULT 1,
        rpm_snapshot JSONB DEFAULT '{}'::jsonb,
        solutions_generated INTEGER DEFAULT 0,
        solutions_snapshot JSONB DEFAULT '[]'::jsonb,
        is_current BOOLEAN DEFAULT TRUE,
        generated_at TIMESTAMPTZ DEFAULT NOW(),
        invalidated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`
    },
    {
      name: 'mvt_immersion_conversations',
      sql: `CREATE TABLE IF NOT EXISTS public.mvt_immersion_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mvt_process_id UUID,
        contact_name TEXT NOT NULL DEFAULT '',
        segment TEXT,
        company TEXT,
        role TEXT,
        conversation_date TIMESTAMPTZ DEFAULT NOW(),
        channel TEXT,
        duration_minutes INTEGER,
        notes TEXT,
        problems_detected TEXT,
        literal_quotes TEXT,
        pain_level INTEGER DEFAULT 5,
        willingness_to_pay TEXT,
        observations TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`
    },
    {
      name: 'mvt_hypotheses',
      sql: `CREATE TABLE IF NOT EXISTS public.mvt_hypotheses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mvt_process_id UUID,
        hypothesis TEXT NOT NULL DEFAULT '',
        type TEXT,
        risk TEXT DEFAULT 'MEDIA',
        impact TEXT DEFAULT 'MEDIA',
        priority INTEGER DEFAULT 0,
        justification TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`
    },
    {
      name: 'mvt_tests',
      sql: `CREATE TABLE IF NOT EXISTS public.mvt_tests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mvt_process_id UUID,
        hypothesis_id UUID,
        name TEXT NOT NULL DEFAULT '',
        test_type TEXT DEFAULT 'OTRO',
        description TEXT,
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        status TEXT DEFAULT 'PENDIENTE',
        url TEXT,
        screenshots JSONB DEFAULT '[]'::jsonb,
        target_metric TEXT,
        expected_result TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`
    },
    {
      name: 'mvt_results',
      sql: `CREATE TABLE IF NOT EXISTS public.mvt_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mvt_process_id UUID,
        test_id UUID,
        target_metric TEXT,
        actual_result TEXT,
        difference TEXT,
        fulfillment_percentage NUMERIC(5,2) DEFAULT 0,
        classification TEXT DEFAULT 'INCONCLUSA',
        reasoning TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`
    },
    {
      name: 'mvt_decisions',
      sql: `CREATE TABLE IF NOT EXISTS public.mvt_decisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mvt_process_id UUID,
        decision TEXT NOT NULL DEFAULT 'AVANZAR',
        justification TEXT,
        learnings TEXT,
        next_steps TEXT,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`
    },
    {
      name: 'mvt_immersion_summary',
      sql: `CREATE TABLE IF NOT EXISTS public.mvt_immersion_summary (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mvt_process_id UUID,
        ai_summary TEXT,
        repeated_patterns TEXT,
        insights TEXT,
        frequent_problems TEXT,
        generated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`
    }
  ];

  for (const table of tables) {
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', { query_text: table.sql });
      if (error) {
        results[table.name] = `ERROR (rpc): ${error.message}`;
      } else {
        results[table.name] = 'CREATED/EXISTS ✅';
      }
    } catch (e: any) {
      results[table.name] = `ERROR: ${e.message}`;
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Setup MVT ejecutado. Revisa los resultados por tabla.',
    results
  });
}

export async function GET() {
  return NextResponse.json({
    message: 'Usa POST para ejecutar el setup de tablas MVT.',
    hint: 'curl -X POST /api/admin/setup-mvt'
  });
}
