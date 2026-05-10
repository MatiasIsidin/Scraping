import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { title, description, category, severity_score, is_active, version } = body;

    const { data, error } = await supabaseAdmin
      .from('pain_points')
      .update({
        title,
        description,
        category,
        severity_score,
        is_active,
        version: version || 'manual_edit',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating pain point:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Soft delete preferido
    const { error } = await supabaseAdmin
      .from('pain_points')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting pain point:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
