'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type User = { id: string; name: string; role: 'owner' | 'admin'; created_at: string; last_login_at: string | null };

export function UsersPanel({ initial }: { initial: User[] }) {
  const router = useRouter();
  const [users] = useState(initial);
  const [newName, setNewName] = useState('');
  const [newPw, setNewPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newName, password: newPw }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(d.error ?? 'สร้างบัญชีไม่สำเร็จ');
    setNewName(''); setNewPw('');
    router.refresh();
  }

  async function resetPw(id: string) {
    const pw = prompt('รหัสผ่านใหม่:');
    if (!pw) return;
    const r = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    if (!r.ok) alert('รีเซ็ตไม่สำเร็จ');
    else alert('รีเซ็ตรหัสผ่านแล้ว');
  }

  async function del(id: string, name: string) {
    if (!confirm(`ลบ "${name}"? ประวัติจะยังเก็บชื่อไว้`)) return;
    const r = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (!r.ok) alert('ลบไม่สำเร็จ');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="bg-white rounded-lg p-5 shadow-sm space-y-3">
        <h2 className="font-bold">สร้างบัญชีใหม่</h2>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ชื่อ" className="w-full border rounded px-3 py-2" required />
        <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="รหัสผ่าน" className="w-full border rounded px-3 py-2" required />
        {err && <p className="text-danger text-sm">{err}</p>}
        <button disabled={busy} className="bg-brand text-white px-4 py-2 rounded disabled:opacity-60">สร้าง</button>
      </form>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-muted">
            <tr>
              <th className="text-left px-3 py-2">ชื่อ</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-left px-3 py-2">เข้าล่าสุด</th>
              <th className="text-right px-3 py-2">การกระทำ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2 font-medium">{u.name}</td>
                <td className="px-3 py-2">
                  <span className={u.role === 'owner' ? 'bg-brand text-white px-2 py-0.5 rounded text-xs' : 'bg-gray-100 px-2 py-0.5 rounded text-xs'}>
                    {u.role}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('th-TH') : '—'}</td>
                <td className="px-3 py-2 text-right space-x-2">
                  <button onClick={() => resetPw(u.id)} className="text-brand">รีเซ็ต</button>
                  {u.role !== 'owner' && (
                    <button onClick={() => del(u.id, u.name)} className="text-danger">ลบ</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
