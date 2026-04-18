import { supabaseAdmin } from '@/lib/supabase';
import { CatalogueEditor } from './CatalogueEditor';

export const dynamic = 'force-dynamic';

export default async function CataloguePage() {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('fruits')
    .select('id, name_th, selling_unit, stock_unit, pricing_mode, description, image_url')
    .is('deleted_at', null)
    .order('name_th');
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">คลังผลไม้</h1>
      <CatalogueEditor initial={(data ?? []) as any} />
    </div>
  );
}
