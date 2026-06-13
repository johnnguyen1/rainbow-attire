'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState, useTransition } from 'react';
import { ArrowLeft, Check, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCart } from '@/components/cart-provider';
import {
  getBulletPoints,
  getMainDescription,
  parseSizes,
  regularSizes,
  swatchColors,
  tallSizes,
} from '@/lib/sizes';
import { cn } from '@/lib/utils';
import type { CompanyLogo, Product, ProductVariant } from '@/lib/types';

function Swatch({
  variant,
  selected,
  onSelect,
}: {
  variant: ProductVariant;
  selected: boolean;
  onSelect: () => void;
}) {
  const gradient = swatchColors(variant.swatchImageColors);
  return (
    <button
      type="button"
      title={variant.name}
      onClick={onSelect}
      className={cn(
        'relative h-10 w-10 overflow-hidden rounded-full border-2 transition-all',
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
      )}
    >
      {variant.swatchImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={variant.swatchImageUrl}
          alt={variant.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className="block h-full w-full"
          style={{
            background:
              gradient.length > 1
                ? `linear-gradient(135deg, ${gradient.join(', ')})`
                : gradient[0],
          }}
        />
      )}
      {selected && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Check className="h-4 w-4 text-white" />
        </span>
      )}
    </button>
  );
}

function SizeGroup({
  title,
  sizes,
  selectedSize,
  onSelect,
}: {
  title?: string;
  sizes: string[];
  selectedSize: string;
  onSelect: (size: string) => void;
}) {
  if (sizes.length === 0) return null;
  return (
    <div className="space-y-2">
      {title && <p className="text-xs font-medium text-muted-foreground">{title}</p>}
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => onSelect(size)}
            className={cn(
              'min-w-12 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
              selectedSize === size
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:border-primary/50'
            )}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductDetailInner({
  product,
  logos,
}: {
  product: Product;
  logos: CompanyLogo[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem } = useCart();

  const initialVariant =
    product.variants.find((v) => v.id === searchParams.get('variant')) ??
    product.variants[0] ??
    null;

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(initialVariant);
  const [imageIndex, setImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedLogoId, setSelectedLogoId] = useState(logos[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [pending, startTransition] = useTransition();

  const sizes = useMemo(() => parseSizes(product.sizes), [product.sizes]);
  const regular = regularSizes(sizes);
  const tall = tallSizes(sizes);
  const mainDescription = getMainDescription(product.description);
  const bullets = getBulletPoints(product.description);

  const images = selectedVariant?.images ?? [];
  const currentImage = images[imageIndex]?.imageUrl;

  function handleAddToCart() {
    const missing: string[] = [];
    if (!selectedVariant) missing.push('color');
    if (!selectedSize) missing.push('size');
    if (!selectedLogoId) missing.push('logo');
    if (missing.length > 0) {
      toast.error(`Please select a ${missing.join(', ')} before adding to cart`);
      return;
    }

    const variant = selectedVariant!;
    const logo = logos.find((l) => l.id === selectedLogoId);
    if (!logo) {
      toast.error('Logo selection is required');
      return;
    }

    startTransition(async () => {
      try {
        await addItem({
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          variantName: variant.name,
          styleNumber: product.styleNumber,
          quantity,
          imageUrl: variant.images[0]?.imageUrl,
          size: selectedSize,
          logo: {
            id: logo.id,
            name: logo.name,
            imageUrl: logo.imageUrl,
            width: logo.width,
            height: logo.height,
          },
        });
        toast.success('Added to cart', {
          action: { label: 'View cart', onClick: () => router.push('/cart/') },
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to add to cart');
      }
    });
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/products" />}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to products
      </Button>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Image gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-lg border bg-white">
            {currentImage ? (
              <Image
                src={currentImage}
                alt={`${product.name} — ${selectedVariant?.name ?? ''}`}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-6"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No image available
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {images.map((image, index) => (
                <button
                  key={`${image.imageUrl}-${index}`}
                  type="button"
                  onClick={() => setImageIndex(index)}
                  className={cn(
                    'relative h-16 w-16 overflow-hidden rounded-md border-2 bg-white',
                    index === imageIndex ? 'border-primary' : 'border-border'
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.imageUrl}
                    alt=""
                    className="h-full w-full object-contain p-1"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details and customization */}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">{product.styleNumber}</p>
            <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
            {selectedVariant && (
              <p className="mt-1 text-sm text-muted-foreground">
                Color: <span className="font-medium text-foreground">{selectedVariant.name}</span>
              </p>
            )}
          </div>

          {mainDescription && <p className="text-sm leading-6">{mainDescription}</p>}

          {product.variants.length > 0 && (
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <Swatch
                    key={variant.id}
                    variant={variant}
                    selected={selectedVariant?.id === variant.id}
                    onSelect={() => {
                      setSelectedVariant(variant);
                      setImageIndex(0);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label>Size</Label>
            {sizes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sizes available</p>
            ) : tall.length > 0 ? (
              <div className="space-y-3">
                <SizeGroup title="Regular" sizes={regular} selectedSize={selectedSize} onSelect={setSelectedSize} />
                <SizeGroup title="Tall" sizes={tall} selectedSize={selectedSize} onSelect={setSelectedSize} />
              </div>
            ) : (
              <SizeGroup sizes={regular} selectedSize={selectedSize} onSelect={setSelectedSize} />
            )}
          </div>

          <div className="space-y-2">
            <Label>Embroidery logo</Label>
            {logos.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Your company has no embroidery logos configured yet, so items can&apos;t be
                  added to the cart. Contact your administrator.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex flex-wrap gap-3">
                {logos.map((logo) => (
                  <button
                    key={logo.id}
                    type="button"
                    onClick={() => setSelectedLogoId(logo.id)}
                    className={cn(
                      'flex w-28 flex-col items-center gap-2 rounded-lg border-2 bg-white p-3 transition-colors',
                      selectedLogoId === logo.id
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    {logo.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo.imageUrl} alt={logo.name} className="h-12 w-full object-contain" />
                    ) : (
                      <span className="flex h-12 items-center text-xs text-muted-foreground">No preview</span>
                    )}
                    <span className="line-clamp-2 text-center text-xs">{logo.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center font-medium">{quantity}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQuantity((q) => Math.min(999, q + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full sm:w-auto"
            onClick={handleAddToCart}
            disabled={pending || logos.length === 0}
          >
            {pending ? 'Adding…' : 'Add to cart'}
          </Button>

          {bullets.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <h2 className="text-sm font-semibold">Details</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {bullets.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{product.sizes}</Badge>
            <span>{product.variants.length} colors available</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductDetail(props: { product: Product; logos: CompanyLogo[] }) {
  return (
    <Suspense>
      <ProductDetailInner {...props} />
    </Suspense>
  );
}
