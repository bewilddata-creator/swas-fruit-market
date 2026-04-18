import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;
  const body = await req.json().catch(() => ({}));
  const sb = supabaseAdmin();

  const { data: booking } = await sb.from('bookings').select('id, week_id, status').eq('id', params.id).maybeSingle();
  if (!booking) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Status transition (shipped / cancelled)
  if (body.status && ['shipped', 'cancelled'].includes(body.status)) {
    if (booking.status === 'cancelled') return NextResponse.json({ error: 'ยกเลิกแล้ว' }, { status: 400 });
    if (body.status === 'cancelled' && booking.status === 'shipped') {
      // void linked receipt
      await sb.from('receipts').update({ status: 'void' }).eq('booking_id', params.id);
    }
    const { error } = await sb.from('bookings').update({ status: body.status, updated_at: new Date().toISOString() }).eq('id', params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Edit (pending only)
  if (body.items) {
    if (booking.status !== 'pending') return NextResponse.json({ error: 'แก้ไขได้เฉพาะรายการที่รอดำเนินการ' }, { status: 400 });
    const { customer_name, contact, items } = body;
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await sb.rpc('save_booking', {
        p_booking_id: params.id,
        p_week_id: booking.week_id,
        p_customer_name: customer_name,
        p_contact: contact,
        p_items: items,
        p_created_by: g.session.admin_id,
      });
      if (!error) return NextResponse.json({ id: data });
      if (attempt === 1 || !/deadlock|could not serialize/i.test(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
  }

  return NextResponse.json({ error: 'bad request' }, { status: 400 });
}
