import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { BookingActions } from './BookingActions';

export const dynamic = 'force-dynamic';

export default async function BookingDetail({ params, searchParams }: { params: { id: string }; searchParams: { edit?: string } }) {
  const sb = supabaseAdmin();
  const { data: b } = await sb
    .from('bookings')
    .select('id, week_id, customer_name, contact, status, created_at, updated_at, booking_items(id, fruit_id, qty, unit_snapshot, price_snapshot, pricing_mode_snapshot, name_snapshot), admin:created_by(name)')
    .eq('id', params.id)
    .maybeSingle();
  if (!b) notFound();

  // Is there a linked receipt?
  const { data: receipt } = await sb.from('receipts').select('id, status').eq('booking_id', b.id).maybeSingle();

  if (searchParams.edit === '1' && b.status === 'pending') {
    const { BookingForm } = await import('../BookingForm');
    const { getFruitOptions } = await import('@/lib/stock-options');
    const fruits = await getFruitOptions(b.week_id, b.id);
    const items = ((b as any).booking_items ?? []).map((i: any) => ({ fruit_id: i.fruit_id, qty: Number(i.qty) }));
    return (
      <div>
        <Link href={`/admin/bookings/${b.id}`} className="text-brand text-sm">← ย้อนกลับ</Link>
        <h1 className="text-2xl font-bold mb-3">แก้ไขการจอง</h1>
        <BookingForm bookingId={b.id} fruits={fruits} initial={{ customer_name: b.customer_name, contact: b.contact, items }} />
      </div>
    );
  }

  const items = ((b as any).booking_items ?? []) as Array<any>;
  const hasPerWeight = items.some((i) => i.pricing_mode_snapshot === 'per_weight');
  const total = items.reduce((s, i) => s + Number(i.qty) * Number(i.price_snapshot), 0);

  return (
    <div className="max-w-2xl">
      <Link href="/admin/bookings" className="text-brand text-sm">← รายการจอง</Link>
      <div className="bg-white rounded-lg shadow-sm p-4 mt-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{b.customer_name}</h1>
          <span className="text-sm text-muted">{b.status}</span>
        </div>
        <p className="text-muted">{b.contact}</p>

        <div className="mt-3 divide-y">
          {items.map((i) => (
            <div key={i.id} className="py-2 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{i.name_snapshot}</div>
                <div className="text-xs text-muted">
                  {i.pricing_mode_snapshot === 'per_weight'
                    ? `${i.qty} ${i.unit_snapshot} · ${i.price_snapshot} บาท/กก (คิดตามน้ำหนัก)`
                    : `${i.qty} × ${i.price_snapshot} บาท`}
                </div>
              </div>
              <div className="font-bold">
                {i.pricing_mode_snapshot === 'per_weight' ? '—' : (Number(i.qty) * Number(i.price_snapshot)).toLocaleString() + ' ฿'}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <span className="text-muted">รวม</span>
          <span className="text-xl font-bold">{hasPerWeight ? 'คิดตามน้ำหนัก' : total.toLocaleString() + ' บาท'}</span>
        </div>

        {(b as any).admin?.name && (
          <p className="text-xs text-muted mt-2">สร้างโดย {(b as any).admin.name} · {new Date(b.created_at).toLocaleString('th-TH')}</p>
        )}
      </div>

      <BookingActions bookingId={b.id} status={b.status} receiptId={receipt?.id ?? null} receiptStatus={receipt?.status ?? null} />
    </div>
  );
}
