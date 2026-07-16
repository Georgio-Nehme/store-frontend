'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { adminCreateRefund, adminGetCustomers, adminGetOrder, adminUpdateOrderStatus, getStoreSettings } from '@/lib/api';
import { Customer, Order, StoreSettings } from '@/lib/types';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const ALL_STATUSES: Order['status'][] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

function formatMoney(value: string) {
  return `$${parseFloat(value || '0').toFixed(2)}`;
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const fetchedOrder = await adminGetOrder(id);
      setOrder(fetchedOrder);
      if (fetchedOrder.customer_id) {
        const customers = await adminGetCustomers();
        setCustomer(customers.find(c => c.id === fetchedOrder.customer_id) ?? null);
      } else {
        setCustomer(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);
  useEffect(() => { getStoreSettings().then(setStoreSettings).catch(() => setStoreSettings(null)); }, []);

  async function handleCreateRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    setRefundError(null);
    setRefundSubmitting(true);
    try {
      await adminCreateRefund(order.id, { amount: refundAmount, reason: refundReason || undefined });
      setRefundAmount('');
      setRefundReason('');
      await load();
    } catch (err: unknown) {
      setRefundError(err instanceof Error ? err.message : 'Failed to issue refund');
    } finally {
      setRefundSubmitting(false);
    }
  }

  async function handleStatusChange(newStatus: Order['status']) {
    if (!order) return;
    setUpdating(true);
    try {
      const updated = await adminUpdateOrderStatus(order.id, newStatus);
      setOrder(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  }

  async function handleDownloadPdf() {
    if (!order) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'My Store';
    const marginX = 14;
    let y = 18;

    doc.setFontSize(16);
    doc.text(storeName, marginX, y);
    doc.setFontSize(10);
    doc.text('Delivery Order', marginX, (y += 6));

    doc.setFontSize(10);
    doc.text(`Order #${order.id.slice(0, 8).toUpperCase()}`, 140, 18);
    doc.text(new Date(order.created_at).toLocaleDateString(), 140, 24);
    doc.text(order.status.toUpperCase(), 140, 30);

    y += 10;
    doc.setFontSize(11);
    doc.text('Deliver To:', marginX, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(recipientName, marginX, y);
    if (recipientPhone) doc.text(recipientPhone, marginX, (y += 5));
    if (recipientEmail) doc.text(recipientEmail, marginX, (y += 5));
    if (shippingAddress) {
      const lines = doc.splitTextToSize(shippingAddress, 180);
      doc.text(lines, marginX, (y += 5));
      y += lines.length * 5;
    }

    y += 8;
    doc.setFontSize(10);
    doc.text('Item', marginX, y);
    doc.text('Qty', 130, y);
    doc.text('Price', 150, y);
    doc.text('Total', 175, y);
    y += 2;
    doc.line(marginX, y, 196, y);
    y += 6;

    order.items.forEach(item => {
      const label = item.variant_label_snapshot
        ? `${item.product_name_snapshot || 'Item'} (${item.variant_label_snapshot})`
        : item.product_name_snapshot || 'Item';
      const lineTotal = (parseFloat(item.unit_price) * item.quantity).toFixed(2);
      doc.text(doc.splitTextToSize(label, 110), marginX, y);
      doc.text(String(item.quantity), 130, y);
      doc.text(`$${parseFloat(item.unit_price).toFixed(2)}`, 150, y);
      doc.text(`$${lineTotal}`, 175, y);
      y += 7;
    });

    y += 4;
    doc.line(140, y, 196, y);
    y += 6;
    doc.text('Subtotal', 140, y);
    doc.text(`$${subtotal.toFixed(2)}`, 175, y);
    if (parseFloat(order.discount_amount) > 0) {
      y += 6;
      doc.text('Discount', 140, y);
      doc.text(`-$${parseFloat(order.discount_amount).toFixed(2)}`, 175, y);
    }
    y += 6;
    doc.text('Delivery', 140, y);
    doc.text(`$${parseFloat(order.delivery_fee).toFixed(2)}`, 175, y);
    if (parseFloat(order.tax_amount) > 0) {
      y += 6;
      doc.text('Tax', 140, y);
      doc.text(`$${parseFloat(order.tax_amount).toFixed(2)}`, 175, y);
    }
    y += 7;
    doc.setFontSize(11);
    doc.text('Total', 140, y);
    doc.text(`$${parseFloat(order.total_amount).toFixed(2)}`, 175, y);

    doc.save(`delivery-order-${order.id.slice(0, 8)}.pdf`);
  }

  async function handleDownloadInvoice() {
    if (!order) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'My Store';
    const marginX = 14;
    let y = 18;

    doc.setFontSize(16);
    doc.text(storeName, marginX, y);
    doc.setFontSize(10);
    doc.text('Invoice', marginX, (y += 6));

    doc.setFontSize(10);
    doc.text(`Invoice #${String(order.invoice_number).padStart(6, '0')}`, 140, 18);
    doc.text(`Order #${order.id.slice(0, 8).toUpperCase()}`, 140, 24);
    doc.text(new Date(order.created_at).toLocaleDateString(), 140, 30);

    y += 10;
    doc.setFontSize(11);
    doc.text('Bill To:', marginX, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(recipientName, marginX, y);
    if (recipientEmail) doc.text(recipientEmail, marginX, (y += 5));
    if (shippingAddress) {
      const lines = doc.splitTextToSize(shippingAddress, 180);
      doc.text(lines, marginX, (y += 5));
      y += lines.length * 5;
    }

    y += 8;
    doc.setFontSize(10);
    doc.text('Item', marginX, y);
    doc.text('Qty', 130, y);
    doc.text('Price', 150, y);
    doc.text('Total', 175, y);
    y += 2;
    doc.line(marginX, y, 196, y);
    y += 6;

    order.items.forEach(item => {
      const label = item.variant_label_snapshot
        ? `${item.product_name_snapshot || 'Item'} (${item.variant_label_snapshot})`
        : item.product_name_snapshot || 'Item';
      const lineTotal = (parseFloat(item.unit_price) * item.quantity).toFixed(2);
      doc.text(doc.splitTextToSize(label, 110), marginX, y);
      doc.text(String(item.quantity), 130, y);
      doc.text(`$${parseFloat(item.unit_price).toFixed(2)}`, 150, y);
      doc.text(`$${lineTotal}`, 175, y);
      y += 7;
    });

    y += 4;
    doc.line(140, y, 196, y);
    y += 6;
    doc.text('Subtotal', 140, y);
    doc.text(`$${subtotal.toFixed(2)}`, 175, y);
    if (parseFloat(order.discount_amount) > 0) {
      y += 6;
      doc.text('Discount', 140, y);
      doc.text(`-$${parseFloat(order.discount_amount).toFixed(2)}`, 175, y);
    }
    y += 6;
    doc.text('Delivery', 140, y);
    doc.text(`$${parseFloat(order.delivery_fee).toFixed(2)}`, 175, y);
    if (parseFloat(order.tax_amount) > 0) {
      y += 6;
      doc.text(`Tax (${storeSettings?.tax_rate ? parseFloat(storeSettings.tax_rate) : ''}%)`, 140, y);
      doc.text(`$${parseFloat(order.tax_amount).toFixed(2)}`, 175, y);
    }
    y += 7;
    doc.setFontSize(11);
    doc.text('Total', 140, y);
    doc.text(`$${parseFloat(order.total_amount).toFixed(2)}`, 175, y);
    if (parseFloat(order.total_refunded) > 0) {
      y += 6;
      doc.setFontSize(10);
      doc.text('Refunded', 140, y);
      doc.text(`-$${parseFloat(order.total_refunded).toFixed(2)}`, 175, y);
    }

    doc.save(`invoice-${String(order.invoice_number).padStart(6, '0')}.pdf`);
  }

  if (loading) return <div className="animate-pulse bg-white rounded-xl h-64 max-w-3xl" />;
  if (error) return <p className="text-red-600 text-sm p-3 bg-red-50 rounded-lg">{error}</p>;
  if (!order) return null;

  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'My Store';
  const recipientName = customer?.name || order.guest_info?.name || 'Guest';
  const recipientEmail = customer?.email || order.guest_info?.email || '';
  const recipientPhone = customer?.phone || order.guest_info?.phone || '';
  const shippingAddress = order.shipping_address || order.guest_info?.shipping_address || '';
  const subtotal = order.items.reduce((sum, item) => sum + parseFloat(item.unit_price) * item.quantity, 0);

  return (
    <div>
      <div className="print:hidden">
        <Link href="/admin/orders" className="text-blue-600 hover:underline text-sm mb-6 block">← Back to Orders</Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={order.status}
              disabled={updating}
              onChange={e => handleStatusChange(e.target.value as Order['status'])}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none ${statusColors[order.status]}`}
            >
              {ALL_STATUSES.map(s => <option key={s} value={s} className="bg-white text-gray-800">{s}</option>)}
            </select>
            <button onClick={() => window.print()} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-900 transition-colors">
              Print
            </button>
            <button onClick={handleDownloadPdf} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
              Download PDF
            </button>
            {storeSettings?.finance_plugin_enabled && order.invoice_number && (
              <button onClick={handleDownloadInvoice} className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors">
                Download Invoice
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow print:shadow-none p-6 sm:p-8 max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 pb-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{storeName}</h2>
            <p className="text-sm text-gray-500 mt-1">Delivery Order</p>
          </div>
          <div className="sm:text-right text-sm text-gray-500">
            <p>Order #{order.id.slice(0, 8).toUpperCase()}</p>
            <p>{new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="capitalize mt-1 font-medium text-gray-700">{order.status}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Deliver To</p>
            <p className="font-medium text-gray-800">{recipientName}</p>
            {recipientPhone && <p className="text-sm text-gray-600">{recipientPhone}</p>}
            {recipientEmail && <p className="text-sm text-gray-600">{recipientEmail}</p>}
            {shippingAddress && <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{shippingAddress}</p>}
          </div>
          {order.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Notes</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm mb-6">
            <thead className="border-b text-left text-gray-500 uppercase text-xs">
              <tr>
                <th className="py-2 pr-2">Item</th>
                <th className="py-2 pr-2">Qty</th>
                <th className="py-2 pr-2 text-right">Price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map(item => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2 pr-2">
                    {item.product_name_snapshot || 'Item'}
                    {item.variant_label_snapshot && <span className="text-gray-400"> ({item.variant_label_snapshot})</span>}
                  </td>
                  <td className="py-2 pr-2">{item.quantity}</td>
                  <td className="py-2 pr-2 text-right">{formatMoney(item.unit_price)}</td>
                  <td className="py-2 text-right">{formatMoney(String(parseFloat(item.unit_price) * item.quantity))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-end gap-1 text-sm">
          <div className="flex justify-between w-48"><span className="text-gray-500">Subtotal</span><span>{formatMoney(String(subtotal))}</span></div>
          {parseFloat(order.discount_amount) > 0 && (
            <div className="flex justify-between w-48 text-green-600"><span>Discount</span><span>-{formatMoney(order.discount_amount)}</span></div>
          )}
          <div className="flex justify-between w-48"><span className="text-gray-500">Delivery</span><span>{formatMoney(order.delivery_fee)}</span></div>
          {parseFloat(order.tax_amount) > 0 && (
            <div className="flex justify-between w-48"><span className="text-gray-500">Tax</span><span>{formatMoney(order.tax_amount)}</span></div>
          )}
          <div className="flex justify-between w-48 font-bold text-base border-t pt-1 mt-1"><span>Total</span><span>{formatMoney(order.total_amount)}</span></div>
          {parseFloat(order.total_refunded) > 0 && (
            <div className="flex justify-between w-48 text-red-600"><span>Refunded</span><span>-{formatMoney(order.total_refunded)}</span></div>
          )}
        </div>

        {storeSettings?.finance_plugin_enabled && (
          <div className="print:hidden mt-8 pt-6 border-t">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Refunds</h3>
            {order.refunds.length > 0 && (
              <div className="mb-4 space-y-2">
                {order.refunds.map(r => (
                  <div key={r.id} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <div>
                      <span className="font-medium text-gray-800">{formatMoney(r.amount)}</span>
                      {r.reason && <span className="text-gray-500 ml-2">{r.reason}</span>}
                    </div>
                    <span className="text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
            {refundError && <p className="text-red-600 text-sm mb-3 p-2 bg-red-50 rounded-lg">{refundError}</p>}
            <form onSubmit={handleCreateRefund} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={refundAmount}
                  onChange={e => setRefundAmount(e.target.value)}
                  className="w-32 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={refundSubmitting}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:bg-gray-300 font-medium transition-colors"
              >
                {refundSubmitting ? 'Issuing…' : 'Issue Refund'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
