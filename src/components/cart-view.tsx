'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/components/cart-provider';
import type { CartItem } from '@/lib/types';

function CartRow({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Cart update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-4 py-4">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border bg-white">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="96px"
            className="object-contain p-1"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/products/detail/?id=${item.productId}&variant=${item.variantId}`}
              className="font-medium hover:underline"
            >
              {item.name}
            </Link>
            <p className="text-sm text-muted-foreground">
              {item.styleNumber}
              {item.variantName ? ` · ${item.variantName}` : ''} · Size {item.size}
            </p>
            <p className="text-sm text-muted-foreground">Logo: {item.logo?.name ?? 'None'}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => run(() => removeItem(item.id))}
            disabled={busy}
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => run(() => updateQuantity(item.id, item.quantity - 1))}
            disabled={busy}
            aria-label="Decrease quantity"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => run(() => updateQuantity(item.id, item.quantity + 1))}
            disabled={busy}
            aria-label="Increase quantity"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CartView() {
  const router = useRouter();
  const { items, count, loading, clear } = useCart();
  const [clearing, setClearing] = useState(false);

  async function handleClear() {
    setClearing(true);
    try {
      await clear();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear cart');
    } finally {
      setClearing(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <ShoppingCart className="h-12 w-12 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-semibold">Your cart is empty</h1>
          <p className="text-sm text-muted-foreground">
            Browse the catalog and add some items.
          </p>
        </div>
        <Button render={<Link href="/products/" />}>Browse products</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Cart</h1>
        <Button variant="ghost" size="sm" onClick={handleClear} disabled={clearing}>
          Clear cart
        </Button>
      </div>

      <Card>
        <CardContent className="divide-y px-6 py-2">
          {items.map((item) => (
            <CartRow key={item.id} item={item} />
          ))}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {count} {count === 1 ? 'item' : 'items'} total
        </p>
        <div className="flex gap-3">
          <Button variant="outline" render={<Link href="/products/" />}>
            Continue shopping
          </Button>
          <Button onClick={() => router.push('/orders/review/')}>Review order</Button>
        </div>
      </div>
    </div>
  );
}
