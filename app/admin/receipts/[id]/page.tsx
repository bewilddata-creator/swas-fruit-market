import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { formatThaiDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ReceiptView({ params }: { params: { id: string } }) {
  const sb = supabaseAdmin();
  const { data: rec } = await sb
    .from('receipts')
    .select('id, booking_id, customer_name, items_json, total, status, created_at, created_by, admin:created_by(name)')
    .eq('id', params.id)
    .maybeSingle();
  if (!rec) notFound();

  const { data: shop } = await sb.from('settings').select('value').eq('key', 'shop_name').maybeSingle();
  const shopName = (shop?.value as string) || 'สวนผลไม้';
  const items = (rec.items_json ?? []) as Array<any>;

  return (
    <div className="max-w-md mx-auto">
      <Link href="/admin/bookings" className="text-brand text-sm">← กลับ</Link>
      {rec.booking_id && (
        <Link href={`/admin/bookings/${rec.booking_id}`} className="ml-3 text-brand text-sm">📎 การจอง</Link>
      )}

      <div className="relative mt-3 bg-white rounded-lg shadow p-5" id="receipt">
        {rec.status === 'void' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-danger text-5xl font-black rotate-[-20deg] opacity-50">โมฆะ (ยกเลิกแล้ว)</span>
          </div>
        )}
        <h1 className="text-xl font-bold text-center">{shopName}</h1>
        <p className="text-center text-sm text-muted">{formatThaiDate(rec.created_at)}</p>
        <p className="text-center text-sm text-muted">ลูกค้า: {rec.customer_name}</p>

        <div className="mt-4 divide-y">
          {items.map((i, idx) => {
            const isWeight = i.pricing_mode_snapshot === 'per_weight';
            const breakdown = isWeight
              ? `${i.qty} ${i.unit_snapshot} (${i.weight_kg ?? 0} กก.) × ${i.price_snapshot}฿/${i.stock_unit_snapshot ?? 'กก.'}`
              : `${i.qty} × ${i.price_snapshot}฿`;
            return (
              <div key={idx} className="py-2 flex justify-between text-sm">
                <div>
                  <div className="font-medium">{i.name_snapshot}</div>
                  <div className="text-xs text-muted">{breakdown}</div>
                </div>
                <div className="font-bold">{Number(i.line_total ?? 0).toLocaleString()}฿</div>
              </div>
            );
          })}
        </div>
        <div className="border-t mt-3 pt-3 flex justify-between font-bold text-lg">
          <span>รวม</span>
          <span>{Number(rec.total).toLocaleString()} บาท</span>
        </div>
        <p className="text-center text-muted mt-4">ขอบคุณครับ/ค่ะ</p>
      </div>

      <p className="text-center text-xs text-muted mt-3">ถ่ายภาพหน้าจอเพื่อส่งให้ลูกค้า</p>
    </div>
  );
}
