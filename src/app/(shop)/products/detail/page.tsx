'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { ProductDetail } from '@/components/product-detail';
import { Skeleton } from '@/components/ui/skeleton';
import { getCompanyById } from '@/lib/services/companies';
import { getProductById } from '@/lib/services/products';
import type { CompanyLogo, Product } from '@/lib/types';

function ProductDetailLoader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('id');
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [logos, setLogos] = useState<CompanyLogo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
      router.replace('/products/');
      return;
    }
    if (!user) return;

    let cancelled = false;
    Promise.all([
      getProductById(productId),
      user.company ? getCompanyById(user.company) : Promise.resolve(null),
    ]).then(([productResult, company]) => {
      if (cancelled) return;
      if (!productResult) {
        router.replace('/products/');
        return;
      }
      setProduct(productResult);
      setLogos(company?.embroideryLogos ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [productId, user, router]);

  if (loading || !product) {
    return (
      <div className="grid gap-10 lg:grid-cols-2">
        <Skeleton className="aspect-square rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return <ProductDetail product={product} logos={logos} />;
}

export default function ProductDetailPage() {
  return (
    <Suspense>
      <ProductDetailLoader />
    </Suspense>
  );
}
