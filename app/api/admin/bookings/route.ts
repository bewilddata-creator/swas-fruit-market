import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;
  const { customer_name, contact, items } = await req.json().catch(() => ({}));
  if (!customer_name || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 });
  }
  const sb = supabaseAdmin();
  const { data: week } = await sb.from('weeks').select('id').eq('is_active', true).maybeSingle();
  if (!week) return NextResponse.json({ error: 'ไม่มีสัปดาห์ที่เปิดขาย' }, { status: 400 });

  // retry once on serialization/lock conflict
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await sb.rpc('save_booking', {
      p_booking_id: null,
      p_week_id: week.id,
      p_customer_name: customer_name,
      p_contact: contact ?? '',
      p_items: items,
      p_created_by: g.session.admin_id,
    });
    if (!error) return NextResponse.json({ id: data });
    const msg = error.message || '';
    if (attempt === 1 || !msg.match(/deadlock|could not serialize/i)) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }
  return NextResponse.json({ error: 'ลองอีกครั้ง' }, { status: 500 });
}
