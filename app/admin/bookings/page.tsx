import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function BookingsPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = searchParams.status ?? 'pending';
  const sb = supabaseAdmin();
  const { data: week } = await sb.from('weeks').select('id').eq('is_active', true).maybeSingle();

  if (!week) {
    return <p className="text-muted">ยังไม่มีสัปดาห์ที่เปิดขาย</p>;
  }

  let q = sb
    .from('bookings')
    .select('id, customer_name, contact, status, created_at, booking_items(qty, name_snapshot, price_snapshot, pricing_mode_snapshot, unit_snapshot), admin:created_by(name)')
    .eq('week_id', week.id);
  if (status !== 'all') q = q.eq('status', status);
  const { data } = await q.order('created_at', { ascending: false });

  // Per-fruit pending summary (for Saturday prep)
  const { data: pending } = await sb
    .from('bookings')
    .select('booking_items(fruit_id, qty, name_snapshot, fruits:fruit_id(stock_unit))')
    .eq('week_id', week.id)
    .eq('status', 'pending');
  const summaryMap = new Map<string, { name: string; unit: string; qty: number }>();
  for (const b of pending ?? []) {
    for (const it of ((b as any).booking_items ?? []) as Array<any>) {
      const key = it.fruit_id as string;
      const cur = summaryMap.get(key) ?? {
        name: it.name_snapshot as string,
        unit: (it.fruits?.stock_unit as string) ?? '',
        qty: 0,
      };
      cur.qty += Number(it.qty);
      summaryMap.set(key, cur);
    }
  }
  const summary = [...summaryMap.values()].sort((a, b) => b.qty - a.qty);

  const tabs = [
    { k: 'pending', label: 'รอดำเนินการ' },
    { k: 'shipped', label: 'ส่งแล้ว' },
    { k: 'cancelled', label: 'ยกเลิก' },
    { k: 'all', label: 'ทั้งหมด' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">รายการจอง</h1>
        <Link href="/admin/bookings/new" className="bg-brand text-white rounded px-4 py-2">+ จองใหม่</Link>
      </div>

      {summary.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
          <div className="text-xs text-muted mb-2">สรุปจองที่รอดำเนินการ</div>
          <ul className="space-y-1 text-sm">
            {summary.map((s, i) => (
              <li key={i} className="flex items-baseline gap-2">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted">·</span>
                <span className="font-bold">{s.qty} {s.unit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 mb-3 text-sm overflow-x-auto">
        {tabs.map((t) => (
          <Link
            key={t.k}
            href={`/admin/bookings?status=${t.k}`}
            className={`px-3 py-1 rounded-full ${status === t.k ? 'bg-brand text-white' : 'bg-white border'}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        {(data ?? []).map((b: any) => {
          const items = b.booking_items ?? [];
          const summary = items.map((i: any) => `${i.name_snapshot} ${i.qty}`).join(', ');
          const hasPerWeight = items.some((i: any) => i.pricing_mode_snapshot === 'per_weight');
          const total = hasPerWeight
            ? 'คิดตามน้ำหนัก'
            : items.reduce((s: number, i: any) => s + Number(i.qty) * Number(i.price_snapshot), 0).toLocaleString() + ' บาท';
          return (
            <Link key={b.id} href={`/admin/bookings/${b.id}`} className="block bg-white rounded-lg shadow-sm p-3">
              <div className="flex items-center justify-between">
                <div className="font-bold">{b.customer_name}</div>
                <StatusBadge s={b.status} />
              </div>
              <div className="text-sm text-muted">{b.contact}</div>
              <div className="text-sm mt-1">{summary || '—'}</div>
              <div className="flex items-center justify-between mt-1 text-xs text-muted">
                <span>{b.admin?.name ? `โดย ${b.admin.name}` : ''}</span>
                <span className="font-bold text-ink">{total}</span>
              </div>
            </Link>
          );
        })}
        {(!data || data.length === 0) && <p className="text-muted">ยังไม่มีรายการจอง</p>}
      </div>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: 'bg-warn/20 text-warn',
    shipped: 'bg-brand-light text-brand',
    cancelled: 'bg-danger/20 text-danger',
  };
  const label: Record<string, string> = {
    pending: 'รอดำเนินการ',
    shipped: 'ส่งแล้ว',
    cancelled: 'ยกเลิก',
  };
  return <span className={`text-xs px-2 py-0.5 rounded ${map[s] ?? ''}`}>{label[s] ?? s}</span>;
}
