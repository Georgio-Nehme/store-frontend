'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminGetCustomerDetail } from '@/lib/api';
import { CustomerDetail, Order } from '@/lib/types';

const statusColors: Record<Order['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function AdminCustomerDetailPage({ params }: { params: { id: string } }) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        setCustomer(await adminGetCustomerDetail(params.id));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load customer');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [params.id]);

  if (loading) {
    return <div className="animate-pulse bg-white rounded-xl h-64" />;
  }

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <Link href="/admin/customers" className="inline-flex text-sm text-blue-600 hover:underline">← Customers</Link>
        <p className="text-red-600 bg-red-50 rounded-lg p-4 text-sm">{error || 'Customer not found'}</p>
      </div>
    );
  }

  const totalSpent = customer.orders.reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <Link href="/admin/customers" className="inline-flex text-sm text-blue-600 hover:underline">← Customers</Link>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name || 'Unnamed Customer'}</h1>
            <p className="text-sm text-gray-600 mt-1">{customer.email}</p>
            <p className="text-sm text-gray-500 mt-1">{customer.phone || 'No phone number'}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-gray-500">Joined</p>
              <p className="font-medium text-gray-900">{new Date(customer.created_at).toLocaleDateString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-gray-500">Total Orders</p>
              <p className="font-medium text-gray-900">{customer.orders.length}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-gray-500">Total Spent</p>
              <p className="font-medium text-gray-900">${totalSpent.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Saved Addresses</h2>
          <span className="text-sm text-gray-500">{customer.addresses.length} saved</span>
        </div>
        {customer.addresses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {customer.addresses.map(address => (
              <div
                key={address.id}
                className={`rounded-xl border p-4 ${address.is_default ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="font-medium text-gray-900">{address.label || 'Address'}</p>
                  {address.is_default && (
                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                      Default
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium text-gray-700">Governorate:</span> {address.governorate}</p>
                  <p><span className="font-medium text-gray-700">District:</span> {address.district}</p>
                  <p><span className="font-medium text-gray-700">City:</span> {address.city}</p>
                  <p><span className="font-medium text-gray-700">Street:</span> {address.street}</p>
                  <p><span className="font-medium text-gray-700">Building:</span> {address.building || '—'}</p>
                  <p><span className="font-medium text-gray-700">Floor:</span> {address.floor || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No saved addresses</p>
        )}
      </section>

      <section className="bg-white rounded-xl shadow overflow-x-auto">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Orders</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Order ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Shipping Address</th>
            </tr>
          </thead>
          <tbody>
            {customer.orders.map(order => (
              <tr key={order.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(order.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{order.id.slice(0, 8)}…</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{order.items.length}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">${parseFloat(order.total_amount || '0').toFixed(2)}</td>
                <td className="px-4 py-3">
                  <p className="whitespace-pre-wrap text-xs text-gray-600 max-w-[200px]">{order.shipping_address || '—'}</p>
                </td>
              </tr>
            ))}
            {customer.orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No orders yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Abandoned Cart</h2>
        {customer.cart && customer.cart.items.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-4">
            <div>
              <p className="font-semibold text-amber-900">⚠️ Abandoned Cart</p>
              <p className="text-sm text-amber-800 mt-1">Last updated {new Date(customer.cart.updated_at).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              {customer.cart.items.map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-sm text-gray-700">
                  <span className="font-medium">{item.product_name || <span className="font-mono text-xs text-gray-400">{item.product_id.slice(0, 8)}…</span>}</span>
                  <span className="text-gray-500">Qty: {item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No active cart</p>
        )}
      </section>
    </div>
  );
}
