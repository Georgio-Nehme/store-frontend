'use client';

import { useEffect, useState } from 'react';
import { adminGetOrders, adminGetCustomers, adminUpdateOrderStatus } from '@/lib/api';
import { Order, Customer } from '@/lib/types';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const ALL_STATUSES: Order['status'][] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Map<string, Customer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [fetchedOrders, fetchedCustomers] = await Promise.all([
        adminGetOrders(),
        adminGetCustomers(),
      ]);
      setOrders(fetchedOrders);
      setCustomers(new Map(fetchedCustomers.map(c => [c.id, c])));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleStatusChange(orderId: string, newStatus: Order['status']) {
    setUpdatingId(orderId);
    try {
      const updated = await adminUpdateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
        <button onClick={load} className="text-sm text-blue-600 hover:underline">Refresh</button>
      </div>
      {error && <p className="text-red-600 mb-4 p-3 bg-red-50 rounded-lg text-sm">{error}</p>}
      {loading ? (
        <div className="animate-pulse bg-white rounded-xl h-64" />
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Shipping</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const customer = customers.get(o.customer_id);
                return (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{o.id.slice(0, 8)}…</td>
                    <td className="px-4 py-3">
                      {customer ? (
                        <div>
                          <p className="font-medium text-gray-800">{customer.name || customer.email}</p>
                          {customer.name && <p className="text-xs text-gray-400">{customer.email}</p>}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs font-mono">{o.customer_id.slice(0, 8)}…</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={o.status}
                        disabled={updatingId === o.id}
                        onChange={e => handleStatusChange(o.id, e.target.value as Order['status'])}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none ${statusColors[o.status]}`}
                      >
                        {ALL_STATUSES.map(s => (
                          <option key={s} value={s} className="bg-white text-gray-800">{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{o.items.length}</td>
                    <td className="px-4 py-3 font-semibold">${parseFloat(o.total_amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{o.shipping_address || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-gray-400 text-center">No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
