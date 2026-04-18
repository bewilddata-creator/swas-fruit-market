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
      className={`flex items-stretch gap-3 rounded-card bg-white shadow-sm overflow-hidden transition active:scale-[.995] ${soldOut ? 'opacity-60' : ''}`}
    >
      <div className="relative w-28 h-28 md:w-32 md:h-32 bg-brand-light shrink-0">
        {fruit.image_url ? (
          <Image
            src={fruit.image_url}
            alt={fruit.name_th}
            fill
            sizes="(max-width: 768px) 112px, 128px"
            className="object-cover"
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-brand text-3xl">🍎</div>
        )}
        {soldOut && (
          <div className="absolute top-1 right-1 bg-danger text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
            หมด
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 py-2 pr-3 flex flex-col justify-center">
        <h3 className="font-bold text-[20px] md:text-[22px] leading-tight text-ink truncate">
          {fruit.name_th}
        </h3>
        <p className="mt-0.5 text-[16px] md:text-[18px] font-bold text-brand">
          {formatPrice(price_value, fruit.pricing_mode, fruit.selling_unit, fruit.stock_unit)}
        </p>
        <p className="mt-0.5 text-[14px] md:text-[15px] text-muted" data-stock-line>
          เหลือ <span data-available className="font-bold text-ink">{available}</span> {fruit.stock_unit}
          <span className="mx-2 text-gray-300">·</span>
          จองแล้ว <span data-booked className="text-ink">{booked}</span>
        </p>
      </div>
    </Link>
  );
}
