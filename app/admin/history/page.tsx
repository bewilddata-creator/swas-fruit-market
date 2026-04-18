import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { StartWeekButton } from '../stock/StartWeekButton';

export const dynamic = 'force-dynamic';

async function getWeekTotals(sb: ReturnType<typeof supabaseAdmin>, weekId: string) {
  const [{ count: bookingCount }, { data: recs }] = await Promise.all([
    sb.from('bookings').select('id', { count: 'exact', head: true }).eq('week_id', weekId).in('status', ['pending', 'shipped']),
    sb.from('receipts').select('total').eq('week_id', weekId).eq('status', 'active'),
  ]);
  const revenue = (recs ?? []).reduce((s, r: any) => s + Number(r.total), 0);
  return { bookings: bookingCount ?? 0, revenue };
}

export default async function HistoryPage() {
  const sb = supabaseAdmin();
  const { data: weeks } = await sb.from('weeks').select('id, start_date, is_active, closed_at').order('start_date', { ascending: false });
  const active = (weeks ?? []).find((w) => w.is_active);
  const past = (weeks ?? []).filter((w) => !w.is_active);

  let activeTotals = { bookings: 0, revenue: 0 };
  let activeReceipts: any[] = [];
  if (active) {
    activeTotals = await getWeekTotals(sb, active.id);
    const { data } = await sb
      .from('receipts')
      .select('id, customer_name, total, status, booking_id, created_at')
      .eq('week_id', active.id)
      .order('created_at', { ascending: false })
      .limit(50);
    activeReceipts = data ?? [];
  }

  const pastTotals = new Map<string, { bookings: number; revenue: number }>();
  if (past.length) {
    const pastIds = past.map((w) => w.id);
    const { data: bks } = await sb.from('bookings').select('week_id').in('week_id', pastIds).in('status', ['pending', 'shipped']);
    for (const b of bks ?? []) {
      const t = pastTotals.get(b.week_id) ?? { bookings: 0, revenue: 0 };
      t.bookings += 1;
      pastTotals.set(b.week_id, t);
    }
    const { data: recs } = await sb.from('receipts').select('week_id, total').in('week_id', pastIds).eq('status', 'active');
    for (const r of recs ?? []) {
      const t = pastTotals.get(r.week_id) ?? { bookings: 0, revenue: 0 };
      t.revenue += Number(r.total);
      pastTotals.set(r.week_id, t);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ประวัติ</h1>
        <div className="flex gap-2">
          <a href="/api/admin/history/export" className="bg-white border rounded px-3 py-2 text-sm">ดาวน์โหลดทั้งหมด</a>
          <StartWeekButton />
        </div>
      </div>

      {active && (
        <section>
          <h2 className="font-bold text-brand mb-2">สัปดาห์นี้ (กำลังเปิดขาย)</h2>
          <div className="bg-white rounded-lg shadow-sm p-4 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted">เริ่ม {new Date(active.start_date).toLocaleDateString('th-TH')}</div>
                <div className="font-bold mt-1">
                  {activeTotals.bookings} รายการจอง · {activeTotals.revenue.toLocaleString()} บาท
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-2 border-b text-sm font-bold bg-surface">ใบเสร็จสัปดาห์นี้ ({activeReceipts.length})</div>
            {activeReceipts.length === 0 && <p className="p-4 text-muted text-sm">ยังไม่มีใบเสร็จ</p>}
            {activeReceipts.map((r) => (
              <Link key={r.id} href={`/admin/receipts/${r.id}`} className="block px-4 py-2.5 border-b last:border-0 text-sm hover:bg-surface">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {r.customer_name}
                      {r.status === 'void' && <span className="text-danger text-xs ml-2">(โมฆะ)</span>}
                      {r.booking_id && <span className="text-brand text-xs ml-2">📎</span>}
                    </div>
                    <div className="text-xs text-muted">{new Date(r.created_at).toLocaleString('th-TH')}</div>
                  </div>
                  <div className="font-bold">{Number(r.total).toLocaleString()}฿</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-bold mb-2">สัปดาห์ก่อนๆ</h2>
        <div className="space-y-2">
          {past.map((w) => {
            const t = pastTotals.get(w.id) ?? { bookings: 0, revenue: 0 };
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
          {past.length === 0 && <p className="text-muted">ยังไม่มีประวัติ</p>}
        </div>
      </section>
    </div>
  );
}
