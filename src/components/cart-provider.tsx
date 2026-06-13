'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/components/auth-provider';
import {
  addToCart as addToCartService,
  clearCart as clearCartService,
  removeCartItem,
  subscribeToCart,
  updateCartItemQuantity,
  type AddToCartInput,
} from '@/lib/services/carts';
import type { CartItem } from '@/lib/types';

interface CartContextValue {
  items: CartItem[];
  count: number;
  loading: boolean;
  addItem: (input: AddToCartInput) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToCart(
      user.uid,
      (cartItems) => {
        setItems(cartItems);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [user]);

  const requireUid = useCallback(() => {
    if (!user) throw new Error('You must be signed in');
    return user.uid;
  }, [user]);

  const addItem = useCallback(
    async (input: AddToCartInput) => addToCartService(requireUid(), input),
    [requireUid]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) =>
      updateCartItemQuantity(requireUid(), itemId, quantity),
    [requireUid]
  );

  const removeItem = useCallback(
    async (itemId: string) => removeCartItem(requireUid(), itemId),
    [requireUid]
  );

  const clear = useCallback(async () => clearCartService(requireUid()), [requireUid]);

  const count = useMemo(
    () => items.reduce((total, item) => total + (item.quantity || 0), 0),
    [items]
  );

  const value = useMemo(
    () => ({ items, count, loading, addItem, updateQuantity, removeItem, clear }),
    [items, count, loading, addItem, updateQuantity, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
