import { supabaseAdmin } from './supabase';

export async function getBookedMap(weekId: string, excludeBookingId?: string): Promise<Map<string, number>> {
  const sb = supabaseAdmin();
  const m = new Map<string, number>();

  let q = sb.from('bookings').select('id, status, booking_items(fruit_id, qty)').eq('week_id', weekId).in('status', ['pending', 'shipped']);
  const { data: bookings } = await q;
  for (const b of bookings ?? []) {
    if (excludeBookingId && b.id === excludeBookingId) continue;
    for (const it of ((b as any).booking_items ?? []) as Array<{ fruit_id: string; qty: number }>) {
      m.set(it.fruit_id, (m.get(it.fruit_id) ?? 0) + Number(it.qty));
    }
  }

  const { data: receipts } = await sb
    .from('receipts')
    .select('items_json')
    .eq('week_id', weekId)
    .eq('status', 'active')
    .eq('deducted_stock', true)
    .is('booking_id', null);
  for (const r of receipts ?? []) {
    for (const it of (((r as any).items_json ?? []) as Array<{ fruit_id: string; qty: number }>)) {
      m.set(it.fruit_id, (m.get(it.fruit_id) ?? 0) + Number(it.qty));
    }
  }
  return m;
}
