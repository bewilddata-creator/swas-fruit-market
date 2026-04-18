'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function BookingActions({
  bookingId,
  status,
  receiptId,
  receiptStatus,
}: {
  bookingId: string;
  status: string;
  receiptId: string | null;
  receiptStatus: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(newStatus: 'shipped' | 'cancelled') {
    const msgs: Record<string, string> = {
      shipped: 'ยืนยันว่าส่งแล้ว (ไม่ออกบิล)?',
      cancelled: status === 'shipped'
        ? 'ใบเสร็จที่เชื่อมโยงจะถูกทำเป็นโมฆะ (void) แต่จะไม่ถูกลบ — ยืนยันยกเลิก?'
        : 'ยืนยันยกเลิก? สต็อกจะถูกคืน',
    };
    if (!confirm(msgs[newStatus])) return;
    setBusy(true);
    const r = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setBusy(false);
    if (!r.ok) { const d = await r.json().catch(() => ({})); alert(d.error ?? 'ไม่สำเร็จ'); return; }
    router.refresh();
  }

  if (status === 'cancelled') return null;

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {status === 'pending' && (
        <>
          <Link href={`/admin/bookings/${bookingId}?edit=1`} className="bg-white border rounded p-3 text-center font-bold">แก้ไข</Link>
          <Link href={`/admin/checkout?booking=${bookingId}`} className="bg-brand text-white rounded p-3 text-center font-bold">คิดเงิน</Link>
          <button onClick={() => setStatus('shipped')} disabled={busy} className="bg-white border rounded p-3 text-center font-bold disabled:opacity-60">ส่งแล้ว (ไม่ออกบิล)</button>
          <button onClick={() => setStatus('cancelled')} disabled={busy} className="bg-danger/10 text-danger rounded p-3 text-center font-bold disabled:opacity-60">ยกเลิก</button>
        </>
      )}
      {status === 'shipped' && (
        <>
          {receiptId && <Link href={`/admin/receipts/${receiptId}`} className="bg-white border rounded p-3 text-center font-bold col-span-2">ดูใบเสร็จ {receiptStatus === 'void' ? '(โมฆะ)' : ''}</Link>}
          <button onClick={() => setStatus('cancelled')} disabled={busy} className="bg-danger/10 text-danger rounded p-3 text-center font-bold disabled:opacity-60 col-span-2">ยกเลิก</button>
        </>
      )}
    </div>
  );
}
