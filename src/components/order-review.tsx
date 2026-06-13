'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { createOrderFromCart } from '@/lib/services/orders';

export function OrderReview() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, count, loading } = useCart();
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!loading && !placing && items.length === 0) {
      router.replace('/cart/');
    }
  }, [loading, placing, items.length, router]);

  async function handlePlaceOrder() {
    if (!user) return;
    setPlacing(true);
    try {
      const orderId = await createOrderFromCart(user, items);
      router.push(`/orders/confirmation/?orderId=${orderId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to place order');
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const hasCompany = !!user?.company;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/cart/" />}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to cart
      </Button>

      <h1 className="text-2xl font-bold tracking-tight">Review your order</h1>

      {!hasCompany && (
        <Alert variant="destructive">
          <AlertDescription>
            Your account isn&apos;t associated with a company, so orders can&apos;t be placed.
            Contact your administrator.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {count} {count === 1 ? 'item' : 'items'}
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
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

      <div className="flex justify-end gap-3">
        <Button variant="outline" render={<Link href="/cart/" />}>
          Edit cart
        </Button>
        <Button onClick={handlePlaceOrder} disabled={placing || !hasCompany || items.length === 0}>
          {placing ? 'Placing order…' : 'Place order'}
        </Button>
      </div>
    </div>
  );
}
