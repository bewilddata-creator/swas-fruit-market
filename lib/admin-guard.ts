import { NextResponse } from 'next/server';
import { readSession, type SessionPayload } from './auth';
import { supabaseAdmin } from './supabase';

export async function requireAdmin(): Promise<
  { ok: true; session: SessionPayload } | { ok: false; response: NextResponse }
> {
  const s = await readSession();
  if (!s) return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  // Check session_version still matches
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('admin_users')
    .select('session_version, deleted_at')
    .eq('id', s.admin_id)
    .maybeSingle();
  if (!data || data.deleted_at || data.session_version !== s.session_version) {
    return { ok: false, response: NextResponse.json({ error: 'Session expired' }, { status: 401 }) };
  }
  return { ok: true, session: s };
}

export async function requireOwner() {
  const r = await requireAdmin();
  if (!r.ok) return r;
  if (r.session.role !== 'owner') {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return r;
}
