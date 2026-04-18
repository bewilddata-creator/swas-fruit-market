import { supabaseAdmin } from '@/lib/supabase';
import { SettingsForm } from './SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const sb = supabaseAdmin();
  const { data } = await sb.from('settings').select('key, value');
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value ?? '']));
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-4">ตั้งค่า</h1>
      <SettingsForm initial={{ shop_name: map.shop_name ?? '', line_chat_url: map.line_chat_url ?? '' }} />
    </div>
  );
}
