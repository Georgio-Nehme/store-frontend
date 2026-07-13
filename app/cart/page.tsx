'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { CartConfigurationEntry } from '@/lib/types';

function configurationSummary(configuration: CartConfigurationEntry[] | null) {
  if (!configuration) return [];
  return configuration
    .map(entry => {
      if (entry.input_type === 'text') {
        return entry.text_value ? `${entry.group_name}: ${entry.text_value}` : null;
      }
      if (entry.selected_choices.length === 0) return null;
      return `${entry.group_name}: ${entry.selected_choices.map(choice => choice.label).join(', ')}`;
    })
    .filter(Boolean) as string[];
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, total } = useCart();

  if (items.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 text-xl mb-4">Your cart is empty</p>
        <Link href="/" className="text-blue-600 hover:underline">← Continue Shopping</Link>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Your Cart</h1>
      <div className="flex flex-col gap-4 mb-8">
        {items.map(item => {
          const summary = configurationSummary(item.configuration);
          const itemKey = `${item.product_id}:${item.variant_id ?? 'base'}:${(item.configuration ?? [])
            .map(entry => `${entry.group_id}:${entry.selected_choices.map(choice => choice.choice_id).sort().join(',')}:${entry.text_value || ''}`)
            .join('|')}`;
          const initials = (item.product_name || 'Item')
            .split(' ')
            .slice(0, 2)
            .map(word => word[0])
            .join('')
            .toUpperCase();

          return (
            <div key={itemKey} className="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-gray-200 w-16 h-16 rounded-lg flex items-center justify-center shrink-0">
                  <span className="font-bold text-gray-400">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{item.product_name || 'Product'}</p>
                  {item.variant_label && <p className="text-xs text-gray-500 mt-1">Variant: {item.variant_label}</p>}
                  {summary.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {summary.map(line => (
                        <p key={line} className="text-xs text-gray-500">{line}</p>
                      ))}
                    </div>
                  )}
                  <p className="text-blue-600 font-medium mt-1">${parseFloat(item.unit_price).toFixed(2)} × {item.quantity}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.variant_id, item.configuration)}
                    className="w-7 h-7 rounded border hover:bg-gray-100 flex items-center justify-center text-lg"
                  >
                    −
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.variant_id, item.configuration)}
                    className="w-7 h-7 rounded border hover:bg-gray-100 flex items-center justify-center text-lg"
                  >
                    +
                  </button>
                </div>
                <p className="w-20 text-right font-semibold">${(parseFloat(item.unit_price) * item.quantity).toFixed(2)}</p>
                <button
                  onClick={() => removeItem(item.product_id, item.variant_id, item.configuration)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-white rounded-xl shadow p-6 flex flex-col items-end gap-4">
        <p className="text-xl font-bold text-gray-800">Total: ${total.toFixed(2)}</p>
        <Link href="/checkout" className="bg-blue-600 text-white py-3 px-8 rounded-lg hover:bg-blue-700 font-medium transition-colors">
          Proceed to Checkout
        </Link>
      </div>
    </main>
  );
}
