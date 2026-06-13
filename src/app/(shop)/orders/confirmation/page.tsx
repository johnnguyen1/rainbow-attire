'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { useAuth } from '@/components/auth-provider';
import { getOrderById } from '@/lib/services/orders';
import type { Order } from '@/lib/types';

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      router.replace('/products/');
      return;
    }
    if (!user) return;

    let cancelled = false;
    getOrderById(orderId).then((result) => {
      if (cancelled) return;
      if (!result || (result.userId !== user.uid && user.role === 'user')) {
        router.replace('/products/');
        return;
      }
      setOrder(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [orderId, user, router]);

  if (loading || !order) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="mx-auto h-12 w-12 rounded-full" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const totalItems = order.items.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
        <h1 className="text-2xl font-bold tracking-tight">Order placed</h1>
        <p className="text-sm text-muted-foreground">
          Order <span className="font-mono font-medium">{order.id}</span> was submitted and
          is pending manager approval.
        </p>
        <OrderStatusBadge status={order.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {order.items.map((item, index) => (
            <div key={`${item.cartId}-${index}`} className="flex gap-4 py-4 first:pt-0 last:pb-0">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-white">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    sizes="80px"
                    className="object-contain p-1"
                  />
                ) : null}
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground">
                  {item.styleNumber}
                  {item.variantName ? ` · ${item.variantName}` : ''} · Size {item.size}
                </p>
                <p className="text-muted-foreground">Logo: {item.logo?.name ?? 'None'}</p>
                <p className="mt-1">Qty: {item.quantity}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-center gap-3">
        <Button variant="outline" render={<Link href="/account/" />}>
          View my orders
        </Button>
        <Button render={<Link href="/products/" />}>Continue shopping</Button>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense>
      <ConfirmationContent />
    </Suspense>
  );
}
