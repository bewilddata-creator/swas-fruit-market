import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(req: Request) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;
  const body = await req.json().catch(() => ({}));
  const sb = supabaseAdmin();
  const updates: Array<{ key: string; value: string }> = [];
  if (typeof body.shop_name === 'string') updates.push({ key: 'shop_name', value: body.shop_name });
  if (typeof body.line_chat_url === 'string') updates.push({ key: 'line_chat_url', value: body.line_chat_url });
  if (updates.length === 0) return NextResponse.json({ ok: true });
  const { error } = await sb.from('settings').upsert(updates, { onConflict: 'key' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
