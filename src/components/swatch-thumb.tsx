import { swatchColors } from '@/lib/sizes';
import { cn } from '@/lib/utils';
import type { ProductVariant } from '@/lib/types';

/** Renders a variant's swatch image, or a striped color preview when no image exists. */
export function SwatchThumb({
  variant,
  className,
}: {
  variant: ProductVariant;
  className?: string;
}) {
  if (variant.swatchImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={variant.swatchImageUrl}
        alt={variant.name}
        className={cn('h-full w-full object-cover', className)}
      />
    );
  }

  const colors = swatchColors(variant.swatchImageColors);
  return (
    <span className={cn('flex h-full w-full', className)} aria-label={variant.name}>
      {colors.map((color, index) => (
        <span key={index} className="h-full flex-1" style={{ backgroundColor: color }} />
      ))}
    </span>
  );
}
