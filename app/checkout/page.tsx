'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { createOrder, getCustomerSession, getCustomerId, getPublicStoreSettings, validatePromoCode } from '@/lib/api';
import LebanonAddressForm from '@/components/LebanonAddressForm';
import { EMPTY_LEBANON_ADDRESS, formatLebanonAddress, LebanonAddress } from '@/lib/lebanon';

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const [address, setAddress] = useState<LebanonAddress>(EMPTY_LEBANON_ADDRESS);
  const [notes, setNotes] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoMsg, setPromoMsg] = useState('');
  const [promoValid, setPromoValid] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [loading, setLoading] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    setHasSession(!!getCustomerSession());
    getPublicStoreSettings()
      .then(settings => setDeliveryFee(parseFloat(settings.delivery_fee) || 0))
      .catch(() => setDeliveryFee(0));
  }, []);

  const discountedSubtotal = useMemo(
    () => Math.max(0, total - (promoValid ? discountAmount : 0)),
    [discountAmount, promoValid, total],
  );
  const finalTotal = discountedSubtotal + deliveryFee;

  if (!hasSession) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-700 text-lg mb-4">Please log in to checkout</p>
        <Link href="/login" className="text-blue-600 hover:underline">Go to Login</Link>
      </main>
    );
  }

  if (orderId) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-green-700 mb-2">Order Placed!</h2>
          <p className="text-gray-600 mb-4">Order ID: <span className="font-mono font-semibold">{orderId}</span></p>
          <Link href="/" className="text-blue-600 hover:underline">Continue Shopping</Link>
        </div>
      </main>
    );
  }

  async function applyPromoCode() {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoMsg('');
    try {
      const res = await validatePromoCode(promoCode.trim(), total);
      setPromoValid(res.valid);
      setPromoMsg(res.message);
      setDiscountAmount(res.valid ? parseFloat(res.discount_amount) : 0);
    } catch {
      setPromoMsg('Failed to validate code');
      setPromoValid(false);
      setDiscountAmount(0);
    } finally {
      setPromoLoading(false);
    }
  }

  function removePromoCode() {
    setPromoCode('');
    setPromoMsg('');
    setPromoValid(false);
    setDiscountAmount(0);
  }

  function hasRequiredAddressFields() {
    return !!(
      address.governorate.trim() &&
      address.district.trim() &&
      address.city.trim() &&
      address.street.trim()
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const customerId = getCustomerId();
    if (!customerId) {
      setError('Invalid session. Please log in again.');
      return;
    }
    if (!hasRequiredAddressFields()) {
      setError('Governorate, district, city, and street are required.');
      return;
    }
    setLoading(true);
    try {
      const order = await createOrder({
        customer_id: customerId,
        items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
        shipping_address: formatLebanonAddress(address),
        notes: notes || undefined,
        promo_code: promoValid ? promoCode.trim() : undefined,
      });
      clearCart();
      setOrderId(order.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout</h1>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">Order Summary</h2>
        {items.length === 0 ? (
          <p className="text-gray-500">Your cart is empty. <Link href="/" className="text-blue-600 hover:underline">Shop now</Link></p>
        ) : (
          <>
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex justify-between py-2 border-b last:border-0">
                <span className="text-gray-700">{product.name} × {quantity}</span>
                <span className="font-medium">${(parseFloat(product.price) * quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 text-gray-600">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            {promoValid && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Discount ({promoCode.toUpperCase()})</span>
                <span>−${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Delivery</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-3 font-bold text-lg border-t mt-2">
              <span>Total</span>
              <span>${finalTotal.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      {items.length > 0 && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
          {error && <p className="text-red-600 text-sm p-3 bg-red-50 rounded-lg">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code</label>
            {promoValid ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-green-700 text-sm font-medium flex-1">{promoMsg}</span>
                <button type="button" onClick={removePromoCode} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
                <button
                  type="button"
                  onClick={applyPromoCode}
                  disabled={promoLoading || !promoCode.trim()}
                  className="px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
                >
                  {promoLoading ? '...' : 'Apply'}
                </button>
              </div>
            )}
            {!promoValid && promoMsg && (
              <p className="text-red-500 text-xs mt-1">{promoMsg}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Shipping Address</label>
            <LebanonAddressForm value={address} onChange={setAddress} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Special instructions..."
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium transition-colors"
          >
            {loading ? 'Placing Order...' : `Place Order · $${finalTotal.toFixed(2)}`}
          </button>
        </form>
      )}
    </main>
  );
}
