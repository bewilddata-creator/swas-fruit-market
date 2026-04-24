import { supabaseAdmin } from '@/lib/supabase';
import { StockPanel } from './StockPanel';
import { StartWeekButton } from './StartWeekButton';

export const dynamic = 'force-dynamic';

export default async function StockPage() {
  const sb = supabaseAdmin();
  const { data: week } = await sb.from('weeks').select('id, start_date, created_at').eq('is_active', true).maybeSingle();

  if (!week) {
    return (
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold mb-2">สต็อกสัปดาห์นี้</h1>
        <p className="text-muted mb-4">ยังไม่มีสัปดาห์ที่เปิดขาย</p>
        <StartWeekButton large />
      </div>
    );
  }

  const [{ data: fruits }, { data: stockRows }, { data: bookings }, { data: receipts }] = await Promise.all([
    sb.from('fruits').select('id, name_th, selling_unit, stock_unit, pricing_mode, image_url').is('deleted_at', null).order('name_th'),
    sb.from('week_stock').select('fruit_id, stock_qty, price_value').eq('week_id', week.id),
    sb.from('bookings').select('id, status, booking_items(fruit_id, qty)').eq('week_id', week.id).in('status', ['pending', 'shipped']),
    sb.from('receipts').select('items_json').eq('week_id', week.id).eq('status', 'active').eq('deducted_stock', true).is('booking_id', null),
  ]);

  const bookedByFruit = new Map<string, number>();
  const soldByFruit = new Map<string, number>();

  for (const b of bookings ?? []) {
    const bucket = b.status === 'pending' ? bookedByFruit : soldByFruit;
    for (const it of ((b as any).booking_items ?? []) as Array<{ fruit_id: string; qty: number }>) {
      bucket.set(it.fruit_id, (bucket.get(it.fruit_id) ?? 0) + Number(it.qty));
    }
  }
  for (const r of receipts ?? []) {
    for (const it of ((r as any).items_json ?? []) as Array<{ fruit_id: string; qty: number }>) {
      soldByFruit.set(it.fruit_id, (soldByFruit.get(it.fruit_id) ?? 0) + Number(it.qty));
    }
  }

  const stockMap = new Map((stockRows ?? []).map((r) => [r.fruit_id, r]));
  const activeFruits = (fruits ?? []).filter((f) => stockMap.has(f.id));
  const notAddedFruits = (fruits ?? []).filter((f) => !stockMap.has(f.id));

  const staleDays = Math.floor((Date.now() - new Date(week.created_at).getTime()) / 86400000);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">สต็อกสัปดาห์นี้</h1>
          <p className="text-muted text-sm">เริ่มวันที่ {new Date(week.start_date).toLocaleDateString('th-TH')}</p>
        </div>
        <StartWeekButton />
      </div>
      {staleDays >= 7 && (
        <div className="bg-warn/10 border border-warn text-warn p-3 rounded mb-4 text-sm">
          ⚠️ สัปดาห์นี้เปิดมาแล้ว {staleDays} วัน — อย่าลืมเริ่มสัปดาห์ใหม่
        </div>
      )}
      <StockPanel
        weekId={week.id}
        activeFruits={activeFruits.map((f) => ({
          fruit: f,
          stock_qty: Number(stockMap.get(f.id)?.stock_qty ?? 0),
          price_value: Number(stockMap.get(f.id)?.price_value ?? 0),
          booked: bookedByFruit.get(f.id) ?? 0,
          sold: soldByFruit.get(f.id) ?? 0,
        }))}
        notAddedFruits={notAddedFruits}
      />
    </div>
  );
}
