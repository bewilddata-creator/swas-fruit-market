import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase';

function pickFields(body: any) {
  const out: Record<string, any> = {};
  for (const k of ['name_th', 'selling_unit', 'stock_unit', 'pricing_mode', 'description', 'image_url']) {
    if (k in body) out[k] = body[k];
  }
  return out;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;
  const body = await req.json().catch(() => ({}));
  const sb = supabaseAdmin();
  const { error } = await sb.from('fruits').update(pickFields(body)).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;
  const sb = supabaseAdmin();
  // Block delete if pending/shipped bookings reference it
  const { count } = await sb
    .from('booking_items')
    .select('id, bookings!inner(status)', { count: 'exact', head: true })
    .eq('fruit_id', params.id)
    .in('bookings.status', ['pending', 'shipped']);
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'มีรายการจองที่ยังค้างอยู่ ลบไม่ได้' }, { status: 400 });
  }
  const { error } = await sb.from('fruits').update({ deleted_at: new Date().toISOString() }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
