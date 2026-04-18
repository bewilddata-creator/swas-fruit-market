import { getPublicStock } from '@/lib/public-stock';
import { getSetting } from '@/lib/settings';
import { formatThaiDate } from '@/lib/format';
import { FruitCard } from '@/components/public/FruitCard';
import { LineFooter } from '@/components/public/LineFooter';

export const revalidate = 30;

export default async function HomePage() {
  const [stock, shopName, lineUrl] = await Promise.all([
    getPublicStock(),
    getSetting('shop_name'),
    getSetting('line_chat_url'),
  ]);

  const weekLabel = stock.week_start ? formatThaiDate(stock.week_start) : null;
  const midIndex = Math.floor(stock.items.length / 2);

  return (
    <main className="public-root min-h-screen pb-4">
      <header className="px-4 pt-6 pb-4 md:px-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-ink">{shopName ?? 'สวนผลไม้'}</h1>
          {weekLabel && (
            <p className="text-lg text-muted mt-1">ผลไม้สัปดาห์ที่ {weekLabel}</p>
          )}
        </div>
        <a
          href="/admin/login"
          className="shrink-0 text-sm text-muted hover:text-brand underline-offset-4 hover:underline mt-2"
        >
          เข้าสู่ระบบ
        </a>
      </header>

      {stock.items.length === 0 ? (
        <div className="px-4 py-16 text-center text-muted">
          <p className="text-xl">ยังไม่มีผลไม้เปิดขายสัปดาห์นี้</p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-2 md:px-4">
            {stock.items.slice(0, midIndex).map((item, i) => (
              <FruitCard key={item.fruit_id} item={item} priority={i < 4} />
            ))}
          </section>

          {stock.items.length > 4 && (
            <p className="text-center text-muted text-base my-6">
              ↓ เลื่อนลงเพื่อจองผ่าน LINE
            </p>
          )}

          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-2 md:px-4">
            {stock.items.slice(midIndex).map((item) => (
              <FruitCard key={item.fruit_id} item={item} />
            ))}
          </section>
        </>
      )}

      <LineFooter lineUrl={lineUrl} updatedAt={stock.updated_at} />
    </main>
  );
}
