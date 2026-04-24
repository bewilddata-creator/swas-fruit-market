import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase';

type Update = { fruit_id: string; delta: number; price: number };
type Add = { fruit_id: string; stock_qty: number; price: number };

export async function PUT(req: Request) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;
  const { week_id, updates, adds } = (await req.json().catch(() => ({}))) as {
    week_id?: string;
    updates?: Update[];
    adds?: Add[];
  };
  if (!week_id) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const sb = supabaseAdmin();

  // Apply updates: delta + price
  for (const u of updates ?? []) {
    const { data: existing } = await sb
      .from('week_stock')
      .select('stock_qty')
      .eq('week_id', week_id)
      .eq('fruit_id', u.fruit_id)
      .maybeSingle();
    if (!existing) continue;
    const newQty = Number(existing.stock_qty) + Number(u.delta || 0);
    if (newQty < 0) {
      return NextResponse.json({ error: `ลดสต็อกลงต่ำกว่า 0 ไม่ได้` }, { status: 400 });
    }
    const { error } = await sb
      .from('week_stock')
      .update({ stock_qty: newQty, price_value: u.price })
      .eq('week_id', week_id)
      .eq('fruit_id', u.fruit_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Apply adds
  for (const a of adds ?? []) {
    const { error } = await sb.from('week_stock').insert({
      week_id,
      fruit_id: a.fruit_id,
      stock_qty: a.stock_qty,
      price_value: a.price,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;
  const { week_id, fruit_id } = await req.json().catch(() => ({}));
  if (!week_id || !fruit_id) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const sb = supabaseAdmin();

  // Block if pending/shipped bookings reference this fruit in this week
  const { data: conflict } = await sb
    .from('booking_items')
    .select('fruit_id, bookings!inner(status, week_id)')
    .eq('fruit_id', fruit_id)
    .eq('bookings.week_id', week_id)
    .in('bookings.status', ['pending', 'shipped']);
  if ((conflict ?? []).length > 0) {
    return NextResponse.json({ error: 'มีรายการจองที่ใช้ผลไม้นี้อยู่ — เอาออกไม่ได้' }, { status: 400 });
  }

  const { error } = await sb.from('week_stock').delete().eq('week_id', week_id).eq('fruit_id', fruit_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
