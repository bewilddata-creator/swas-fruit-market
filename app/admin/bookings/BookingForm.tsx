'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type FruitOpt = {
  id: string;
  name_th: string;
  selling_unit: string;
  stock_unit: string;
  pricing_mode: 'per_unit' | 'per_weight';
  price_value: number;
  available: number;
};

type Line = { fruit_id: string; qty: number };

export function BookingForm({
  bookingId,
  initial,
  fruits,
}: {
  bookingId?: string;
  initial?: { customer_name: string; contact: string; items: Line[] };
  fruits: FruitOpt[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.customer_name ?? '');
  const [contact, setContact] = useState(initial?.contact ?? '');
  const [lines, setLines] = useState<Line[]>(initial?.items ?? [{ fruit_id: fruits[0]?.id ?? '', qty: 1 }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function fruitFor(id: string) { return fruits.find((f) => f.id === id); }

  function addLine() { setLines((l) => [...l, { fruit_id: fruits[0]?.id ?? '', qty: 1 }]); }
  function removeLine(i: number) { setLines((l) => l.filter((_, idx) => idx !== i)); }
  function update(i: number, patch: Partial<Line>) { setLines((l) => l.map((v, idx) => (idx === i ? { ...v, ...patch } : v))); }

  const perUnitTotal = lines.reduce((s, l) => {
    const f = fruitFor(l.fruit_id);
    if (!f || f.pricing_mode === 'per_weight') return s;
    return s + Number(l.qty) * Number(f.price_value);
  }, 0);
  const anyPerWeight = lines.some((l) => fruitFor(l.fruit_id)?.pricing_mode === 'per_weight');

  async function save() {
    setBusy(true); setErr(null);
    const r = await fetch(bookingId ? `/api/admin/bookings/${bookingId}` : '/api/admin/bookings', {
      method: bookingId ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ customer_name: name, contact, items: lines }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(d.error ?? 'บันทึกไม่สำเร็จ'); return; }
    const targetId = d.id ?? bookingId;
    router.push(`/admin/bookings/${targetId}?from=pending`);
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
        <label className="block">
          <span className="text-sm text-muted">เบอร์โทร / LINE ID <span className="text-xs">(ไม่บังคับ)</span></span>
          <input value={contact} onChange={(e) => setContact(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
        </label>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
        <div className="font-bold">รายการผลไม้</div>
        {lines.map((l, i) => {
          const f = fruitFor(l.fruit_id);
          const isWeight = f?.pricing_mode === 'per_weight';
          const unitLabel = isWeight ? (f?.selling_unit ?? '') : (f?.stock_unit ?? '');
          return (
            <div key={i} className="border rounded-md p-2 bg-surface space-y-1">
              <div className="flex items-end gap-2">
                <label className="flex-1 min-w-0">
                  <span className="text-xs text-muted">ผลไม้</span>
                  <select value={l.fruit_id} onChange={(e) => update(i, { fruit_id: e.target.value })} className="mt-1 w-full border rounded px-2 py-2 bg-white">
                    {fruits.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name_th} · เหลือ {f.available} {f.stock_unit}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="w-28">
                  <span className="text-xs text-muted">จำนวน</span>
                  <div className="mt-1 flex items-stretch border rounded overflow-hidden bg-white">
                    <input type="number" min={0} step="0.01" value={l.qty} onChange={(e) => update(i, { qty: Number(e.target.value) })} className="w-full px-2 py-2 outline-none" />
                    <span className="px-2 py-2 text-xs text-muted bg-surface border-l">{unitLabel}</span>
                  </div>
                </label>
                <button onClick={() => removeLine(i)} className="text-danger pb-2" aria-label="ลบแถว">✕</button>
              </div>
              {isWeight && (
                <p className="text-[11px] text-warn pl-1">
                  คิดตามน้ำหนัก ({f?.price_value}฿/{f?.stock_unit}) — ราคาคำนวณตอนชั่งที่เช็คเอาต์
                </p>
              )}
            </div>
          );
        })}
        <button onClick={addLine} className="text-brand text-sm">+ เพิ่มผลไม้</button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-muted">รวม (เฉพาะรายการราคาต่อหน่วย)</div>
          <div className="text-xl font-bold">
            {perUnitTotal.toLocaleString()} บาท
            {anyPerWeight && <span className="text-sm font-normal text-warn ml-2">+ คิดตามน้ำหนักเพิ่ม</span>}
          </div>
        </div>
        <button onClick={save} disabled={busy || !name || lines.length === 0} className="bg-brand text-white px-5 py-2 rounded disabled:opacity-60">
          {busy ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>

      {err && <p className="text-danger text-sm">{err}</p>}
    </div>
  );
}
