import { supabasePublic } from './supabase';
import type { PublicStockPayload, PublicStockItem, Fruit } from './types';

export async function getPublicStock(): Promise<PublicStockPayload> {
  const sb = supabasePublic();

  const { data: week } = await sb
    .from('weeks')
    .select('id, start_date')
    .eq('is_active', true)
    .maybeSingle();

  if (!week) {
    return { week_id: null, week_start: null, items: [], updated_at: new Date().toISOString() };
  }

  const { data: stockRows } = await sb
    .from('week_stock')
    .select('fruit_id, stock_qty, price_value, fruits:fruit_id(id, name_th, selling_unit, stock_unit, pricing_mode, description, image_url, deleted_at)')
    .eq('week_id', week.id);

  const { data: bookings } = await sb
    .from('bookings')
    .select('id, status, booking_items(fruit_id, qty)')
    .eq('week_id', week.id)
    .in('status', ['pending', 'shipped']);

  const { data: receipts } = await sb
    .from('receipts')
    .select('items_json, status, booking_id, deducted_stock')
    .eq('week_id', week.id)
    .eq('status', 'active')
    .is('booking_id', null)
    .eq('deducted_stock', true);

  const booked = new Map<string, number>();
  for (const b of bookings ?? []) {
    for (const it of (b as any).booking_items ?? []) {
      booked.set(it.fruit_id, (booked.get(it.fruit_id) ?? 0) + Number(it.qty));
    }
  }
  for (const r of receipts ?? []) {
    for (const it of ((r as any).items_json ?? []) as Array<{ fruit_id: string; qty: number }>) {
      booked.set(it.fruit_id, (booked.get(it.fruit_id) ?? 0) + Number(it.qty));
    }
  }

  const items: PublicStockItem[] = (stockRows ?? [])
    .filter((r: any) => r.fruits && !r.fruits.deleted_at)
    .map((r: any) => {
      const fruit = r.fruits as Fruit;
      const b = booked.get(r.fruit_id) ?? 0;
      const available = Math.max(0, Number(r.stock_qty) - b);
      return {
        fruit_id: r.fruit_id,
        fruit,
        stock_qty: Number(r.stock_qty),
        price_value: Number(r.price_value),
        booked: b,
        available,
      };
    })
    .sort((a, b) => a.fruit.name_th.localeCompare(b.fruit.name_th, 'th'));

  return {
    week_id: week.id,
    week_start: week.start_date,
    items,
    updated_at: new Date().toISOString(),
  };
}
