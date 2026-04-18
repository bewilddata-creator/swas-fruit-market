import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;
  const { cancel_pending } = await req.json().catch(() => ({}));
  const sb = supabaseAdmin();

  const { data: current } = await sb.from('weeks').select('id').eq('is_active', true).maybeSingle();
  if (current) {
    if (cancel_pending) {
      await sb.from('bookings').update({ status: 'cancelled' }).eq('week_id', current.id).eq('status', 'pending');
    }
    await sb.from('weeks').update({ is_active: false, closed_at: new Date().toISOString() }).eq('id', current.id);
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: newWeek, error } = await sb.from('weeks').insert({ start_date: today, is_active: true }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: newWeek.id });
}
