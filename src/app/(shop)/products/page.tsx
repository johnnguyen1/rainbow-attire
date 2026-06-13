'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { ProductCatalog } from '@/components/product-catalog';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllProducts, getProductsByCompany } from '@/lib/services/products';
import type { Product } from '@/lib/types';

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load =
      user.role === 'admin' ? getAllProducts() : getProductsByCompany(user.company);
    load.then((result) => {
      if (!cancelled) {
        setProducts(result.sort((a, b) => a.name.localeCompare(b.name)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!products) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="aspect-[3/4] rounded-xl" />
        ))}
      </div>
    );
  }

  return <ProductCatalog products={products} hasCompany={!!user?.company} />;
}
