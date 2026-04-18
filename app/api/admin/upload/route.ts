import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'no file' }, { status: 400 });

  const sb = supabaseAdmin();
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await sb.storage.from('fruit-images').upload(key, buf, {
    contentType: 'image/webp',
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data } = sb.storage.from('fruit-images').getPublicUrl(key);
  return NextResponse.json({ url: data.publicUrl });
}
