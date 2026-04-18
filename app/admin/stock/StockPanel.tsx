'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Fruit = { id: string; name_th: string; selling_unit: string; stock_unit: string; pricing_mode: 'per_unit' | 'per_weight' };
type Row = { fruit_id: string; stock_qty: number; price_value: number; notes?: string | null };

export function StockPanel({ weekId, fruits, initialRows }: { weekId: string; fruits: Fruit[]; initialRows: Row[] }) {
  const router = useRouter();
  const initialMap = new Map(initialRows.map((r) => [r.fruit_id, r]));
  const [state, setState] = useState(
    fruits.map((f) => {
      const r = initialMap.get(f.id);
      return { fruit: f, included: !!r, stock_qty: r?.stock_qty ?? 0, price_value: r?.price_value ?? 0 };
    })
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function update(idx: number, patch: Partial<(typeof state)[number]>) {
    setState((s) => s.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const items = state.filter((r) => r.included).map((r) => ({
      fruit_id: r.fruit.id,
      stock_qty: Number(r.stock_qty),
      price_value: Number(r.price_value),
    }));
    const r = await fetch('/api/admin/stock', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ week_id: weekId, items }),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setMsg(d.error ?? 'บันทึกไม่สำเร็จ');
      return;
    }
    setMsg('บันทึกแล้ว');
    router.refresh();
  }

  if (fruits.length === 0) {
    return <p className="text-muted">ยังไม่มีผลไม้ในคลัง — ไปที่ <a className="text-brand underline" href="/admin/catalogue">คลังผลไม้</a> เพื่อเพิ่ม</p>;
  }

  return (
    <div className="space-y-2">
      {state.map((r, i) => (
        <div key={r.fruit.id} className="bg-white rounded-lg shadow-sm p-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="flex items-center gap-2 sm:w-56">
            <input type="checkbox" checked={r.included} onChange={(e) => update(i, { included: e.target.checked })} />
            <span className="font-medium">{r.fruit.name_th}</span>
          </label>
          <div className="flex items-center gap-2 text-sm flex-1">
            <input
              type="number"
              min={0}
              step="0.01"
              disabled={!r.included}
              value={r.stock_qty}
              onChange={(e) => update(i, { stock_qty: Number(e.target.value) })}
              className="w-24 border rounded px-2 py-1"
            />
            <span className="text-muted">{r.fruit.stock_unit}</span>
            <input
              type="number"
              min={0}
              step="0.01"
              disabled={!r.included}
              value={r.price_value}
              onChange={(e) => update(i, { price_value: Number(e.target.value) })}
              className="w-24 border rounded px-2 py-1"
            />
            <span className="text-muted">
              บาท/{r.fruit.pricing_mode === 'per_weight' ? r.fruit.stock_unit : r.fruit.selling_unit}
            </span>
          </div>
        </div>
      ))}
      <div className="sticky bottom-16 bg-surface py-2 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="bg-brand text-white px-5 py-2 rounded disabled:opacity-60">
          {busy ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
        {msg && <span className="text-sm text-muted">{msg}</span>}
      </div>
    </div>
  );
}
