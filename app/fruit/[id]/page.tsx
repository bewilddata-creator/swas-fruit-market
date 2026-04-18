import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicStock } from '@/lib/public-stock';
import { getSetting } from '@/lib/settings';
import { formatPrice } from '@/lib/format';
import { LineFooter } from '@/components/public/LineFooter';

export const revalidate = 30;

export default async function FruitDetail({ params }: { params: { id: string } }) {
  const [stock, lineUrl] = await Promise.all([getPublicStock(), getSetting('line_chat_url')]);
  const item = stock.items.find((i) => i.fruit_id === params.id);
  if (!item) return notFound();

  const { fruit, available, booked, price_value } = item;

  return (
    <main className="public-root min-h-screen pb-4">
      <div className="px-4 pt-4">
        <Link href="/" className="text-brand text-lg">← กลับ</Link>
      </div>

      <div className="relative aspect-square bg-brand-light mx-2 md:mx-auto md:max-w-2xl rounded-card overflow-hidden mt-4">
        {fruit.image_url ? (
          <Image src={fruit.image_url} alt={fruit.name_th} fill sizes="(max-width: 768px) 100vw, 600px" className="object-cover" priority />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-brand text-6xl">🍎</div>
        )}
      </div>

      <section className="px-4 md:max-w-2xl md:mx-auto mt-6">
        <h1 className="text-3xl font-bold text-ink">{fruit.name_th}</h1>
        <p className="text-[22px] font-bold text-brand mt-2">
          {formatPrice(price_value, fruit.pricing_mode, fruit.selling_unit, fruit.stock_unit)}
        </p>
        <p className="text-[18px] text-muted mt-3" data-stock-line data-fruit-id={fruit.id}>
          เหลือ <span data-available>{available}</span> {fruit.stock_unit} ·{' '}
          จองแล้ว <span data-booked>{booked}</span> {fruit.stock_unit}
        </p>
        {fruit.description && (
          <p className="text-[18px] text-ink leading-relaxed mt-6 whitespace-pre-wrap">
            {fruit.description}
          </p>
        )}
        {fruit.pricing_mode === 'per_weight' && (
          <p className="text-base text-warn mt-4">* ราคาจะคิดตามน้ำหนักจริงตอนชั่ง</p>
        )}
      </section>

      <LineFooter lineUrl={lineUrl} updatedAt={stock.updated_at} />
    </main>
  );
}
