import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

/**
 * POST /api/mvt/conversations
 * Crea una nueva conversación de inmersión.
 */
export async function POST(request: Request) {
  try {
    const userId = 'Matias';
    const body = await request.json();

    // Obtener proceso MVT activo
    const { data: process } = await supabaseAdmin
      .from('mvt_processes')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!process) {
      return NextResponse.json({ success: false, error: 'No hay proceso MVT activo' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('mvt_immersion_conversations')
      .insert({
        mvt_process_id: process.id,
        contact_name: body.contact_name,
        segment: body.segment || null,
        company: body.company || null,
        role: body.role || null,
        conversation_date: body.conversation_date || new Date().toISOString(),
        channel: body.channel || null,
        duration_minutes: body.duration_minutes || null,
        notes: body.notes || null,
        problems_detected: body.problems_detected || null,
        literal_quotes: body.literal_quotes || null,
        pain_level: body.pain_level || 5,
        willingness_to_pay: body.willingness_to_pay || null,
        observations: body.observations || null
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, conversation: data });

  } catch (error: any) {
    console.error('[API-MVT-CONV] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/mvt/conversations
 * Elimina una conversación por ID.
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('mvt_immersion_conversations')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[API-MVT-CONV-DEL] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
