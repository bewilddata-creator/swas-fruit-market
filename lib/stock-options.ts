import { supabaseAdmin } from './supabase';
import { getBookedMap } from './booked';

export async function getFruitOptions(weekId: string, excludeBookingId?: string) {
  const sb = supabaseAdmin();
  const { data: rows } = await sb
    .from('week_stock')
    .select('fruit_id, stock_qty, price_value, fruits:fruit_id(id, name_th, selling_unit, stock_unit, pricing_mode, deleted_at)')
    .eq('week_id', weekId);
  const booked = await getBookedMap(weekId, excludeBookingId);
  return (rows ?? [])
    .filter((r: any) => r.fruits && !r.fruits.deleted_at)
    .map((r: any) => ({
      id: r.fruit_id as string,
      name_th: r.fruits.name_th as string,
      selling_unit: r.fruits.selling_unit as string,
      stock_unit: r.fruits.stock_unit as string,
      pricing_mode: r.fruits.pricing_mode as 'per_unit' | 'per_weight',
      price_value: Number(r.price_value),
      available: Math.max(0, Number(r.stock_qty) - (booked.get(r.fruit_id) ?? 0)),
    }))
    .sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
}
