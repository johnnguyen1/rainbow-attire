import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/lib/types';

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  processing: 'bg-violet-100 text-violet-800 border-violet-200',
  shipped: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={cn('capitalize', STATUS_STYLES[status])}>
      {status}
    </Badge>
  );
}
