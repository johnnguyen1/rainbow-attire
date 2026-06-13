'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  Package,
  Trash2,
  Truck,
  Undo2,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';
import { downloadCsv, ordersToCsv, trackingUrl } from '@/lib/csv';
import { deleteOrder, getCompanyOrders, updateOrderStatus } from '@/lib/services/orders';
import type { Order, OrderStatus, TrackingInfo } from '@/lib/types';

const STATUS_META: Record<
  OrderStatus,
  { icon: typeof Clock; text: string; activeTab: string }
> = {
  pending: { icon: Clock, text: 'text-amber-600', activeTab: 'data-[state=active]:text-amber-700' },
  approved: { icon: Check, text: 'text-blue-600', activeTab: 'data-[state=active]:text-blue-700' },
  processing: {
    icon: Wrench,
    text: 'text-violet-600',
    activeTab: 'data-[state=active]:text-violet-700',
  },
  shipped: { icon: Truck, text: 'text-cyan-600', activeTab: 'data-[state=active]:text-cyan-700' },
  delivered: {
    icon: CheckCircle2,
    text: 'text-green-600',
    activeTab: 'data-[state=active]:text-green-700',
  },
  cancelled: { icon: XCircle, text: 'text-red-600', activeTab: 'data-[state=active]:text-red-700' },
};

function StatusTabTrigger({ status, count }: { status: OrderStatus; count: number }) {
  const { icon: Icon, text, activeTab } = STATUS_META[status];
  return (
    <TabsTrigger value={status} className={cn('capitalize', activeTab)}>
      <Icon className={cn('mr-1 h-4 w-4', text)} />
      {status} ({count})
    </TabsTrigger>
  );
}

interface OrderGroup {
  locCode: string;
  orders: Order[];
  trackingNumber?: string;
  carrier?: string;
}

function groupByLocation(orders: Order[]): OrderGroup[] {
  const map = new Map<string, Order[]>();
  orders.forEach((order) => {
    const locCode = order.locCode || 'Unassigned';
    map.set(locCode, [...(map.get(locCode) ?? []), order]);
  });
  return [...map.entries()]
    .map(([locCode, grouped]) => ({
      locCode,
      orders: grouped,
      trackingNumber: grouped[0]?.trackingInfo?.trackingNumber,
      carrier: grouped[0]?.trackingInfo?.carrier,
    }))
    .sort((a, b) => a.locCode.localeCompare(b.locCode));
}

function groupByTracking(orders: Order[]): OrderGroup[] {
  const map = new Map<string, Order[]>();
  orders.forEach((order) => {
    const tracking = order.trackingInfo?.trackingNumber || 'No Tracking';
    map.set(tracking, [...(map.get(tracking) ?? []), order]);
  });
  return [...map.entries()]
    .map(([trackingNumber, grouped]) => ({
      locCode: grouped[0].locCode || 'N/A',
      trackingNumber,
      carrier: grouped[0].trackingInfo?.carrier || 'N/A',
      orders: grouped,
    }))
    .sort((a, b) => (a.trackingNumber || '').localeCompare(b.trackingNumber || ''));
}

function OrderItemsDetail({ order }: { order: Order }) {
  return (
    <div className="space-y-3 rounded-md bg-muted/40 p-3">
      <h4 className="text-sm font-semibold">Order items</h4>
      {order.items.map((item, index) => (
        <div key={index} className="flex gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-white">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                sizes="64px"
                className="object-contain p-1"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                No image
              </div>
            )}
          </div>
          <div className="text-sm">
            <p className="font-medium">{item.name}</p>
            <p className="text-muted-foreground">
              Color: {item.variantName || '—'} · Style: {item.styleNumber} · Size: {item.size}
            </p>
            <p className="text-muted-foreground">
              Quantity: {item.quantity}
              {item.logo?.name ? ` · Logo: ${item.logo.name.split('.')[0]}` : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function OrderRow({
  order,
  actions,
}: {
  order: Order;
  actions: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <div className="border-b py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-left"
          aria-expanded={expanded}
        >
          <Chevron className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(-8)}</span>
          <span className="text-sm">
            {order.createdAt.toLocaleDateString()}{' '}
            {order.createdAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </span>
          <span className="text-sm font-medium">{order.userName ?? 'Unknown'}</span>
          {order.locCode && <Badge variant="secondary">{order.locCode}</Badge>}
          <span className="text-sm text-muted-foreground">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </button>
        {actions && (
          <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        )}
      </div>
      {expanded && (
        <div className="mt-3 pl-8">
          <OrderItemsDetail order={order} />
        </div>
      )}
    </div>
  );
}

interface TrackingDialogState {
  group: OrderGroup | null;
  trackingNumber: string;
  carrier: string;
  location: string;
}

export function ManagerOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    confirmText: string;
    destructive?: boolean;
    action: () => Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [tracking, setTracking] = useState<TrackingDialogState>({
    group: null,
    trackingNumber: '',
    carrier: 'UPS',
    location: '',
  });
  const [trackingBusy, setTrackingBusy] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!user?.company) {
      setOrders([]);
      return;
    }
    try {
      setOrders(await getCompanyOrders(user.company));
    } catch {
      toast.error('Failed to load orders');
      setOrders([]);
    }
  }, [user?.company]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const byStatus = (status: OrderStatus) =>
    (orders ?? []).filter((order) => order.status === status);

  async function setStatus(order: Order, status: OrderStatus, message: string) {
    try {
      await updateOrderStatus(order.id, status);
      toast.success(message);
      await loadOrders();
    } catch {
      toast.error('Failed to update order');
    }
  }

  function confirmAction(
    title: string,
    message: string,
    confirmText: string,
    action: () => Promise<void>,
    destructive = false
  ) {
    setConfirm({ title, message, confirmText, action, destructive });
  }

  async function runConfirm() {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      await confirm.action();
      setConfirm(null);
    } finally {
      setConfirmBusy(false);
    }
  }

  function exportCsv(status: OrderStatus, prefix: string) {
    const filtered = byStatus(status);
    if (filtered.length === 0) {
      toast.info(`No ${status} orders to export`);
      return;
    }
    downloadCsv(ordersToCsv(filtered), `${prefix}-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${filtered.length} ${status} orders`);
  }

  async function submitTracking() {
    const group = tracking.group;
    if (!group) return;
    if (!tracking.trackingNumber.trim()) {
      toast.error('Tracking number is required');
      return;
    }
    setTrackingBusy(true);
    try {
      const info: TrackingInfo = {
        trackingNumber: tracking.trackingNumber.trim(),
        carrier: tracking.carrier,
        location: tracking.location.trim(),
      };
      await Promise.all(
        group.orders.map((order) => updateOrderStatus(order.id, 'shipped', info))
      );
      toast.success(`Marked ${group.orders.length} orders as shipped`);
      setTracking({ group: null, trackingNumber: '', carrier: 'UPS', location: '' });
      await loadOrders();
    } catch {
      toast.error('Failed to update orders');
    } finally {
      setTrackingBusy(false);
    }
  }

  if (!user?.company) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Your account isn&apos;t associated with a company.
      </p>
    );
  }

  if (orders === null) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  const pending = byStatus('pending');
  const approved = byStatus('approved');
  const processing = byStatus('processing');
  const shipped = byStatus('shipped');
  const delivered = byStatus('delivered');
  const cancelled = byStatus('cancelled');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manager dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Company order management{orders[0]?.companyName ? ` · ${orders[0].companyName}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href="/manager/products/" />}>
            Products
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/manager/users/" />}>
            Users
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="flex-wrap">
          <StatusTabTrigger status="pending" count={pending.length} />
          <StatusTabTrigger status="approved" count={approved.length} />
          <StatusTabTrigger status="processing" count={processing.length} />
          <StatusTabTrigger status="shipped" count={shipped.length} />
          <StatusTabTrigger status="delivered" count={delivered.length} />
          <StatusTabTrigger status="cancelled" count={cancelled.length} />
        </TabsList>

        {/* Pending */}
        <TabsContent value="pending" className="pt-4">
          <Card>
            <CardContent>
              {pending.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No pending orders.</p>
              ) : (
                pending.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    actions={
                      <>
                        <Button
                          size="sm"
                          onClick={() => setStatus(order, 'approved', 'Order approved')}
                        >
                          <Check className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() =>
                            confirmAction(
                              'Cancel Order',
                              'Are you sure you want to cancel this order? This action cannot be undone.',
                              'Cancel Order',
                              () => setStatus(order, 'cancelled', 'Order cancelled'),
                              true
                            )
                          }
                        >
                          <X className="mr-1 h-4 w-4" />
                          Cancel
                        </Button>
                      </>
                    }
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approved */}
        <TabsContent value="approved" className="space-y-4 pt-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={approved.length === 0}
              onClick={() =>
                confirmAction(
                  'Send All to Processing',
                  `Are you sure you want to move ${approved.length} orders to processing?`,
                  'Send to Processing',
                  async () => {
                    await Promise.all(
                      approved.map((order) => updateOrderStatus(order.id, 'processing'))
                    );
                    toast.success(`Moved ${approved.length} orders to processing`);
                    await loadOrders();
                  }
                )
              }
            >
              <Package className="mr-1 h-4 w-4" />
              Send all to processing
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportCsv('approved', 'approved-orders')}>
              <Download className="mr-1 h-4 w-4" />
              Export CSV
            </Button>
          </div>
          <Card>
            <CardContent>
              {approved.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No approved orders.</p>
              ) : (
                approved.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    actions={
                      <>
                        <Button
                          size="sm"
                          onClick={() => setStatus(order, 'processing', 'Order sent to processing')}
                        >
                          <Wrench className="mr-1 h-4 w-4" />
                          Send to processing
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() =>
                            confirmAction(
                              'Cancel Order',
                              'Are you sure you want to cancel this order? This action cannot be undone.',
                              'Cancel Order',
                              () => setStatus(order, 'cancelled', 'Order cancelled'),
                              true
                            )
                          }
                        >
                          <X className="mr-1 h-4 w-4" />
                          Cancel
                        </Button>
                      </>
                    }
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Processing — grouped by location */}
        <TabsContent value="processing" className="space-y-4 pt-4">
          <Button variant="outline" size="sm" onClick={() => exportCsv('processing', 'company-orders')}>
            <Download className="mr-1 h-4 w-4" />
            Export CSV
          </Button>
          {processing.length === 0 ? (
            <Card>
              <CardContent>
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No orders in processing.
                </p>
              </CardContent>
            </Card>
          ) : (
            groupByLocation(processing).map((group) => (
              <Card key={group.locCode}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">
                    {group.locCode} · {group.orders.length}{' '}
                    {group.orders.length === 1 ? 'order' : 'orders'}
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() =>
                      setTracking({
                        group,
                        trackingNumber: '',
                        carrier: 'UPS',
                        location: group.locCode,
                      })
                    }
                  >
                    <Truck className="mr-1 h-4 w-4" />
                    Add tracking & ship
                  </Button>
                </CardHeader>
                <CardContent>
                  {group.orders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      actions={
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            confirmAction(
                              'Send Back Order',
                              'Send this order back to approved status? This will remove it from processing.',
                              'Send Back',
                              () => setStatus(order, 'approved', 'Order sent back to approved')
                            )
                          }
                        >
                          <Undo2 className="mr-1 h-4 w-4" />
                          Send back
                        </Button>
                      }
                    />
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Shipped — grouped by tracking number */}
        <TabsContent value="shipped" className="space-y-4 pt-4">
          {shipped.length === 0 ? (
            <Card>
              <CardContent>
                <p className="py-8 text-center text-sm text-muted-foreground">No shipped orders.</p>
              </CardContent>
            </Card>
          ) : (
            groupByTracking(shipped).map((group) => (
              <Card key={group.trackingNumber}>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="text-base">
                      {group.carrier} · {group.trackingNumber}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {group.orders.length} {group.orders.length === 1 ? 'order' : 'orders'} ·{' '}
                      {group.locCode}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {group.trackingNumber !== 'No Tracking' && (
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <a
                            href={trackingUrl(group.carrier, group.trackingNumber)}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        }
                      >
                        <ExternalLink className="mr-1 h-4 w-4" />
                        Track
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() =>
                        confirmAction(
                          'Mark Orders as Delivered',
                          `Are you sure you want to mark ${group.orders.length} orders as delivered?`,
                          'Mark as Delivered',
                          async () => {
                            await Promise.all(
                              group.orders.map((order) =>
                                updateOrderStatus(order.id, 'delivered')
                              )
                            );
                            toast.success(`Marked ${group.orders.length} orders as delivered`);
                            await loadOrders();
                          }
                        )
                      }
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Mark delivered
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {group.orders.map((order) => (
                    <OrderRow key={order.id} order={order} actions={null} />
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Delivered — grouped by location */}
        <TabsContent value="delivered" className="space-y-4 pt-4">
          {delivered.length === 0 ? (
            <Card>
              <CardContent>
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No delivered orders.
                </p>
              </CardContent>
            </Card>
          ) : (
            groupByLocation(delivered).map((group) => (
              <Card key={group.locCode}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {group.locCode} · {group.orders.length}{' '}
                    {group.orders.length === 1 ? 'order' : 'orders'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {group.orders.map((order) => (
                    <OrderRow key={order.id} order={order} actions={null} />
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Cancelled */}
        <TabsContent value="cancelled" className="pt-4">
          <Card>
            <CardContent>
              {cancelled.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No cancelled orders.
                </p>
              ) : (
                cancelled.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    actions={
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          confirmAction(
                            'Delete Order',
                            'Are you sure you want to delete this order? This action cannot be undone.',
                            'Delete Order',
                            async () => {
                              await deleteOrder(order.id);
                              toast.success('Order deleted');
                              await loadOrders();
                            },
                            true
                          )
                        }
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </Button>
                    }
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {confirm && (
        <ConfirmDialog
          open={!!confirm}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={confirm.title}
          message={confirm.message}
          confirmText={confirm.confirmText}
          destructive={confirm.destructive}
          busy={confirmBusy}
          onConfirm={runConfirm}
        />
      )}

      <Dialog
        open={!!tracking.group}
        onOpenChange={(open) =>
          !open && setTracking({ group: null, trackingNumber: '', carrier: 'UPS', location: '' })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add tracking information</DialogTitle>
            <DialogDescription>
              Marks {tracking.group?.orders.length ?? 0} orders for{' '}
              {tracking.group?.locCode ?? ''} as shipped.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Carrier</Label>
              <Select
                value={tracking.carrier}
                onValueChange={(value) =>
                  setTracking((state) => ({ ...state, carrier: value ?? 'UPS' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPS">UPS</SelectItem>
                  <SelectItem value="FedEx">FedEx</SelectItem>
                  <SelectItem value="USPS">USPS</SelectItem>
                  <SelectItem value="DHL">DHL</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trackingNumber">Tracking number</Label>
              <Input
                id="trackingNumber"
                value={tracking.trackingNumber}
                onChange={(e) =>
                  setTracking((state) => ({ ...state, trackingNumber: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={tracking.location}
                onChange={(e) => setTracking((state) => ({ ...state, location: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setTracking({ group: null, trackingNumber: '', carrier: 'UPS', location: '' })
              }
              disabled={trackingBusy}
            >
              Cancel
            </Button>
            <Button onClick={submitTracking} disabled={trackingBusy}>
              {trackingBusy ? 'Saving…' : 'Mark as shipped'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
