import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import type { CartItem, CartItemLogo } from '@/lib/types';

function cartItemsRef(userId: string) {
  return collection(db, 'carts', userId, 'items');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItem(id: string, data: any): CartItem {
  return {
    id,
    productId: data.productId ?? '',
    variantId: data.variantId ?? '',
    name: data.name ?? '',
    variantName: data.variantName ?? undefined,
    styleNumber: data.styleNumber ?? '',
    quantity: data.quantity ?? 0,
    imageUrl: data.imageUrl ?? undefined,
    size: data.size ?? '',
    logo: data.logo ?? { id: '', name: 'No Logo' },
  };
}

async function ensureCartExists(userId: string): Promise<void> {
  const cartRef = doc(db, 'carts', userId);
  const snap = await getDoc(cartRef);
  if (!snap.exists()) {
    await setDoc(cartRef, { createdAt: new Date() });
  }
}

/** Live subscription to the user's cart items. Returns an unsubscribe function. */
export function subscribeToCart(
  userId: string,
  onItems: (items: CartItem[]) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    cartItemsRef(userId),
    (snap) => onItems(snap.docs.map((d) => mapItem(d.id, d.data()))),
    (error) => onError?.(error)
  );
}

export interface AddToCartInput {
  productId: string;
  variantId: string;
  name: string;
  variantName: string;
  styleNumber: string;
  quantity: number;
  imageUrl?: string;
  size: string;
  logo: CartItemLogo;
}

/** Adds an item, incrementing quantity when productId+variantId+size+logo already exists. */
export async function addToCart(userId: string, input: AddToCartInput): Promise<void> {
  await ensureCartExists(userId);

  const existingQuery = query(
    cartItemsRef(userId),
    where('productId', '==', input.productId),
    where('variantId', '==', input.variantId),
    where('size', '==', input.size),
    where('logo.id', '==', input.logo.id)
  );
  const existing = await getDocs(existingQuery);

  await runTransaction(db, async (tx) => {
    if (!existing.empty) {
      const docSnap = existing.docs[0];
      const fresh = await tx.get(docSnap.ref);
      const currentQuantity = fresh.exists() ? (fresh.data().quantity ?? 0) : 0;
      tx.set(docSnap.ref, {
        ...docSnap.data(),
        quantity: currentQuantity + input.quantity,
        updatedAt: new Date(),
      });
    } else {
      const item: Record<string, unknown> = {
        productId: input.productId,
        variantId: input.variantId,
        name: input.name,
        variantName: input.variantName,
        styleNumber: input.styleNumber,
        quantity: input.quantity,
        size: input.size,
        logo: input.logo,
      };
      if (input.imageUrl) item.imageUrl = input.imageUrl;
      tx.set(doc(cartItemsRef(userId)), item);
    }
  });
}

export async function updateCartItemQuantity(
  userId: string,
  itemId: string,
  quantity: number
): Promise<void> {
  const ref = doc(cartItemsRef(userId), itemId);
  if (quantity <= 0) {
    await deleteDoc(ref);
  } else {
    await updateDoc(ref, { quantity, updatedAt: new Date() });
  }
}

export async function removeCartItem(userId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(cartItemsRef(userId), itemId));
}

export async function clearCart(userId: string): Promise<void> {
  const snap = await getDocs(cartItemsRef(userId));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
