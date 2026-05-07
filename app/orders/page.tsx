'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyOrders, getCustomerSession } from '@/lib/api';
import { Order } from '@/lib/types';
import { useRouter } from 'next/navigation';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  pending: '⏳ Pending',
  confirmed: '✓ Confirmed',
  shipped: '🚚 Shipped',
  delivered: '✅ Delivered',
  cancelled: '✗ Cancelled',
};

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const session = getCustomerSession();
    if (!session) {
      router.push('/login');
      return;
    }
    getMyOrders(session.customer_id)
      .then(setOrders)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load orders'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        {[1, 2].map(i => <div key={i} className="bg-gray-200 rounded-xl h-24 animate-pulse" />)}
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Orders</h1>
        <Link href="/" className="text-blue-600 hover:underline text-sm">← Continue Shopping</Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm mb-6">{error}</div>
      )}

      {!error && orders.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg mb-3">You haven&apos;t placed any orders yet.</p>
          <Link href="/" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors inline-block">
            Start Shopping
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="bg-white rounded-xl shadow p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Order</p>
                <p className="font-mono text-sm text-gray-700">{order.id.slice(0, 8).toUpperCase()}…</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[order.status]}`}>
                {statusLabels[order.status] || order.status}
              </span>
            </div>

            <div className="divide-y divide-gray-50">
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between py-2 text-sm">
                  <span className="text-gray-600">Item × {item.quantity}</span>
                  <span className="font-medium text-gray-800">
                    ${(parseFloat(item.unit_price) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <div className="text-xs text-gray-400 space-y-0.5">
                {order.shipping_address && <p>📦 {order.shipping_address}</p>}
                <p>{new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <p className="font-bold text-gray-800 text-lg">${parseFloat(order.total_amount).toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
