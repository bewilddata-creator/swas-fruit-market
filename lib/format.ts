import { formatInTimeZone } from 'date-fns-tz';

const TZ = 'Asia/Bangkok';

export function formatThaiDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const gregorianYear = Number(formatInTimeZone(d, TZ, 'yyyy'));
  const be = gregorianYear + 543;
  const dayMonth = formatInTimeZone(d, TZ, 'd MMM');
  return `${dayMonth} ${be}`;
}

export function formatTimeBangkok(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return formatInTimeZone(d, TZ, 'HH:mm');
}

export function formatPrice(value: number, mode: 'per_unit' | 'per_weight', sellingUnit: string, stockUnit: string): string {
  if (mode === 'per_unit') {
    return `ราคา ${value} บาท / ${sellingUnit}`;
  }
  return `ราคา ${value} บาท / กก. · จองเป็น${stockUnit}`;
}
