import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function HistoricalWeek({ params }: { params: { weekId: string } }) {
  const sb = supabaseAdmin();
  const { data: week } = await sb.from('weeks').select('id, start_date, closed_at, is_active').eq('id', params.weekId).maybeSingle();
  if (!week) notFound();

  const [{ data: stock }, { data: bookings }, { data: receipts }] = await Promise.all([
    sb.from('week_stock').select('stock_qty, price_value, fruit:fruit_id(name_th, stock_unit)').eq('week_id', week.id),
    sb.from('bookings').select('id, customer_name, contact, status, created_at, booking_items(qty, name_snapshot)').eq('week_id', week.id).order('created_at'),
    sb.from('receipts').select('id, customer_name, total, status, created_at, booking_id').eq('week_id', week.id).order('created_at', { ascending: false }),
  ]);

  const activeReceipts = (receipts ?? []).filter((r) => r.status === 'active');
  const voidReceipts = (receipts ?? []).filter((r) => r.status === 'void');
  const soldTotal = activeReceipts.reduce((s, r) => s + Number(r.total), 0);
  const voidTotal = voidReceipts.reduce((s, r) => s + Number(r.total), 0);

  const bookingStatusCount = {
    pending: (bookings ?? []).filter((b) => b.status === 'pending').length,
    shipped: (bookings ?? []).filter((b) => b.status === 'shipped').length,
    cancelled: (bookings ?? []).filter((b) => b.status === 'cancelled').length,
  };

  return (
    <div className="space-y-5">
      <Link href="/admin/history" className="text-brand text-sm">← ประวัติ</Link>
      <h1 className="text-2xl font-bold">
        สัปดาห์ {new Date(week.start_date).toLocaleDateString('th-TH')}
        {week.is_active && <span className="text-sm font-normal text-brand ml-2">(กำลังเปิดขาย)</span>}
      </h1>

      {/* Totals */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-xs text-muted">ยอดขายสุทธิ</div>
          <div className="text-2xl font-bold text-brand">{soldTotal.toLocaleString()}฿</div>
          <div className="text-xs text-muted mt-1">{activeReceipts.length} ใบเสร็จ</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-xs text-muted">ยกเลิกแล้ว</div>
          <div className="text-2xl font-bold text-danger">{voidTotal.toLocaleString()}฿</div>
          <div className="text-xs text-muted mt-1">{voidReceipts.length} ใบเสร็จ</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-xs text-muted">รายการจอง</div>
          <div className="text-base font-bold mt-1">
            <span className="text-warn">{bookingStatusCount.pending}</span> รอ ·{' '}
            <span className="text-brand">{bookingStatusCount.shipped}</span> ส่ง ·{' '}
            <span className="text-danger">{bookingStatusCount.cancelled}</span> ยก
          </div>
        </div>
      </section>

      {/* Receipts (primary) */}
      <section>
        <h2 className="font-bold mb-2">ใบเสร็จ ({receipts?.length ?? 0})</h2>
        <div className="bg-white rounded-lg shadow-sm divide-y">
          {(receipts ?? []).map((r: any) => (
            <Link key={r.id} href={`/admin/receipts/${r.id}`} className="block p-3 text-sm hover:bg-surface">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {r.customer_name}
                    {r.booking_id && <span className="text-brand text-xs ml-2">📎</span>}
                    {r.status === 'void' && <span className="text-danger text-xs ml-2">(ยกเลิก)</span>}
                  </div>
                  <div className="text-xs text-muted">{new Date(r.created_at).toLocaleString('th-TH')}</div>
                </div>
                <div className={`font-bold ${r.status === 'void' ? 'line-through text-muted' : ''}`}>
                  {Number(r.total).toLocaleString()}฿
                </div>
              </div>
            </Link>
          ))}
          {(receipts ?? []).length === 0 && <p className="p-3 text-muted text-sm">ไม่มีใบเสร็จ</p>}
        </div>
      </section>

      {/* Bookings (secondary — mostly for unbilled pending/cancelled) */}
      <section>
        <h2 className="font-bold mb-2">รายการจอง ({bookings?.length ?? 0})</h2>
        <div className="bg-white rounded-lg shadow-sm divide-y">
          {(bookings ?? []).map((b: any) => (
            <Link key={b.id} href={`/admin/bookings/${b.id}`} className="block p-3 text-sm hover:bg-surface">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{b.customer_name} <span className="text-xs text-muted">· {b.status}</span></div>
                  <div className="text-xs text-muted">{b.booking_items.map((i: any) => `${i.name_snapshot} ${i.qty}`).join(', ')}</div>
                </div>
              </div>
            </Link>
          ))}
          {(bookings ?? []).length === 0 && <p className="p-3 text-muted text-sm">ไม่มี</p>}
        </div>
      </section>

      {/* Stock */}
      <section>
        <h2 className="font-bold mb-2">สต็อกสัปดาห์นี้</h2>
        <div className="bg-white rounded-lg shadow-sm divide-y">
          {(stock ?? []).map((s: any, i: number) => (
            <div key={i} className="p-3 flex justify-between text-sm">
              <span>{s.fruit?.name_th}</span>
              <span className="text-muted">{s.stock_qty} {s.fruit?.stock_unit} · {s.price_value}฿</span>
            </div>
          ))}
          {(stock ?? []).length === 0 && <p className="p-3 text-muted text-sm">ไม่มี</p>}
        </div>
      </section>
    </div>
  );
}
