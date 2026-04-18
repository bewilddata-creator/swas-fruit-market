import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase';

function pickFields(body: any) {
  const out: Record<string, any> = {};
  for (const k of ['name_th', 'selling_unit', 'stock_unit', 'pricing_mode', 'description', 'image_url']) {
    if (k in body) out[k] = body[k];
  }
  return out;
}

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;
  const body = await req.json().catch(() => ({}));
  const fields = pickFields(body);
  if (!fields.name_th || !fields.selling_unit || !fields.stock_unit || !fields.pricing_mode) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb.from('fruits').insert(fields).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
