import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { requireAdmin } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const body = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(','));
  return headers.join(',') + '\n' + body.join('\n');
}

const BOM = '\uFEFF';

async function weekCsvs(sb: ReturnType<typeof supabaseAdmin>, weekId: string, startDate: string) {
  const [{ data: stock }, { data: bookings }, { data: receipts }] = await Promise.all([
    sb.from('week_stock').select('stock_qty, price_value, fruit:fruit_id(name_th, stock_unit, selling_unit, pricing_mode)').eq('week_id', weekId),
    sb.from('bookings').select('customer_name, contact, status, created_at, updated_at, admin:created_by(name), booking_items(qty, name_snapshot, price_snapshot, unit_snapshot, pricing_mode_snapshot)').eq('week_id', weekId).order('created_at'),
    sb.from('receipts').select('customer_name, items_json, total, booking_id, status, created_at, admin:created_by(name)').eq('week_id', weekId).order('created_at'),
  ]);

  const stockRows = (stock ?? []).map((s: any) => ({
    fruit: s.fruit?.name_th,
    stock_qty: s.stock_qty,
    price: s.price_value,
    stock_unit: s.fruit?.stock_unit,
    selling_unit: s.fruit?.selling_unit,
    pricing_mode: s.fruit?.pricing_mode,
  }));

  const bookingRows: any[] = [];
  for (const b of bookings ?? []) {
    for (const it of ((b as any).booking_items ?? [])) {
      bookingRows.push({
        customer: b.customer_name,
        contact: b.contact,
        fruit: it.name_snapshot,
        qty: it.qty,
        unit: it.unit_snapshot,
        price: it.price_snapshot,
        pricing_mode: it.pricing_mode_snapshot,
        status: b.status,
        created_at: b.created_at,
        updated_at: b.updated_at,
        created_by: (b as any).admin?.name ?? '',
      });
    }
  }

  const receiptRows: any[] = [];
  for (const r of receipts ?? []) {
    const items = ((r as any).items_json ?? []) as Array<any>;
    const summary = items.map((i) => `${i.name_snapshot} ${i.qty}`).join('; ');
    receiptRows.push({
      customer: r.customer_name,
      items: summary,
      total: r.total,
      booking_id: r.booking_id ?? '',
      status: r.status,
      created_at: r.created_at,
      created_by: (r as any).admin?.name ?? '',
    });
  }

  return {
    [`${startDate}/stock.csv`]: BOM + toCsv(stockRows),
    [`${startDate}/bookings.csv`]: BOM + toCsv(bookingRows),
    [`${startDate}/receipts.csv`]: BOM + toCsv(receiptRows),
  };
}

export async function GET(req: Request) {
  const g = await requireAdmin();
  if (!g.ok) return g.response;
  const url = new URL(req.url);
  const wk = url.searchParams.get('week');
  const sb = supabaseAdmin();

  let weekQ = sb.from('weeks').select('id, start_date, is_active');
  weekQ = wk ? weekQ.eq('id', wk) : weekQ.eq('is_active', false);
  const { data: weeks } = await weekQ.order('start_date', { ascending: false });
  if (!weeks || weeks.length === 0) return NextResponse.json({ error: 'no weeks' }, { status: 404 });

  const zip = new JSZip();
  for (const w of weeks) {
    const files = await weekCsvs(sb, w.id, w.start_date);
    for (const [name, content] of Object.entries(files)) zip.file(name, content);
  }
  const buf = await zip.generateAsync({ type: 'uint8array' });
  return new NextResponse(Buffer.from(buf), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="swas-history${wk ? '-' + wk : ''}.zip"`,
    },
  });
}
