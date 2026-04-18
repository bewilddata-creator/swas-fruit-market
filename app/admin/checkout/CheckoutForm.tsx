'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Fruit = {
  id: string;
  name_th: string;
  selling_unit: string;
  stock_unit: string;
  pricing_mode: 'per_unit' | 'per_weight';
  price_value: number;
  available: number;
};

type Line = { fruit_id: string; qty: number; weight_kg?: number };

type BookingShape = {
  id: string;
  customer_name: string;
  contact: string;
  status: string;
  booking_items: Array<{ fruit_id: string; qty: number; name_snapshot: string; price_snapshot: number; pricing_mode_snapshot: 'per_unit' | 'per_weight'; unit_snapshot: string }>;
};

export function CheckoutForm({ fruits, booking }: { fruits: Fruit[]; booking: BookingShape | null }) {
  const router = useRouter();
  const [name, setName] = useState(booking?.customer_name ?? '');
  const [lines, setLines] = useState<Line[]>(
    booking
      ? booking.booking_items.map((i) => ({ fruit_id: i.fruit_id, qty: Number(i.qty) }))
      : fruits[0] ? [{ fruit_id: fruits[0].id, qty: 1 }] : []
  );
  const [deductStock, setDeductStock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function fruitFor(id: string) { return fruits.find((f) => f.id === id); }
  function update(i: number, p: Partial<Line>) { setLines((l) => l.map((v, idx) => idx === i ? { ...v, ...p } : v)); }
  function add() { if (fruits[0]) setLines((l) => [...l, { fruit_id: fruits[0].id, qty: 1 }]); }
  function remove(i: number) { setLines((l) => l.filter((_, idx) => idx !== i)); }

  function lineTotal(l: Line): number {
    const f = fruitFor(l.fruit_id);
    if (!f) return 0;
    if (f.pricing_mode === 'per_weight') {
      const w = Number(l.weight_kg ?? 0);
      return w * Number(f.price_value);
    }
    return Number(l.qty) * Number(f.price_value);
  }
  const total = lines.reduce((s, l) => s + lineTotal(l), 0);

  async function save() {
    setBusy(true); setErr(null);
    const payload = {
      customer_name: name,
      booking_id: booking?.id ?? null,
      deducted_stock: booking ? undefined : deductStock,
      items: lines.map((l) => {
        const f = fruitFor(l.fruit_id)!;
        return {
          fruit_id: l.fruit_id,
          qty: Number(l.qty),
          weight_kg: f.pricing_mode === 'per_weight' ? Number(l.weight_kg ?? 0) : null,
          price_snapshot: Number(f.price_value),
          name_snapshot: f.name_th,
          unit_snapshot: f.selling_unit,
          pricing_mode_snapshot: f.pricing_mode,
          stock_unit_snapshot: f.stock_unit,
          line_total: lineTotal(l),
        };
      }),
      total,
    };
    const r = await fetch('/api/admin/receipts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(d.error ?? 'บันทึกไม่สำเร็จ'); return; }
    router.push(`/admin/receipts/${d.id}`);
    router.refresh();
  }

  if (fruits.length === 0) return <p className="text-muted">ยังไม่ได้กำหนดสต็อกสัปดาห์นี้</p>;

  return (
    <div className="space-y-3 max-w-2xl">
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
        <label className="block">
          <span className="text-sm text-muted">ชื่อลูกค้า</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
        </label>
        {booking && (
          <p className="text-sm text-brand">📎 เชื่อมกับการจอง — บันทึกแล้วจะตั้งสถานะเป็น "ส่งแล้ว" อัตโนมัติ</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
        {lines.map((l, i) => {
          const f = fruitFor(l.fruit_id);
          return (
            <div key={i} className="space-y-1">
              <div className="flex items-end gap-2">
                <label className="flex-1 min-w-0">
                  <span className="text-xs text-muted">ผลไม้</span>
                  <select value={l.fruit_id} onChange={(e) => update(i, { fruit_id: e.target.value })} className="mt-1 w-full border rounded px-2 py-2">
                    {fruits.map((f) => <option key={f.id} value={f.id}>{f.name_th}</option>)}
                  </select>
                </label>
                <label className="w-20">
                  <span className="text-xs text-muted">จำนวน</span>
                  <input type="number" min={0} step="0.01" value={l.qty} onChange={(e) => update(i, { qty: Number(e.target.value) })} className="mt-1 w-full border rounded px-2 py-2" />
                </label>
                {f?.pricing_mode === 'per_weight' && (
                  <label className="w-24">
                    <span className="text-xs text-muted">น้ำหนัก (กก.)</span>
                    <input type="number" min={0} step="0.01" value={l.weight_kg ?? ''} onChange={(e) => update(i, { weight_kg: Number(e.target.value) })} className="mt-1 w-full border rounded px-2 py-2" />
                  </label>
                )}
                <button onClick={() => remove(i)} className="text-danger pb-2">✕</button>
              </div>
              <div className="text-xs text-muted text-right">= {lineTotal(l).toLocaleString()} บาท</div>
            </div>
          );
        })}
        <button onClick={add} className="text-brand text-sm">+ เพิ่มรายการ</button>
      </div>

      {!booking && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={deductStock} onChange={(e) => setDeductStock(e.target.checked)} />
          หักสต็อก
        </label>
      )}

      <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-muted">รวม</div>
          <div className="text-2xl font-bold">{total.toLocaleString()} บาท</div>
        </div>
        <button onClick={save} disabled={busy || !name || lines.length === 0} className="bg-brand text-white px-5 py-2 rounded disabled:opacity-60">
          {busy ? 'กำลังบันทึก...' : 'สร้างใบเสร็จ'}
        </button>
      </div>
      {err && <p className="text-danger text-sm">{err}</p>}
    </div>
  );
}
