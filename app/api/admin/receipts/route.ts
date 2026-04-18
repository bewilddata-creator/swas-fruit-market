import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;
  const body = await req.json().catch(() => ({}));
  const { customer_name, booking_id, items, total, deducted_stock } = body;
  if (!customer_name || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 });
  }
  const sb = supabaseAdmin();
  const { data: week } = await sb.from('weeks').select('id').eq('is_active', true).maybeSingle();
  if (!week) return NextResponse.json({ error: 'ไม่มีสัปดาห์ที่เปิดขาย' }, { status: 400 });

  // If linked to booking: sync booking items to match (and mark shipped)
  if (booking_id) {
    const { data: booking } = await sb.from('bookings').select('id, status, week_id, contact').eq('id', booking_id).maybeSingle();
    if (!booking) return NextResponse.json({ error: 'ไม่พบการจอง' }, { status: 404 });
    if (booking.status === 'cancelled') return NextResponse.json({ error: 'การจองถูกยกเลิกแล้ว' }, { status: 400 });

    const rpcItems = items.map((i: any) => ({ fruit_id: i.fruit_id, qty: Number(i.qty) }));
    const { error: rpcErr } = await sb.rpc('save_booking', {
      p_booking_id: booking.id,
      p_week_id: booking.week_id,
      p_customer_name: customer_name,
      p_contact: booking.contact,
      p_items: rpcItems,
      p_created_by: g.session.admin_id,
    });
    if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 400 });
    await sb.from('bookings').update({ status: 'shipped', updated_at: new Date().toISOString() }).eq('id', booking.id);
  }

  const { data: rec, error } = await sb
    .from('receipts')
    .insert({
      week_id: week.id,
      booking_id: booking_id ?? null,
      customer_name,
      items_json: items,
      total: Number(total ?? 0),
      deducted_stock: booking_id ? true : !!deducted_stock,
      created_by: g.session.admin_id,
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: rec.id });
}
