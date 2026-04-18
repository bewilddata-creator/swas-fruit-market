import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireOwner } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  const g = await requireOwner();
  if (!g.ok) return g.response;
  const { name, password } = await req.json().catch(() => ({}));
  if (!name || !password) return NextResponse.json({ error: 'missing fields' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: existing } = await sb.from('admin_users').select('id').ilike('name', String(name).replace(/[%_\\]/g, (c) => '\\' + c)).is('deleted_at', null).maybeSingle();
  if (existing) return NextResponse.json({ error: 'ชื่อนี้ถูกใช้แล้ว' }, { status: 409 });

  const hash = bcrypt.hashSync(password, 10);
  const { error } = await sb.from('admin_users').insert({
    name, password_hash: hash, role: 'admin', created_by: g.session.admin_id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
