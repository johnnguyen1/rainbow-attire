'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { useAuth } from '@/components/auth-provider';
import { auth } from '@/lib/firebase-client';
import { getCompanyById } from '@/lib/services/companies';
import { getUserOrders, updateOrderStatus } from '@/lib/services/orders';
import { updateUserDoc } from '@/lib/services/users';
import type { Order, User } from '@/lib/types';

function ProfileTab({ user, companyName }: { user: User; companyName: string }) {
  const { refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) {
      toast.error('First and last name are required');
      return;
    }
    setSaving(true);
    try {
      await updateUserDoc(user.uid, { firstName: first, lastName: last });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: `${first} ${last}` });
      }
      await refreshProfile();
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your account details</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} disabled />
          </div>
          <div className="space-y-2">
            <Label>Company</Label>
            <Input value={companyName || 'Not assigned'} disabled />
          </div>
          {user.locCode && (
            <div className="space-y-2">
              <Label>Location code</Label>
              <Input value={user.locCode} disabled />
            </div>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function OrderCard({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const totalItems = order.items.reduce((total, item) => total + item.quantity, 0);

  async function handleCancel() {
    setCancelling(true);
    try {
      await updateOrderStatus(order.id, 'cancelled');
      toast.success('Order cancelled');
      setConfirmOpen(false);
      onChanged();
    } catch {
      toast.error('Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="font-mono text-sm">{order.id}</CardTitle>
          <CardDescription>
            Placed {order.createdAt.toLocaleDateString()} · {totalItems}{' '}
            {totalItems === 1 ? 'item' : 'items'}
          </CardDescription>
        </div>
        <OrderStatusBadge status={order.status} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="divide-y">
          {order.items.map((item, index) => (
            <div key={index} className="flex items-center gap-3 py-2 text-sm">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border bg-white">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt="" fill sizes="48px" className="object-contain" />
                ) : null}
              </div>
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground">
                  {item.variantName} · Size {item.size} · Qty {item.quantity} · Logo:{' '}
                  {item.logo?.name}
                </p>
              </div>
            </div>
          ))}
        </div>

        {order.trackingInfo?.trackingNumber && (
          <p className="text-sm text-muted-foreground">
            Tracking: {order.trackingInfo.carrier} {order.trackingInfo.trackingNumber}
          </p>
        )}

        {order.status === 'pending' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={cancelling}
            >
              Cancel order
            </Button>
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancel this order?</DialogTitle>
                  <DialogDescription>
                    This can&apos;t be undone. Your manager won&apos;t see the order anymore.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                    Keep order
                  </Button>
                  <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
                    {cancelling ? 'Cancelling…' : 'Cancel order'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function AccountDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [companyName, setCompanyName] = useState('');

  const loadOrders = useCallback(() => {
    if (!user) return;
    getUserOrders(user.uid).then(setOrders);
  }, [user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!user?.company) {
      setCompanyName('');
      return;
    }
    let cancelled = false;
    getCompanyById(user.company).then((company) => {
      if (!cancelled) setCompanyName(company?.displayName ?? '');
    });
    return () => {
      cancelled = true;
    };
  }, [user?.company]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">My account</h1>
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="space-y-4 pt-4">
          {orders === null ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : orders.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              You haven&apos;t placed any orders yet.
            </p>
          ) : (
            orders.map((order) => (
              <OrderCard key={order.id} order={order} onChanged={loadOrders} />
            ))
          )}
        </TabsContent>
        <TabsContent value="profile" className="pt-4">
          <ProfileTab user={user} companyName={companyName} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
