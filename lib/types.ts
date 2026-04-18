export type PricingMode = 'per_unit' | 'per_weight';

export interface Fruit {
  id: string;
  name_th: string;
  selling_unit: string;
  stock_unit: string;
  pricing_mode: PricingMode;
  description: string | null;
  image_url: string | null;
}

export interface PublicStockItem {
  fruit_id: string;
  fruit: Fruit;
  stock_qty: number;
  price_value: number;
  booked: number;
  available: number;
}

export interface PublicStockPayload {
  week_id: string | null;
  week_start: string | null;
  items: PublicStockItem[];
  updated_at: string;
}
