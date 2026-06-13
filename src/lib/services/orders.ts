import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { toDate } from '@/lib/services/convert';
import type {
  CartItem,
  Order,
  OrderItem,
  OrderStatus,
  TrackingInfo,
  User,
} from '@/lib/types';

const ORDERS = 'orders';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOrder(id: string, data: any): Order {
  return {
    id,
    userId: data.userId ?? '',
    companyId: data.companyId ?? '',
    companyName: data.companyName ?? undefined,
    userName: data.userName ?? undefined,
    locCode: data.locCode ?? undefined,
    items: data.items ?? [],
    status: (data.status as OrderStatus) ?? 'pending',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    trackingInfo: data.trackingInfo ?? undefined,
  };
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const snap = await getDocs(
    query(
      collection(db, ORDERS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
  );
  return snap.docs.map((d) => mapOrder(d.id, d.data()));
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, ORDERS, orderId));
  if (!snap.exists()) return null;
  return mapOrder(snap.id, snap.data());
}

/** Company orders enriched with company display name and per-user name/locCode. */
export async function getCompanyOrders(companyId: string): Promise<Order[]> {
  if (!companyId) return [];
  const snap = await getDocs(
    query(
      collection(db, ORDERS),
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
    )
  );
  if (snap.empty) return [];

  const companySnap = await getDoc(doc(db, 'companies', companyId));
  const companyName = companySnap.exists()
    ? (companySnap.data().displayName ?? 'Unknown Company')
    : 'Unknown Company';

  const userIds = [...new Set(snap.docs.map((d) => d.data().userId as string))];
  const userMap = new Map<string, { name: string; locCode: string }>();
  await Promise.all(
    userIds.map(async (uid) => {
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        userMap.set(uid, {
          name: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || 'Unknown User',
          locCode: data.locCode ?? '',
        });
      }
    })
  );

  return snap.docs.map((d) => {
    const order = mapOrder(d.id, d.data());
    const user = userMap.get(order.userId);
    return {
      ...order,
      companyName,
      userName: user?.name ?? 'Unknown User',
      locCode: user?.locCode || order.locCode || '',
    };
  });
}

/** Creates an order from the user's cart and clears the cart in one transaction. */
export async function createOrderFromCart(user: User, cartItems: CartItem[]): Promise<string> {
  if (!user.company) {
    throw new Error('You must be associated with a company to place an order');
  }
  if (cartItems.length === 0) {
    throw new Error('Cannot place an order with an empty cart');
  }

  for (const item of cartItems) {
    if (!item.id || !item.productId || !item.variantId || !item.name || !item.size || !item.logo) {
      throw new Error('Cart contains an invalid item; please remove it and try again');
    }
  }

  const orderItems: OrderItem[] = cartItems.map((item) => {
    const orderItem: OrderItem = {
      cartId: item.id,
      productId: item.productId,
      variantId: item.variantId,
      name: item.name,
      variantName: item.variantName || '',
      styleNumber: item.styleNumber,
      quantity: item.quantity,
      size: item.size,
      logo: { name: item.logo?.name || 'No Logo' },
    };
    if (item.imageUrl) orderItem.imageUrl = item.imageUrl;
    return orderItem;
  });

  const cartItemsRef = collection(db, 'carts', user.uid, 'items');
  const cartSnap = await getDocs(cartItemsRef);

  const orderRef = doc(collection(db, ORDERS));
  await runTransaction(db, async (tx) => {
    tx.set(orderRef, {
      userId: user.uid,
      companyId: user.company,
      items: orderItems,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    cartSnap.docs.forEach((d) => tx.delete(d.ref));
  });

  return orderRef.id;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  trackingInfo?: TrackingInfo
): Promise<void> {
  const update: Record<string, unknown> = { status, updatedAt: new Date() };
  if (trackingInfo && status === 'shipped') {
    update.trackingInfo = trackingInfo;
  }
  await updateDoc(doc(db, ORDERS, orderId), update);
}

export async function deleteOrder(orderId: string): Promise<void> {
  await deleteDoc(doc(db, ORDERS, orderId));
}
