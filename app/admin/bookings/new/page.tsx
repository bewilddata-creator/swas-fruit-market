import { supabaseAdmin } from '@/lib/supabase';
import { getFruitOptions } from '@/lib/stock-options';
import { BookingForm } from '../BookingForm';

export const dynamic = 'force-dynamic';

export default async function NewBookingPage() {
  const sb = supabaseAdmin();
  const { data: week } = await sb.from('weeks').select('id').eq('is_active', true).maybeSingle();
  if (!week) return <p className="text-muted">ยังไม่มีสัปดาห์ที่เปิดขาย</p>;
  const fruits = await getFruitOptions(week.id);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-3">จองใหม่</h1>
      <BookingForm fruits={fruits} />
    </div>
  );
}
