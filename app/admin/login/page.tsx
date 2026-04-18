import { LoginForm } from './LoginForm';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  let names: string[] = [];
  try {
    const sb = supabaseAdmin();
    const { data } = await sb
      .from('admin_users')
      .select('name')
      .is('deleted_at', null)
      .order('name');
    names = (data ?? []).map((r) => r.name as string);
  } catch {
    /* env not set yet */
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-surface">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold mb-4">เข้าสู่ระบบ</h1>
        <LoginForm names={names} />
      </div>
    </main>
  );
}
