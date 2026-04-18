import { supabasePublic } from './supabase';

export async function getSetting(key: string): Promise<string | null> {
  try {
    const sb = supabasePublic();
    const { data } = await sb.from('settings').select('value').eq('key', key).maybeSingle();
    return (data?.value as string) ?? null;
  } catch {
    return null;
  }
}
