'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getCustomerSession, syncCart } from './api';
import { CartConfigurationEntry, CartItem } from './types';

interface CartAddItemInput {
  product_id: string;
  product_name: string | null;
  unit_price: string;
  variant_id?: string | null;
  variant_label?: string | null;
  configuration?: CartConfigurationEntry[] | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartAddItemInput, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string | null, configuration?: CartConfigurationEntry[] | null) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string | null, configuration?: CartConfigurationEntry[] | null) => void;
  clearCart: () => void;
  total: number;
}

function cartKey(item: {
  product_id: string;
  variant_id?: string | null;
  configuration?: CartConfigurationEntry[] | null;
}): string {
  if (item.variant_id) return `${item.product_id}:${item.variant_id}`;
  if (item.configuration) {
    const sig = item.configuration
      .map(c => `${c.group_id}:${c.selected_choices.map(s => s.choice_id).sort().join(',')}:${c.text_value || ''}`)
      .join('|');
    return `${item.product_id}:${sig}`;
  }
  return item.product_id;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const loadedRef = useRef(false);
  const hydratedRef = useRef(false);
  const lastSyncedRef = useRef('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cart');
      if (!saved) {
        loadedRef.current = true;
        return;
      }

      const parsed = JSON.parse(saved);
      const isLegacy = Array.isArray(parsed) && parsed.some(item => item && typeof item === 'object' && 'product' in item);
      const isValid = Array.isArray(parsed) && parsed.every(item => item && typeof item === 'object' && 'product_id' in item);

      if (isLegacy || !isValid) {
        localStorage.removeItem('cart');
        setItems([]);
      } else {
        setItems(parsed);
      }
    } catch {
      localStorage.removeItem('cart');
      setItems([]);
    }
    loadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }

    const nextJson = JSON.stringify(items);
    localStorage.setItem('cart', nextJson);

    if (!getCustomerSession() || nextJson === lastSyncedRef.current) return;

    void syncCart(items)
      .then(cart => {
        const serverItems = cart.items ?? [];
        const serverJson = JSON.stringify(serverItems);
        lastSyncedRef.current = serverJson;
        if (serverJson !== nextJson) {
          setItems(serverItems);
        }
      })
      .catch(() => {});
  }, [items]);

  function addItem(item: CartAddItemInput, quantity = 1) {
    setItems(prev => {
      const key = cartKey(item);
      const existing = prev.find(entry => cartKey(entry) === key);
      if (existing) {
        return prev.map(entry =>
          cartKey(entry) === key
            ? {
                ...entry,
                quantity: entry.quantity + quantity,
                product_name: item.product_name,
                unit_price: item.unit_price,
                variant_label: item.variant_label ?? null,
                configuration: item.configuration ?? null,
              }
            : entry,
        );
      }

      return [
        ...prev,
        {
          product_id: item.product_id,
          product_name: item.product_name,
          quantity,
          variant_id: item.variant_id ?? null,
          variant_label: item.variant_label ?? null,
          unit_price: item.unit_price,
          configuration: item.configuration ?? null,
        },
      ];
    });
  }

  function removeItem(productId: string, variantId: string | null = null, configuration: CartConfigurationEntry[] | null = null) {
    const key = cartKey({ product_id: productId, variant_id: variantId, configuration });
    setItems(prev => prev.filter(item => cartKey(item) !== key));
  }

  function updateQuantity(
    productId: string,
    quantity: number,
    variantId: string | null = null,
    configuration: CartConfigurationEntry[] | null = null,
  ) {
    if (quantity <= 0) {
      removeItem(productId, variantId, configuration);
      return;
    }

    const key = cartKey({ product_id: productId, variant_id: variantId, configuration });
    setItems(prev => prev.map(item => (cartKey(item) === key ? { ...item, quantity } : item)));
  }

  function clearCart() {
    lastSyncedRef.current = '';
    setItems([]);
  }

  const total = items.reduce((sum, item) => sum + parseFloat(item.unit_price) * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
