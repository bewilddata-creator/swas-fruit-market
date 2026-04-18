import Image from 'next/image';
import Link from 'next/link';
import type { PublicStockItem } from '@/lib/types';
import { formatPrice } from '@/lib/format';

export function FruitCard({ item, priority }: { item: PublicStockItem; priority?: boolean }) {
  const { fruit, available, booked, price_value } = item;
  const soldOut = available <= 0;

  return (
    <Link
      href={`/fruit/${fruit.id}`}
      data-fruit-id={fruit.id}
      className={`block rounded-card bg-white shadow-sm overflow-hidden transition active:scale-[.99] ${soldOut ? 'opacity-60' : ''}`}
    >
      <div className="relative aspect-square bg-brand-light">
        {fruit.image_url ? (
          <Image
            src={fruit.image_url}
            alt={fruit.name_th}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover"
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-brand">🍎</div>
        )}
        {soldOut && (
          <div className="absolute top-2 right-2 bg-danger text-white text-sm font-bold px-2 py-1 rounded">
            หมดแล้ว
          </div>
        )}
      </div>
      <div className="p-3 md:p-4">
        <h3 className="font-bold text-[22px] md:text-[24px] leading-tight text-ink">{fruit.name_th}</h3>
        <p className="mt-1 text-[18px] md:text-[22px] font-bold text-brand">
          {formatPrice(price_value, fruit.pricing_mode, fruit.selling_unit, fruit.stock_unit)}
        </p>
        <p className="mt-2 text-[16px] md:text-[18px] text-muted" data-stock-line>
          เหลือ <span data-available>{available}</span> {fruit.stock_unit} ·{' '}
          จองแล้ว <span data-booked>{booked}</span> {fruit.stock_unit}
        </p>
      </div>
    </Link>
  );
}
