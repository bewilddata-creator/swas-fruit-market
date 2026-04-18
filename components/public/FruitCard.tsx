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
      </div>

      <div className="flex-1 min-w-0 py-2 flex flex-col justify-center">
        <h3 className="font-bold text-[20px] md:text-[22px] leading-tight text-ink truncate">
          {fruit.name_th}
        </h3>
        <p className="mt-0.5 text-[15px] md:text-[17px] font-bold text-brand leading-tight">
          {formatPrice(price_value, fruit.pricing_mode, fruit.selling_unit, fruit.stock_unit)}
        </p>
        <p className="mt-0.5 text-[13px] text-muted" data-stock-line>
          จองแล้ว <span data-booked className="text-ink font-bold">{booked}</span> {fruit.stock_unit}
        </p>
      </div>

      <div className={`shrink-0 px-3 md:px-4 flex flex-col items-center justify-center text-center ${soldOut ? 'bg-danger/10' : 'bg-brand-light'}`}>
        {soldOut ? (
          <>
            <span className="text-danger font-black text-lg md:text-xl leading-none">หมดแล้ว</span>
          </>
        ) : (
          <>
            <span className="text-[11px] md:text-xs text-muted leading-none">เหลือ</span>
            <span data-available className="text-[32px] md:text-[40px] font-black text-brand leading-none mt-1">
              {available}
            </span>
            <span className="text-[12px] md:text-sm text-muted mt-1">{fruit.stock_unit}</span>
          </>
        )}
      </div>
    </Link>
  );
}
