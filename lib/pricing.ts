import { CartItem, PriceTier } from './types';

// Mirrors the backend (app/models/product.py discount_percent_for_quantity and
// app/services/order.py): once a line's quantity reaches a tier threshold, every
// unit in the line gets that tier's % off. Highest applicable discount wins.
// Kept in sync so cart/product-page totals match what the backend actually charges.

export function tierDiscountPercent(tiers: PriceTier[] | undefined | null, quantity: number): number {
  if (!tiers || tiers.length === 0) return 0;
  const applicable = tiers
    .filter(t => quantity >= t.min_quantity)
    .map(t => parseFloat(t.discount_percent));
  return applicable.length ? Math.max(...applicable) : 0;
}

// Effective per-unit price after any qualifying tier discount, rounded to cents.
export function tierUnitPrice(basePrice: number, tiers: PriceTier[] | undefined | null, quantity: number): number {
  const pct = tierDiscountPercent(tiers, quantity);
  if (!pct) return basePrice;
  return Math.round(basePrice * (100 - pct)) / 100;
}

// Sorted ascending by threshold, for display.
export function sortedTiers(tiers: PriceTier[] | undefined | null): PriceTier[] {
  return [...(tiers ?? [])].sort((a, b) => a.min_quantity - b.min_quantity);
}

// ── Cart-item helpers (unit_price is the base price; tiers apply on top) ────────
export function cartItemUnitPrice(item: CartItem): number {
  return tierUnitPrice(parseFloat(item.unit_price), item.price_tiers, item.quantity);
}

export function cartItemLineTotal(item: CartItem): number {
  return cartItemUnitPrice(item) * item.quantity;
}
