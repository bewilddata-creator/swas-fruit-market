import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(req: Request) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;
  const { week_id, items } = await req.json().catch(() => ({}));
  if (!week_id || !Array.isArray(items)) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const sb = supabaseAdmin();

  // Existing rows for this week
  const { data: existing } = await sb.from('week_stock').select('fruit_id').eq('week_id', week_id);
  const existingIds = new Set((existing ?? []).map((r) => r.fruit_id));
  const incomingIds = new Set(items.map((i: any) => i.fruit_id));
  const toRemove = [...existingIds].filter((id) => !incomingIds.has(id));

  // Block removing a fruit that has pending/shipped bookings
  if (toRemove.length) {
    const { data: conflict } = await sb
      .from('booking_items')
      .select('fruit_id, bookings!inner(status, week_id)')
      .in('fruit_id', toRemove)
      .eq('bookings.week_id', week_id)
      .in('bookings.status', ['pending', 'shipped']);
    const blocked = new Set((conflict ?? []).map((r: any) => r.fruit_id));
    if (blocked.size) {
      return NextResponse.json({ error: 'มีผลไม้ที่มีรายการจองค้างอยู่ — เอาออกจากสัปดาห์นี้ไม่ได้' }, { status: 400 });
    }
    await sb.from('week_stock').delete().eq('week_id', week_id).in('fruit_id', toRemove);
  }

  // Upsert the included rows
  if (items.length) {
    const rows = items.map((i: any) => ({
      week_id,
      fruit_id: i.fruit_id,
      stock_qty: i.stock_qty,
      price_value: i.price_value,
    }));
    const { error } = await sb.from('week_stock').upsert(rows, { onConflict: 'week_id,fruit_id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
