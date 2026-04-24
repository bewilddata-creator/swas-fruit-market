'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Fruit = {
  id: string;
  name_th: string;
  selling_unit: string;
  stock_unit: string;
  pricing_mode: 'per_unit' | 'per_weight';
  image_url: string | null;
};

type ActiveRow = {
  fruit: Fruit;
  stock_qty: number;
  price_value: number;
  booked: number;
  sold: number;
};

type RowState = { delta: string; price: string };
type AddDraft = { fruit_id: string; qty: string; price: string };

export function StockPanel({
  weekId,
  activeFruits,
  notAddedFruits,
}: {
  weekId: string;
  activeFruits: ActiveRow[];
  notAddedFruits: Fruit[];
}) {
  const router = useRouter();

  // Sync rows state with server data on every render/refresh
  const [rows, setRows] = useState<Record<string, RowState>>({});
  useEffect(() => {
    setRows((prev) => {
      const next: Record<string, RowState> = {};
      for (const a of activeFruits) {
        next[a.fruit.id] = prev[a.fruit.id] ?? { delta: '', price: String(a.price_value) };
      }
      return next;
    });
  }, [activeFruits]);

  const [addDrafts, setAddDrafts] = useState<AddDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function updateRow(fruitId: string, patch: Partial<RowState>) {
    setRows((r) => ({ ...r, [fruitId]: { ...(r[fruitId] ?? { delta: '', price: '0' }), ...patch } }));
  }

  function addDraftRow() {
    if (notAddedFruits.length === 0) return;
    const used = new Set(addDrafts.map((d) => d.fruit_id));
    const next = notAddedFruits.find((f) => !used.has(f.id));
    if (!next) return;
    setAddDrafts((d) => [...d, { fruit_id: next.id, qty: '', price: '' }]);
  }

  function updateDraft(i: number, patch: Partial<AddDraft>) {
    setAddDrafts((d) => d.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function removeDraft(i: number) {
    setAddDrafts((d) => d.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const updates = Object.entries(rows).map(([fruit_id, r]) => ({
      fruit_id,
      delta: Number(r.delta || 0),
      price: Number(r.price || 0),
    }));
    const adds = addDrafts
      .filter((d) => d.fruit_id && d.qty)
      .map((d) => ({ fruit_id: d.fruit_id, stock_qty: Number(d.qty), price: Number(d.price || 0) }));

    try {
      const r = await fetch('/api/admin/stock', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ week_id: weekId, updates, adds }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(d.error ?? 'บันทึกไม่สำเร็จ');
        return;
      }
      setMsg('บันทึกแล้ว');
      setAddDrafts([]);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function removeRow(fruitId: string, name: string) {
    if (!confirm(`เอา "${name}" ออกจากสัปดาห์นี้?`)) return;
    const r = await fetch('/api/admin/stock', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ week_id: weekId, fruit_id: fruitId }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      alert(d.error ?? 'เอาออกไม่สำเร็จ');
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6 relative">
      {busy && <div className="fixed inset-0 bg-black/5 z-30 pointer-events-none" aria-hidden />}

      {/* Desktop/tablet table */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted text-xs">
            <tr>
              <th className="text-left px-3 py-2">ผลไม้</th>
              <th className="text-right px-3 py-2">สต็อก</th>
              <th className="text-right px-3 py-2">จอง</th>
              <th className="text-right px-3 py-2">ขายแล้ว</th>
              <th className="text-right px-3 py-2">คงเหลือ</th>
              <th className="text-right px-3 py-2">ราคา</th>
              <th className="text-right px-3 py-2">+/- สต็อก</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {activeFruits.map((a) => {
              const r = rows[a.fruit.id] ?? { delta: '', price: String(a.price_value) };
              const remaining = a.stock_qty - a.booked - a.sold;
              return (
                <tr key={a.fruit.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{a.fruit.name_th}</div>
                    <div className="text-xs text-muted">{a.fruit.stock_unit}</div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{a.stock_qty}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-warn">{a.booked}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-brand">{a.sold}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-bold ${remaining <= 0 ? 'text-danger' : ''}`}>{remaining}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number" min={0} step="0.01"
                        value={r.price}
                        onChange={(e) => updateRow(a.fruit.id, { price: e.target.value })}
                        disabled={busy}
                        className="w-20 border rounded px-2 py-1 text-right disabled:bg-gray-50"
                      />
                      <span className="text-xs text-muted">/{a.fruit.selling_unit}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number" step="0.01"
                      placeholder="0"
                      value={r.delta}
                      onChange={(e) => updateRow(a.fruit.id, { delta: e.target.value })}
                      disabled={busy}
                      className="w-20 border rounded px-2 py-1 text-right disabled:bg-gray-50"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => removeRow(a.fruit.id, a.fruit.name_th)} disabled={busy} className="text-danger text-xs disabled:opacity-50">✕</button>
                  </td>
                </tr>
              );
            })}
            {activeFruits.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-muted">ยังไม่มีผลไม้ในสัปดาห์นี้ — เพิ่มด้านล่าง</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {activeFruits.map((a) => {
          const r = rows[a.fruit.id] ?? { delta: '', price: String(a.price_value) };
          const remaining = a.stock_qty - a.booked - a.sold;
          return (
            <div key={a.fruit.id} className="bg-white rounded-lg shadow-sm p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold">{a.fruit.name_th}</div>
                  <div className="text-xs text-muted">{a.fruit.stock_unit}</div>
                </div>
                <button onClick={() => removeRow(a.fruit.id, a.fruit.name_th)} disabled={busy} className="text-danger text-xs disabled:opacity-50">✕ เอาออก</button>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center text-xs">
                <div className="bg-surface rounded p-1"><div className="text-muted">สต็อก</div><div className="font-bold text-ink">{a.stock_qty}</div></div>
                <div className="bg-surface rounded p-1"><div className="text-muted">จอง</div><div className="font-bold text-warn">{a.booked}</div></div>
                <div className="bg-surface rounded p-1"><div className="text-muted">ขาย</div><div className="font-bold text-brand">{a.sold}</div></div>
                <div className={`rounded p-1 ${remaining <= 0 ? 'bg-danger/10' : 'bg-brand-light'}`}><div className="text-muted">เหลือ</div><div className={`font-bold ${remaining <= 0 ? 'text-danger' : 'text-brand'}`}>{remaining}</div></div>
              </div>
              <div className="flex gap-2">
                <label className="flex-1 text-xs">
                  <div className="text-muted mb-0.5">ราคา</div>
                  <input type="number" min={0} step="0.01" value={r.price} onChange={(e) => updateRow(a.fruit.id, { price: e.target.value })} disabled={busy} className="w-full border rounded px-2 py-1.5 disabled:bg-gray-50" />
                </label>
                <label className="flex-1 text-xs">
                  <div className="text-muted mb-0.5">+/- สต็อก</div>
                  <input type="number" step="0.01" placeholder="0" value={r.delta} onChange={(e) => updateRow(a.fruit.id, { delta: e.target.value })} disabled={busy} className="w-full border rounded px-2 py-1.5 disabled:bg-gray-50" />
                </label>
              </div>
            </div>
          );
        })}
        {activeFruits.length === 0 && (
          <p className="text-center text-muted py-6">ยังไม่มีผลไม้ในสัปดาห์นี้</p>
        )}
      </div>

      {/* Add fruits */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">เพิ่มผลไม้เข้าสัปดาห์นี้</h2>
          <button onClick={addDraftRow} disabled={busy || notAddedFruits.length === 0 || addDrafts.length >= notAddedFruits.length} className="text-brand text-sm disabled:opacity-50">+ เพิ่มรายการ</button>
        </div>
        {notAddedFruits.length === 0 && <p className="text-muted text-sm">ทุกผลไม้ในคลังถูกเพิ่มแล้ว</p>}
        {addDrafts.length === 0 && notAddedFruits.length > 0 && (
          <p className="text-muted text-sm">กด "+ เพิ่มรายการ" เพื่อเพิ่มผลไม้</p>
        )}
        <div className="space-y-2">
          {addDrafts.map((d, i) => {
            const taken = new Set(addDrafts.filter((_, idx) => idx !== i).map((x) => x.fruit_id));
            const options = notAddedFruits.filter((f) => !taken.has(f.id));
            return (
              <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                <label className="block text-xs col-span-1">
                  <div className="text-muted mb-0.5">ผลไม้</div>
                  <select value={d.fruit_id} onChange={(e) => updateDraft(i, { fruit_id: e.target.value })} disabled={busy} className="w-full border rounded px-2 py-2 disabled:bg-gray-50">
                    {options.map((f) => <option key={f.id} value={f.id}>{f.name_th}</option>)}
                  </select>
                </label>
                <label className="block text-xs">
                  <div className="text-muted mb-0.5">สต็อกเริ่ม</div>
                  <input type="number" min={0} step="0.01" value={d.qty} onChange={(e) => updateDraft(i, { qty: e.target.value })} disabled={busy} className="w-20 sm:w-full border rounded px-2 py-2 disabled:bg-gray-50" />
                </label>
                <label className="block text-xs">
                  <div className="text-muted mb-0.5">ราคา</div>
                  <input type="number" min={0} step="0.01" value={d.price} onChange={(e) => updateDraft(i, { price: e.target.value })} disabled={busy} className="w-20 sm:w-full border rounded px-2 py-2 disabled:bg-gray-50" />
                </label>
                <button onClick={() => removeDraft(i)} disabled={busy} className="text-danger pb-2 disabled:opacity-50" aria-label="เอาออก">✕</button>
              </div>
            );
          })}
        </div>
        {addDrafts.length > 0 && <p className="text-xs text-muted mt-2">จะถูกบันทึกเมื่อกด "บันทึก"</p>}
      </div>

      {/* Save bar */}
      <div className="sticky bottom-16 bg-surface py-2 flex items-center gap-3 z-10">
        <button
          onClick={save}
          disabled={busy}
          aria-busy={busy}
          className="bg-brand text-white px-5 py-2 rounded disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {busy && <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          {busy ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
        {msg && <span className="text-sm text-muted">{msg}</span>}
      </div>
    </div>
  );
}
