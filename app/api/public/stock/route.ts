import { NextResponse } from 'next/server';
import { getPublicStock } from '@/lib/public-stock';

export const revalidate = 0;

export async function GET() {
  const data = await getPublicStock();
  const slim = {
    week_id: data.week_id,
    week_start: data.week_start,
    updated_at: data.updated_at,
    items: data.items.map((i) => ({
      fruit_id: i.fruit_id,
      available: i.available,
      booked: i.booked,
    })),
  };
  return NextResponse.json(slim, {
    headers: {
      'Cache-Control': 'public, max-age=5, stale-while-revalidate=15',
    },
  });
}
