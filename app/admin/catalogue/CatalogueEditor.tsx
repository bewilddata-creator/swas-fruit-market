'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { compressAndUpload } from '@/lib/upload-image';
import type { Fruit } from '@/lib/types';

type Draft = Partial<Fruit> & { id?: string };

export function CatalogueEditor({ initial }: { initial: Fruit[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Draft | null>(null);

  async function save(f: Draft) {
    const method = f.id ? 'PATCH' : 'POST';
    const url = f.id ? `/api/admin/fruits/${f.id}` : '/api/admin/fruits';
    const r = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(f),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      alert(d.error ?? 'บันทึกไม่สำเร็จ');
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function del(id: string) {
    if (!confirm('ลบผลไม้นี้? ประวัติจะยังเก็บข้อมูลไว้')) return;
    const r = await fetch(`/api/admin/fruits/${id}`, { method: 'DELETE' });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      alert(d.error ?? 'ลบไม่สำเร็จ');
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={() => setEditing({ pricing_mode: 'per_unit' })}
        className="bg-brand text-white rounded px-4 py-2 mb-4"
      >
        + เพิ่มผลไม้
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {initial.map((f) => (
          <div key={f.id} className="bg-white rounded-lg shadow-sm p-3 flex gap-3">
            <div className="w-20 h-20 bg-brand-light rounded relative overflow-hidden shrink-0">
              {f.image_url && <Image src={f.image_url} alt={f.name_th} fill className="object-cover" sizes="80px" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold truncate">{f.name_th}</h3>
              <p className="text-xs text-muted">หน่วยขาย: {f.selling_unit} · สต็อก: {f.stock_unit}</p>
              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${f.pricing_mode === 'per_weight' ? 'bg-warn/20 text-warn' : 'bg-brand-light text-brand'}`}>
                {f.pricing_mode === 'per_weight' ? 'ตามน้ำหนัก' : 'ต่อหน่วย'}
              </span>
              <div className="mt-2 space-x-2 text-sm">
                <button onClick={() => setEditing(f)} className="text-brand">แก้ไข</button>
                <button onClick={() => del(f.id)} className="text-danger">ลบ</button>
              </div>
            </div>
          </div>
        ))}
        {initial.length === 0 && <p className="text-muted col-span-full">ยังไม่มีผลไม้ในคลัง</p>}
      </div>

      {editing && <FruitEditor draft={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function FruitEditor({ draft, onCancel, onSave }: { draft: Draft; onCancel: () => void; onSave: (f: Draft) => void | Promise<void> }) {
  const [f, setF] = useState<Draft>(draft);
  const [uploading, setUploading] = useState(false);

  async function pickImage(file: File) {
    setUploading(true);
    try {
      const url = await compressAndUpload(file);
      setF((p) => ({ ...p, image_url: url }));
    } catch {
      alert('อัปโหลดภาพไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-30 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-5 w-full max-w-md space-y-3 max-h-[90vh] overflow-auto">
        <h2 className="font-bold text-lg">{f.id ? 'แก้ไขผลไม้' : 'เพิ่มผลไม้'}</h2>
        <label className="block">
          <span className="text-sm text-muted">ชื่อผลไม้</span>
          <input value={f.name_th ?? ''} onChange={(e) => setF({ ...f, name_th: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-muted">หน่วยขาย</span>
            <input value={f.selling_unit ?? ''} onChange={(e) => setF({ ...f, selling_unit: e.target.value })} placeholder="ลูก / กิโล" className="mt-1 w-full border rounded px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm text-muted">หน่วยสต็อก</span>
            <input value={f.stock_unit ?? ''} onChange={(e) => setF({ ...f, stock_unit: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-muted">วิธีคิดราคา</span>
          <select value={f.pricing_mode ?? 'per_unit'} onChange={(e) => setF({ ...f, pricing_mode: e.target.value as any })} className="mt-1 w-full border rounded px-3 py-2">
            <option value="per_unit">ราคาต่อหน่วยขาย</option>
            <option value="per_weight">คิดราคาตามน้ำหนักจริง</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-muted">รายละเอียด</span>
          <textarea value={f.description ?? ''} onChange={(e) => setF({ ...f, description: e.target.value })} className="mt-1 w-full border rounded px-3 py-2 h-20" />
        </label>
        <label className="block">
          <span className="text-sm text-muted">รูปภาพ</span>
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && pickImage(e.target.files[0])} className="mt-1 block" />
          {uploading && <span className="text-xs text-muted">กำลังอัปโหลด...</span>}
          {f.image_url && <img src={f.image_url} alt="" className="mt-2 h-24 rounded object-cover" />}
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="px-4 py-2 text-muted">ยกเลิก</button>
          <button onClick={() => onSave(f)} disabled={!f.name_th || !f.selling_unit || !f.stock_unit} className="bg-brand text-white px-4 py-2 rounded disabled:opacity-60">บันทึก</button>
        </div>
      </div>
    </div>
  );
}
