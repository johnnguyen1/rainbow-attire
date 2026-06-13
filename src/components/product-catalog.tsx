'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SwatchThumb } from '@/components/swatch-thumb';
import type { Product } from '@/lib/types';

const MAX_SWATCHES = 6;

function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const [hoveredVariantId, setHoveredVariantId] = useState<string | null>(null);

  const displayedVariant =
    product.variants.find((variant) => variant.id === hoveredVariantId) ?? product.variants[0];
  const image = displayedVariant?.images[0]?.imageUrl;

  function goToDetail(variantId?: string) {
    const params = new URLSearchParams({ id: product.id });
    if (variantId) params.set('variant', variantId);
    router.push(`/products/detail/?${params.toString()}`);
  }

  return (
    <Card
      className="h-full cursor-pointer overflow-hidden py-0 transition-shadow hover:shadow-md"
      onClick={() => goToDetail()}
    >
      <div className="relative aspect-square bg-white">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-contain p-4"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <CardContent className="space-y-2 p-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{product.styleNumber}</p>
          <h2 className="line-clamp-2 text-sm font-medium">{product.name}</h2>
        </div>

        <div className="flex items-center gap-1.5" onMouseLeave={() => setHoveredVariantId(null)}>
          {product.variants.slice(0, MAX_SWATCHES).map((variant) => (
            <button
              key={variant.id}
              type="button"
              title={variant.name}
              aria-label={variant.name}
              className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-border transition-transform hover:scale-110 hover:border-primary"
              onMouseEnter={() => setHoveredVariantId(variant.id)}
              onClick={(event) => {
                event.stopPropagation();
                goToDetail(variant.id);
              }}
            >
              <SwatchThumb variant={variant} />
            </button>
          ))}
          {product.variants.length > MAX_SWATCHES && (
            <button
              type="button"
              title={`+${product.variants.length - MAX_SWATCHES} more colors`}
              className="flex h-6 shrink-0 items-center rounded-full border border-border px-1.5 text-[10px] font-medium text-muted-foreground hover:border-primary"
              onClick={(event) => {
                event.stopPropagation();
                goToDetail();
              }}
            >
              +{product.variants.length - MAX_SWATCHES}
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">Sizes: {product.sizes}</p>
      </CardContent>
    </Card>
  );
}

export function ProductCatalog({
  products,
  hasCompany,
}: {
  products: Product[];
  hasCompany: boolean;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.styleNumber.toLowerCase().includes(term)
    );
  }, [products, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, style number…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!hasCompany && products.length === 0 && (
        <Alert>
          <AlertDescription>
            Your account isn&apos;t associated with a company yet, so no products are
            available. Contact your administrator if this seems wrong.
          </AlertDescription>
        </Alert>
      )}

      {filtered.length === 0 && products.length > 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No products match &quot;{search}&quot;.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
