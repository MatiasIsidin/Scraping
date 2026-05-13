import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/pain-points/[id]
 * Updates a pain point. Only provided fields are updated.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();

    // Only include fields that were explicitly provided (avoid nulling out fields)
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (body.title !== undefined) updatePayload.title = body.title;
    if (body.description !== undefined) updatePayload.description = body.description;
    if (body.category !== undefined) updatePayload.category = body.category;
    if (body.severity_score !== undefined) updatePayload.severity_score = body.severity_score;
    if (body.frequency_score !== undefined) updatePayload.frequency_score = body.frequency_score;
    if (body.recency_score !== undefined) updatePayload.recency_score = body.recency_score;
    if (body.final_score !== undefined) updatePayload.final_score = body.final_score;
    if (body.market_segment !== undefined) updatePayload.market_segment = body.market_segment;
    if (body.is_active !== undefined) updatePayload.is_active = body.is_active;
    if (body.version !== undefined) updatePayload.version = body.version;

    const { data, error } = await supabaseAdmin
      .from('pain_points')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error updating pain point:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/pain-points/[id]
 * Soft-deletes a pain point by setting is_active = false.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { error } = await supabaseAdmin
      .from('pain_points')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting pain point:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
