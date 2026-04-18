import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { ReceiptCard } from './ReceiptCard';

export const dynamic = 'force-dynamic';

export default async function ReceiptView({ params }: { params: { id: string } }) {
  const sb = supabaseAdmin();
  const { data: rec } = await sb
    .from('receipts')
    .select('id, booking_id, customer_name, items_json, total, status, created_at')
    .eq('id', params.id)
    .maybeSingle();
  if (!rec) notFound();

  const { data: shop } = await sb.from('settings').select('value').eq('key', 'shop_name').maybeSingle();
  const shopName = (shop?.value as string) || 'สวนผลไม้';

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/bookings" className="text-brand text-sm">← กลับ</Link>
        {rec.booking_id && (
          <Link href={`/admin/bookings/${rec.booking_id}`} className="text-brand text-sm">📎 การจอง</Link>
        )}
      </div>
      <ReceiptCard
        shopName={shopName}
        customerName={rec.customer_name}
        createdAt={rec.created_at}
        items={(rec.items_json ?? []) as any}
        total={Number(rec.total)}
        voided={rec.status === 'void'}
      />
    </div>
  );
}
