'use client';

import { useRef, useState } from 'react';
import { formatThaiDate } from '@/lib/format';

type Item = {
  name_snapshot: string;
  qty: number;
  unit_snapshot: string;
  price_snapshot: number;
  pricing_mode_snapshot: 'per_unit' | 'per_weight';
  stock_unit_snapshot?: string;
  weight_kg?: number | null;
  line_total: number;
};

export function ReceiptCard({
  shopName,
  customerName,
  createdAt,
  items,
  total,
  voided,
}: {
  shopName: string;
  customerName: string;
  createdAt: string;
  items: Item[];
  total: number;
  voided: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function saveImage() {
    if (!ref.current) return;
    setBusy(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(ref.current, { pixelRatio: 2, backgroundColor: '#ffffff' });
      const filename = `receipt-${customerName}-${new Date(createdAt).toISOString().slice(0, 10)}.png`;

      // Try native share (iOS/Android) — surfaces "Save to Photos"
      if (navigator.canShare) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'ใบเสร็จ' });
          return;
        }
      }
      // Fallback: trigger download
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert('บันทึกรูปไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div ref={ref} className="relative bg-white rounded-lg shadow p-5">
        {voided && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className="text-danger text-5xl font-black rotate-[-20deg] opacity-50">โมฆะ (ยกเลิกแล้ว)</span>
          </div>
        )}
        <h1 className="text-xl font-bold text-center">{shopName}</h1>
        <p className="text-center text-sm text-muted">{formatThaiDate(createdAt)}</p>
        <p className="text-center text-sm text-muted">ลูกค้า: {customerName}</p>

        <div className="mt-4 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-2 text-[11px] text-muted border-b pb-1">
            <span>รายการ</span>
            <span className="text-right">จำนวน</span>
            <span className="text-right">หน่วย</span>
            <span className="text-right">ราคา/หน่วย</span>
            <span className="text-right">รวม</span>
          </div>
          {items.map((i, idx) => {
            const isWeight = i.pricing_mode_snapshot === 'per_weight';
            const priceUnit = isWeight ? (i.stock_unit_snapshot ?? 'กก.') : i.unit_snapshot;
            return (
              <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-2 py-1.5 text-sm border-b last:border-0 items-baseline">
                <div>
                  <div className="font-medium">{i.name_snapshot}</div>
                  {isWeight && (
                    <div className="text-[11px] text-muted">({i.weight_kg ?? 0} กก.)</div>
                  )}
                </div>
                <div className="text-right">{i.qty}</div>
                <div className="text-right text-muted">{i.unit_snapshot}</div>
                <div className="text-right">{Number(i.price_snapshot).toLocaleString()}/{priceUnit}</div>
                <div className="text-right font-bold">{Number(i.line_total ?? 0).toLocaleString()}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-2 border-t flex justify-between font-bold text-lg">
          <span>รวมทั้งหมด</span>
          <span>{Number(total).toLocaleString()} บาท</span>
        </div>
        <p className="text-center text-muted mt-3">ขอบคุณครับ/ค่ะ</p>
      </div>

      <div className="flex items-center justify-center gap-2 mt-3">
        <button
          onClick={saveImage}
          disabled={busy}
          className="bg-brand text-white rounded px-4 py-2 disabled:opacity-60"
        >
          {busy ? 'กำลังสร้าง...' : '📷 บันทึกรูป'}
        </button>
      </div>
      <p className="text-center text-xs text-muted mt-2">
        บนมือถือจะเปิดหน้าต่างแชร์ — กด "Save to Photos" / "บันทึกรูป"
      </p>
    </div>
  );
}
