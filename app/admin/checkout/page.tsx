import { supabaseAdmin } from '@/lib/supabase';
import { getFruitOptions } from '@/lib/stock-options';
import { CheckoutForm } from './CheckoutForm';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage({ searchParams }: { searchParams: { booking?: string } }) {
  const sb = supabaseAdmin();
  const { data: week } = await sb.from('weeks').select('id').eq('is_active', true).maybeSingle();
  if (!week) return <p className="text-muted">ยังไม่มีสัปดาห์ที่เปิดขาย</p>;
  const fruits = await getFruitOptions(week.id, searchParams.booking);

  let booking: any = null;
  if (searchParams.booking) {
    const { data } = await sb
      .from('bookings')
      .select('id, status, customer_name, contact, booking_items(fruit_id, qty, name_snapshot, price_snapshot, pricing_mode_snapshot, unit_snapshot)')
      .eq('id', searchParams.booking)
      .maybeSingle();
    booking = data;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-3">คิดเงิน</h1>
      <CheckoutForm fruits={fruits} booking={booking} />
    </div>
  );
}
