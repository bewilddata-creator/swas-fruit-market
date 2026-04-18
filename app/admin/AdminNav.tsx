'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/admin/stock', label: 'สต็อก', icon: '📊' },
  { href: '/admin/bookings', label: 'จอง', icon: '📝' },
  { href: '/admin/checkout', label: 'คิดเงิน', icon: '💰' },
  { href: '/admin/history', label: 'ประวัติ', icon: '📅' },
];

export function AdminNav() {
  const p = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t z-20">
      <ul className="max-w-5xl mx-auto grid grid-cols-4">
        {tabs.map((t) => {
          const active = p === t.href || p.startsWith(t.href + '/');
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex flex-col items-center py-2 text-xs ${active ? 'text-brand font-bold' : 'text-muted'}`}
              >
                <span className="text-xl leading-none">{t.icon}</span>
                <span className="mt-0.5">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
