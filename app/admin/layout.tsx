import Link from 'next/link';
import { readSession } from '@/lib/auth';
import { AdminNav } from './AdminNav';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await readSession();
  // Login page has its own full-screen layout; skip nav there.
  return (
    <div className="min-h-screen bg-surface pb-24">
      {s && (
        <header className="bg-white border-b sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between text-sm">
            <Link href="/admin/stock" className="font-bold text-brand">สวนผลไม้ · แอดมิน</Link>
            <div className="flex items-center gap-3">
              <span className="text-muted hidden sm:inline">
                เข้าสู่ระบบเป็น: <b>{s.name}</b>
              </span>
              <Link href="/admin/catalogue" className="text-muted hover:text-brand" title="คลังผลไม้">📦</Link>
              <Link href="/admin/settings" className="text-muted hover:text-brand" title="ตั้งค่า">⚙️</Link>
              {s.role === 'owner' && (
                <Link href="/admin/users" className="text-muted hover:text-brand" title="ผู้ใช้">👥</Link>
              )}
              <form action="/api/admin/logout" method="post">
                <button className="text-danger">ออก</button>
              </form>
            </div>
          </div>
        </header>
      )}
      <main className="max-w-5xl mx-auto px-3 md:px-6 py-4">{children}</main>
      {s && <AdminNav />}
    </div>
  );
}
