import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';
import { createSessionJwt, SESSION_COOKIE } from '@/lib/auth';

type Attempt = { count: number; firstAt: number };
const attempts = new Map<string, Attempt>();
const LIMIT = 5;
const WINDOW_MS = 15 * 60 * 1000;

function keyFor(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') ?? '';
  return fwd.split(',')[0]?.trim() || 'unknown';
}

function recordFailure(ip: string): boolean {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || now - a.firstAt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAt: now });
    return false;
  }
  a.count += 1;
  return a.count > LIMIT;
}

function isBlocked(ip: string): boolean {
  const a = attempts.get(ip);
  if (!a) return false;
  if (Date.now() - a.firstAt > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return a.count > LIMIT;
}

export async function POST(req: Request) {
  const ip = keyFor(req);
  if (isBlocked(ip)) {
    return NextResponse.json({ error: 'ลองพยายามเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที' }, { status: 429 });
  }

  const { name, password } = await req.json().catch(() => ({}));
  if (!name || !password) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อและรหัสผ่าน' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: user } = await sb
    .from('admin_users')
    .select('id, name, password_hash, role, session_version, deleted_at')
    .eq('name', name)
    .is('deleted_at', null)
    .maybeSingle();

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    recordFailure(ip);
    return NextResponse.json({ error: 'ชื่อหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
  }

  await sb.from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);

  const token = await createSessionJwt({
    admin_id: user.id,
    name: user.name,
    role: user.role,
    session_version: user.session_version,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
