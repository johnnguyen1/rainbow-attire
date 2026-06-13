import type { Order } from '@/lib/types';

/** Fulfillment CSV matching the legacy export: Style, Color, Logo, Size, Quantity, Attn, Loc code. */
export function ordersToCsv(orders: Order[]): string {
  const headers = ['Style', 'Color', 'Logo', 'Size', 'Quantity', 'Attn', 'Loc code'];
  const rows: string[][] = [];
  orders.forEach((order) => {
    order.items.forEach((item) => {
      rows.push([
        item.styleNumber,
        item.variantName,
        item.logo.name.split('.')[0],
        item.size,
        item.quantity.toString(),
        order.userName || 'Unknown',
        order.locCode || 'N/A',
      ]);
    });
  });
  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

/** Parses a simple comma-separated CSV with a header row into objects keyed by header. */
export function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.split('\n');
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  const data: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = lines[i].split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }
  return data;
}

export function trackingUrl(carrier: string | undefined, trackingNumber: string | undefined): string {
  if (!carrier || !trackingNumber) return '#';
  switch (carrier.toUpperCase()) {
    case 'UPS':
      return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    case 'FEDEX':
      return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    case 'USPS':
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
    case 'DHL':
      return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;
    default:
      return `https://www.google.com/search?q=${carrier}+tracking+${trackingNumber}`;
  }
}
