import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function HistoricalWeek({ params }: { params: { weekId: string } }) {
  const sb = supabaseAdmin();
  const { data: week } = await sb.from('weeks').select('id, start_date, closed_at').eq('id', params.weekId).maybeSingle();
  if (!week) notFound();

  const [{ data: stock }, { data: bookings }, { data: receipts }] = await Promise.all([
    sb.from('week_stock').select('stock_qty, price_value, fruit:fruit_id(name_th, stock_unit)').eq('week_id', week.id),
    sb.from('bookings').select('id, customer_name, contact, status, created_at, booking_items(qty, name_snapshot, price_snapshot)').eq('week_id', week.id).order('created_at'),
    sb.from('receipts').select('id, customer_name, total, status, created_at, booking_id').eq('week_id', week.id).order('created_at'),
  ]);

  return (
    <div className="space-y-5">
      <Link href="/admin/history" className="text-brand text-sm">← ประวัติ</Link>
      <h1 className="text-2xl font-bold">สัปดาห์ {new Date(week.start_date).toLocaleDateString('th-TH')}</h1>

      <section>
        <h2 className="font-bold mb-2">สต็อก</h2>
        <div className="bg-white rounded-lg shadow-sm divide-y">
          {(stock ?? []).map((s: any, i: number) => (
            <div key={i} className="p-3 flex justify-between text-sm">
              <span>{s.fruit?.name_th}</span>
              <span className="text-muted">{s.stock_qty} {s.fruit?.stock_unit} · {s.price_value}฿</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-2">รายการจอง</h2>
        <div className="bg-white rounded-lg shadow-sm divide-y">
          {(bookings ?? []).map((b: any) => (
            <Link key={b.id} href={`/admin/bookings/${b.id}`} className="block p-3 text-sm">
              <div className="flex justify-between">
                <span className="font-bold">{b.customer_name}</span>
                <span className="text-muted">{b.status}</span>
              </div>
              <div className="text-xs text-muted">{b.booking_items.map((i: any) => `${i.name_snapshot} ${i.qty}`).join(', ')}</div>
            </Link>
          ))}
          {(bookings ?? []).length === 0 && <p className="p-3 text-muted text-sm">ไม่มี</p>}
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-2">ใบเสร็จ</h2>
        <div className="bg-white rounded-lg shadow-sm divide-y">
          {(receipts ?? []).map((r: any) => (
            <Link key={r.id} href={`/admin/receipts/${r.id}`} className="block p-3 text-sm">
              <div className="flex justify-between">
                <span>{r.customer_name}</span>
                <span className="font-bold">{Number(r.total).toLocaleString()}฿ {r.status === 'void' && <span className="text-danger">(โมฆะ)</span>}</span>
              </div>
            </Link>
          ))}
          {(receipts ?? []).length === 0 && <p className="p-3 text-muted text-sm">ไม่มี</p>}
        </div>
      </section>
    </div>
  );
}
