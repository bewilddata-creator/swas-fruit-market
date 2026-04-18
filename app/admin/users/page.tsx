import { readSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { UsersPanel } from './UsersPanel';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const s = await readSession();
  if (!s || s.role !== 'owner') notFound();
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('admin_users')
    .select('id, name, role, created_at, last_login_at, deleted_at')
    .is('deleted_at', null)
    .order('created_at');
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">จัดการผู้ใช้</h1>
      <UsersPanel initial={(data ?? []) as any} />
    </div>
  );
}
