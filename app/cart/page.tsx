'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';

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
        {items.map(({ product, quantity }) => (
          <div key={product.id} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className="bg-gray-200 w-16 h-16 rounded-lg flex items-center justify-center shrink-0">
              <span className="font-bold text-gray-400">
                {product.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{product.name}</p>
              <p className="text-blue-600 font-medium">${parseFloat(product.price).toFixed(2)} × {quantity}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateQuantity(product.id, quantity - 1)} className="w-7 h-7 rounded border hover:bg-gray-100 flex items-center justify-center text-lg">−</button>
              <span className="w-8 text-center">{quantity}</span>
              <button onClick={() => updateQuantity(product.id, Math.min(quantity + 1, product.stock))} className="w-7 h-7 rounded border hover:bg-gray-100 flex items-center justify-center text-lg">+</button>
            </div>
            <p className="w-20 text-right font-semibold">${(parseFloat(product.price) * quantity).toFixed(2)}</p>
            <button onClick={() => removeItem(product.id)} className="text-red-500 hover:text-red-700 text-sm ml-2">Remove</button>
          </div>
        ))}
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
