const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

function generateSizeRange(startSize: string, endSize: string): string[] {
  if (!startSize || !endSize) return [];

  const startNum = parseInt(startSize, 10);
  const endNum = parseInt(endSize, 10);
  if (!isNaN(startNum) && !isNaN(endNum)) {
    if (endNum < startNum) return [];
    return Array.from({ length: endNum - startNum + 1 }, (_, i) => (startNum + i).toString());
  }

  const isTallRange = startSize.endsWith('T') && endSize.endsWith('T');
  const start = (isTallRange ? startSize.slice(0, -1) : startSize).toUpperCase();
  const end = (isTallRange ? endSize.slice(0, -1) : endSize).toUpperCase();

  const startIndex = SIZE_ORDER.indexOf(start);
  const endIndex = SIZE_ORDER.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return [];

  const range = SIZE_ORDER.slice(startIndex, endIndex + 1);
  return isTallRange ? range.map((s) => `${s}T`) : range;
}

/**
 * Parses a product size spec into selectable sizes.
 * Supports "XS-4XL", "XS-4XL & Tall Sizes", and comma-separated lists.
 */
export function parseSizes(sizes: string): string[] {
  if (!sizes) return [];
  const normalized = sizes.replace(/–|—/g, '-').trim();

  if (/(?:&|and)\s*tall/i.test(normalized)) {
    const [baseRange] = normalized.split(/\s*(?:&|and)\s*tall/i);
    const [start, end] = baseRange.split('-').map((s) => s.trim());
    const regular = generateSizeRange(start, end);
    return [...regular, ...regular.map((s) => `${s}T`)];
  }

  if (normalized.includes('-')) {
    const [start, end] = normalized.split('-').map((s) => s.trim());
    return generateSizeRange(start, end);
  }

  return normalized.split(',').map((s) => s.trim()).filter(Boolean);
}

export function regularSizes(sizes: string[]): string[] {
  return sizes.filter((s) => !s.endsWith('T'));
}

export function tallSizes(sizes: string[]): string[] {
  return sizes.filter((s) => s.endsWith('T'));
}

export function getMainDescription(description: string): string {
  if (!description) return '';
  const lines = description.split('\n');
  const main: string[] = [];
  for (const line of lines) {
    if (line.trim().startsWith('-')) break;
    main.push(line.trim());
  }
  return main.join(' ').trim();
}

export function getBulletPoints(description: string): string[] {
  if (!description) return [];
  return description
    .split('\n')
    .filter((line) => line.trim().startsWith('-'))
    .map((line) => line.trim().substring(1).trim())
    .filter((point) => point.length > 0);
}

/** Up to 4 normalized hex colors for rendering gradient swatches. */
export function swatchColors(colors: string[] | undefined): string[] {
  if (!colors) return ['#CCCCCC'];
  const valid = colors
    .filter((c) => c && typeof c === 'string')
    .map((c) => {
      const color = c.trim();
      if (/^[0-9A-Fa-f]{6}$/.test(color)) return `#${color}`;
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color;
      return '#CCCCCC';
    });
  return valid.length > 0 ? valid.slice(0, 4) : ['#CCCCCC'];
}
