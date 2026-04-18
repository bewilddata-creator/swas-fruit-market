import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { StartWeekButton } from '../stock/StartWeekButton';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const sb = supabaseAdmin();
  const { data: weeks } = await sb.from('weeks').select('id, start_date, is_active, closed_at').order('start_date', { ascending: false });
  const weekIds = (weeks ?? []).filter((w) => !w.is_active).map((w) => w.id);

  const totals = new Map<string, { bookings: number; revenue: number }>();
  if (weekIds.length) {
    const { data: bks } = await sb.from('bookings').select('week_id').in('week_id', weekIds).in('status', ['pending', 'shipped']);
    for (const b of bks ?? []) {
      const t = totals.get(b.week_id) ?? { bookings: 0, revenue: 0 };
      t.bookings += 1;
      totals.set(b.week_id, t);
    }
    const { data: recs } = await sb.from('receipts').select('week_id, total').in('week_id', weekIds).eq('status', 'active');
    for (const r of recs ?? []) {
      const t = totals.get(r.week_id) ?? { bookings: 0, revenue: 0 };
      t.revenue += Number(r.total);
      totals.set(r.week_id, t);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">ประวัติ</h1>
        <div className="flex gap-2">
          <a href="/api/admin/history/export" className="bg-white border rounded px-3 py-2 text-sm">ดาวน์โหลดทั้งหมด</a>
          <StartWeekButton />
        </div>
      </div>
      <div className="space-y-2">
        {(weeks ?? []).filter((w) => !w.is_active).map((w) => {
          const t = totals.get(w.id) ?? { bookings: 0, revenue: 0 };
          return (
            <div key={w.id} className="bg-white rounded-lg shadow-sm p-3 flex items-center justify-between">
              <div>
                <div className="font-bold">{new Date(w.start_date).toLocaleDateString('th-TH')}</div>
                <div className="text-sm text-muted">{t.bookings} รายการจอง · {t.revenue.toLocaleString()} บาท</div>
              </div>
              <div className="flex gap-2 text-sm">
                <Link href={`/admin/history/${w.id}`} className="text-brand">ดู</Link>
                <a href={`/api/admin/history/export?week=${w.id}`} className="text-brand">CSV</a>
              </div>
            </div>
          );
        })}
        {(!weeks || weeks.filter((w) => !w.is_active).length === 0) && <p className="text-muted">ยังไม่มีประวัติ</p>}
      </div>
    </div>
  );
}
