'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function StartWeekButton({ large }: { large?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!confirm('สัปดาห์นี้จะถูกปิด ข้อมูลจะเก็บไว้ในประวัติ — ยืนยัน?')) return;
    const cancel = confirm('ยกเลิกรายการจองที่ค้างอยู่หรือไม่? (ตกลง = ยกเลิก, ยกเลิก = เก็บไว้)');
    setBusy(true);
    const r = await fetch('/api/admin/week', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cancel_pending: cancel }),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      alert(d.error ?? 'ไม่สำเร็จ');
      return;
    }
    router.refresh();
  }

  return (
    <button onClick={start} disabled={busy} className={`bg-brand text-white rounded ${large ? 'text-lg px-6 py-3' : 'px-4 py-2'} disabled:opacity-60`}>
      {busy ? 'กำลังเริ่ม...' : 'เริ่มสัปดาห์ใหม่'}
    </button>
  );
}
