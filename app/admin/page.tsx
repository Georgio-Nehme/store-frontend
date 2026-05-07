'use client';

import { useEffect, useState } from 'react';
import { adminGetProducts, adminGetOrders, adminGetCustomers } from '@/lib/api';
import { Product, Order, Customer } from '@/lib/types';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminGetProducts(), adminGetOrders(), adminGetCustomers()])
      .then(([p, o, c]) => { setProducts(p); setOrders(o); setCustomers(c); })
      .finally(() => setLoading(false));
  }, []);

  const recentOrders = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-8">Dashboard</h1>
      {loading ? (
        <div className="grid grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl h-24 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard label="Total Products" value={products.length} />
          <StatCard label="Total Orders" value={orders.length} />
          <StatCard label="Total Customers" value={customers.length} />
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Recent Orders</h2>
        {loading ? <div className="animate-pulse h-32 bg-gray-100 rounded" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Order ID</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Total</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 font-mono">{order.id.slice(0, 8)}…</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || ''}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-2">${parseFloat(order.total_amount).toFixed(2)}</td>
                  <td className="py-2 text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && <tr><td colSpan={4} className="py-4 text-gray-400 text-center">No orders yet</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
  );
}
