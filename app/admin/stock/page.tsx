import { supabaseAdmin } from '@/lib/supabase';
import { StockPanel } from './StockPanel';
import { StartWeekButton } from './StartWeekButton';

export const dynamic = 'force-dynamic';

export default async function StockPage() {
  const sb = supabaseAdmin();
  const { data: week } = await sb.from('weeks').select('id, start_date, created_at').eq('is_active', true).maybeSingle();
  const { data: fruits } = await sb
    .from('fruits')
    .select('id, name_th, selling_unit, stock_unit, pricing_mode, image_url')
    .is('deleted_at', null)
    .order('name_th');

  let stockRows: any[] = [];
  if (week) {
    const { data } = await sb.from('week_stock').select('fruit_id, stock_qty, price_value, notes').eq('week_id', week.id);
    stockRows = data ?? [];
  }

  const staleDays = week ? Math.floor((Date.now() - new Date(week.created_at).getTime()) / 86400000) : 0;

  if (!week) {
    return (
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold mb-2">สต็อกสัปดาห์นี้</h1>
        <p className="text-muted mb-4">ยังไม่มีสัปดาห์ที่เปิดขาย</p>
        <StartWeekButton large />
      </div>
    );
  }

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
      <StockPanel weekId={week.id} fruits={(fruits ?? []) as any} initialRows={stockRows} />
    </div>
  );
}
