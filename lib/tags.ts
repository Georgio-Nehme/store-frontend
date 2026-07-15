import { ProductTag } from './types';

export const TAG_DEFINITIONS: Record<ProductTag, { label: string; className: string }> = {
  best_seller: { label: 'Best Seller', className: 'bg-amber-100 text-amber-800' },
  low_stock: { label: 'Low in Stock', className: 'bg-red-100 text-red-700' },
  limited_time: { label: 'Limited Time', className: 'bg-purple-100 text-purple-700' },
};
