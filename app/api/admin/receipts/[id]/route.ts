import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase';

// Void a receipt. If linked to a booking, also cancel the booking so stock is released.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;
  const body = await req.json().catch(() => ({}));
  if (body.status !== 'void') return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: rec } = await sb.from('receipts').select('id, status, booking_id').eq('id', params.id).maybeSingle();
  if (!rec) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (rec.status === 'void') return NextResponse.json({ ok: true });

  const { error } = await sb.from('receipts').update({ status: 'void' }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (rec.booking_id) {
    await sb.from('bookings').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', rec.booking_id);
  }
  return NextResponse.json({ ok: true });
}
