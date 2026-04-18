import { readSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function StockPlaceholder() {
  const s = await readSession();
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">สต็อกสัปดาห์นี้</h1>
      <p className="text-muted mt-2">
        สวัสดี {s?.name} ({s?.role}) — หน้านี้ยังอยู่ในระหว่างการพัฒนา (M3).
      </p>
      <form action="/api/admin/logout" method="post" className="mt-6">
        <button className="px-4 py-2 border rounded">ออกจากระบบ</button>
      </form>
    </main>
  );
}
