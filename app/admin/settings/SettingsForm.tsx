'use client';

import { useState } from 'react';

export function SettingsForm({ initial }: { initial: { shop_name: string; line_chat_url: string } }) {
  const [shopName, setShopName] = useState(initial.shop_name);
  const [lineUrl, setLineUrl] = useState(initial.line_chat_url);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shop_name: shopName, line_chat_url: lineUrl }),
    });
    setBusy(false);
    setMsg(r.ok ? 'บันทึกแล้ว' : 'บันทึกไม่สำเร็จ');
  }

  return (
    <form onSubmit={save} className="space-y-4 bg-white rounded-lg p-5 shadow-sm">
      <label className="block">
        <span className="text-sm text-muted">ชื่อร้าน</span>
        <input value={shopName} onChange={(e) => setShopName(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-sm text-muted">ลิงก์ LINE แชท</span>
        <input value={lineUrl} onChange={(e) => setLineUrl(e.target.value)} placeholder="https://line.me/..." className="mt-1 w-full border rounded px-3 py-2" />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={busy} className="bg-brand text-white rounded px-4 py-2 disabled:opacity-60">บันทึก</button>
        {msg && <span className="text-sm text-muted">{msg}</span>}
      </div>
    </form>
  );
}
