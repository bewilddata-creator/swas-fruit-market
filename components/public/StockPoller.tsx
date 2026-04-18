'use client';

import { useEffect, useRef, useState } from 'react';

type PollResp = {
  week_id: string | null;
  updated_at: string;
  items: Array<{ fruit_id: string; available: number; booked: number }>;
};

export function StockPoller({ initialUpdatedAt }: { initialUpdatedAt: string }) {
  const [updatedAt, setUpdatedAt] = useState<string>(initialUpdatedAt);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch('/api/public/stock', { cache: 'no-store' });
        if (!r.ok) return;
        const data: PollResp = await r.json();
        if (cancelled) return;

        for (const item of data.items) {
          const card = document.querySelector<HTMLElement>(`[data-fruit-id="${item.fruit_id}"]`);
          if (!card) continue;
          const avEl = card.querySelector<HTMLElement>('[data-available]');
          const bkEl = card.querySelector<HTMLElement>('[data-booked]');
          if (avEl) avEl.textContent = String(item.available);
          if (bkEl) bkEl.textContent = String(item.booked);
          if (item.available <= 0) card.classList.add('opacity-60');
          else card.classList.remove('opacity-60');
        }
        setUpdatedAt(data.updated_at);
      } catch {
        /* silently retry next tick */
      }
    };

    const start = () => {
      if (timerRef.current != null) return;
      timerRef.current = window.setInterval(tick, 20_000);
    };
    const stop = () => {
      if (timerRef.current != null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const onVis = () => {
      if (document.hidden) stop();
      else {
        tick();
        start();
      }
    };

    start();
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const time = new Date(updatedAt).toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
  });

  return <span>อัปเดตล่าสุด {time}</span>;
}
