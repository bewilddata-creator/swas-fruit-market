import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireOwner } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await requireOwner();
  if (!g.ok) return g.response;
  const { password } = await req.json().catch(() => ({}));
  if (!password) return NextResponse.json({ error: 'missing password' }, { status: 400 });
  const sb = supabaseAdmin();
  const { data: cur } = await sb.from('admin_users').select('session_version').eq('id', params.id).maybeSingle();
  if (!cur) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const { error } = await sb.from('admin_users').update({
    password_hash: bcrypt.hashSync(password, 10),
    session_version: (cur.session_version ?? 1) + 1,
  }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const g = await requireOwner();
  if (!g.ok) return g.response;
  const sb = supabaseAdmin();
  const { data: u } = await sb.from('admin_users').select('role').eq('id', params.id).maybeSingle();
  if (!u) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (u.role === 'owner') return NextResponse.json({ error: 'ลบ owner ไม่ได้' }, { status: 400 });
  const { error } = await sb.from('admin_users').update({
    deleted_at: new Date().toISOString(),
    session_version: 999999,
  }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
