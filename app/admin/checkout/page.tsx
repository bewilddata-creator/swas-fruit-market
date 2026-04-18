import { supabaseAdmin } from '@/lib/supabase';
import { getFruitOptions } from '@/lib/stock-options';
import { CheckoutForm } from './CheckoutForm';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage({ searchParams }: { searchParams: { booking?: string } }) {
  const sb = supabaseAdmin();
  const { data: week } = await sb.from('weeks').select('id').eq('is_active', true).maybeSingle();
  if (!week) return <p className="text-muted">ยังไม่มีสัปดาห์ที่เปิดขาย</p>;

  let fruits = await getFruitOptions(week.id, searchParams.booking);

  let booking: any = null;
  if (searchParams.booking) {
    const { data } = await sb
      .from('bookings')
      .select('id, status, customer_name, contact, booking_items(fruit_id, qty, name_snapshot, price_snapshot, pricing_mode_snapshot, unit_snapshot)')
      .eq('id', searchParams.booking)
      .maybeSingle();
    booking = data;

    if (booking) {
      const have = new Set(fruits.map((f) => f.id));
      const seen = new Set<string>();
      for (const it of booking.booking_items ?? []) {
        if (have.has(it.fruit_id) || seen.has(it.fruit_id)) continue;
        seen.add(it.fruit_id);
        const { data: fruitRow } = await sb
          .from('fruits')
          .select('stock_unit, pricing_mode')
          .eq('id', it.fruit_id)
          .maybeSingle();
        fruits.push({
          id: it.fruit_id,
          name_th: it.name_snapshot,
          selling_unit: it.unit_snapshot,
          stock_unit: fruitRow?.stock_unit ?? it.unit_snapshot,
          pricing_mode: (fruitRow?.pricing_mode ?? it.pricing_mode_snapshot) as 'per_unit' | 'per_weight',
          price_value: Number(it.price_snapshot),
          available: 0,
        });
      }
      fruits = fruits.sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-3">คิดเงิน</h1>
      <CheckoutForm fruits={fruits} booking={booking} />
    </div>
  );
}
