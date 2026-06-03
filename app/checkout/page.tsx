'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import {
  createAddress,
  createOrder,
  getCustomerId,
  getCustomerSession,
  getMyAddresses,
  getPublicStoreSettings,
  validatePromoCode,
} from '@/lib/api';
import LebanonAddressForm from '@/components/LebanonAddressForm';
import { EMPTY_LEBANON_ADDRESS, formatLebanonAddress, LebanonAddress } from '@/lib/lebanon';
import { CartConfigurationEntry, CustomerAddress } from '@/lib/types';

const NEW_ADDRESS_VALUE = '__new__';

function toLebanonAddress(address: CustomerAddress): LebanonAddress {
  return {
    governorate: address.governorate,
    district: address.district,
    city: address.city,
    street: address.street,
    building: address.building ?? '',
    floor: address.floor ?? '',
  };
}

function toCartConfigurationInput(configuration: CartConfigurationEntry[] | null) {
  return configuration?.map(entry => ({
    group_id: entry.group_id,
    selected_choice_ids: entry.selected_choices.map(choice => choice.choice_id),
    text_value: entry.text_value,
  }));
}

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const [address, setAddress] = useState<LebanonAddress>(EMPTY_LEBANON_ADDRESS);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(NEW_ADDRESS_VALUE);
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true);
  const [addressLabel, setAddressLabel] = useState('Home');
  const [notes, setNotes] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoMsg, setPromoMsg] = useState('');
  const [promoValid, setPromoValid] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [loading, setLoading] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [allowGuestOrders, setAllowGuestOrders] = useState(false);

  // Guest-specific fields
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  useEffect(() => {
    const session = getCustomerSession();
    setHasSession(!!session);

    getPublicStoreSettings()
      .then(settings => {
        setDeliveryFee(parseFloat(settings.delivery_fee) || 0);
        setAllowGuestOrders(settings.allow_guest_orders ?? false);
      })
      .catch(() => setDeliveryFee(0));

    if (!session) {
      setAddressesLoading(false);
      return;
    }

    getMyAddresses()
      .then(addresses => {
        setSavedAddresses(addresses);
        setSelectedAddressId(addresses.find(addr => addr.is_default)?.id ?? addresses[0]?.id ?? NEW_ADDRESS_VALUE);
      })
      .catch(() => {
        setSavedAddresses([]);
        setSelectedAddressId(NEW_ADDRESS_VALUE);
      })
      .finally(() => setAddressesLoading(false));
  }, []);

  const discountedSubtotal = useMemo(
    () => Math.max(0, total - (promoValid ? discountAmount : 0)),
    [discountAmount, promoValid, total],
  );
  const finalTotal = discountedSubtotal + deliveryFee;
  const selectedSavedAddress = savedAddresses.find(saved => saved.id === selectedAddressId) ?? null;
  const usingNewAddress = selectedSavedAddress === null;

  const isGuest = !hasSession && allowGuestOrders;

  // If not logged in and guest orders not allowed, show gate
  if (!hasSession && !allowGuestOrders) {
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
          {successNote && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">{successNote}</p>}
          {isGuest && (
            <p className="text-sm text-gray-500 mb-4">
              Save your order ID — guest orders don&apos;t appear in an account history.
            </p>
          )}
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
    if (!usingNewAddress) return true;
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
    setSuccessNote(null);

    if (!isGuest) {
      const customerId = getCustomerId();
      if (!customerId) {
        setError('Invalid session. Please log in again.');
        return;
      }
    }

    if (!hasRequiredAddressFields()) {
      setError('Governorate, district, city, and street are required.');
      return;
    }

    if (isGuest && !guestName.trim()) {
      setError('Name is required.');
      return;
    }
    if (isGuest && !guestPhone.trim()) {
      setError('Phone number is required.');
      return;
    }

    const shippingAddress = usingNewAddress
      ? formatLebanonAddress(address)
      : formatLebanonAddress(toLebanonAddress(selectedSavedAddress!));

    setLoading(true);
    try {
      const order = await createOrder({
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          variant_id: item.variant_id,
          configuration: toCartConfigurationInput(item.configuration) ?? undefined,
        })),
        shipping_address: shippingAddress,
        notes: notes || undefined,
        promo_code: promoValid ? promoCode.trim() : undefined,
        ...(isGuest
          ? {
              guest_info: {
                name: guestName.trim(),
                phone: guestPhone.trim(),
                email: guestEmail.trim() || undefined,
                shipping_address: shippingAddress,
              },
            }
          : {}),
      });

      if (!isGuest && usingNewAddress && saveAddressForFuture) {
        try {
          await createAddress({
            label: addressLabel.trim() || null,
            governorate: address.governorate.trim(),
            district: address.district.trim(),
            city: address.city.trim(),
            street: address.street.trim(),
            building: address.building.trim() || null,
            floor: address.floor.trim() || null,
            is_default: savedAddresses.length === 0,
          });
        } catch (saveErr: unknown) {
          setSuccessNote(
            saveErr instanceof Error
              ? `Your order was placed, but we couldn't save the address: ${saveErr.message}`
              : "Your order was placed, but we couldn't save the address.",
          );
        }
      }

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

      {isGuest && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-blue-500 text-lg mt-0.5">ℹ️</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium">Checking out as guest</p>
            <p className="mt-1">
              <Link href="/login" className="underline hover:text-blue-600">Log in or create an account</Link> to track your orders and save your address.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">Order Summary</h2>
        {items.length === 0 ? (
          <p className="text-gray-500">Your cart is empty. <Link href="/" className="text-blue-600 hover:underline">Shop now</Link></p>
        ) : (
          <>
            {items.map(item => {
              const itemKey = `${item.product_id}:${item.variant_id ?? 'base'}:${(item.configuration ?? [])
                .map(entry => `${entry.group_id}:${entry.selected_choices.map(choice => choice.choice_id).sort().join(',')}:${entry.text_value || ''}`)
                .join('|')}`;
              return (
              <div key={itemKey} className="flex justify-between py-2 border-b last:border-0 gap-4">
                <div>
                  <span className="text-gray-700">{item.product_name || 'Product'} × {item.quantity}</span>
                  {item.variant_label && <p className="text-xs text-gray-500 mt-1">{item.variant_label}</p>}
                </div>
                <span className="font-medium">${(parseFloat(item.unit_price) * item.quantity).toFixed(2)}</span>
              </div>
              );
            })}
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

          {/* Guest contact info */}
          {isGuest && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Your Contact Info</h3>
              <input
                type="text"
                placeholder="Full name *"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="Phone number *"
                value={guestPhone}
                onChange={e => setGuestPhone(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={guestEmail}
                onChange={e => setGuestEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

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
            {addressesLoading && !isGuest ? (
              <div className="text-sm text-gray-500 border rounded-lg px-4 py-3">Loading saved addresses...</div>
            ) : (
              <div className="space-y-4">
                {!isGuest && savedAddresses.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Saved Addresses</p>
                    {savedAddresses.map(saved => (
                      <label
                        key={saved.id}
                        className={`flex gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${selectedAddressId === saved.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <input
                          type="radio"
                          name="shipping-address"
                          value={saved.id}
                          checked={selectedAddressId === saved.id}
                          onChange={() => setSelectedAddressId(saved.id)}
                          className="mt-1"
                        />
                        <div className="text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{saved.label || 'Saved address'}</span>
                            {saved.is_default && <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Default</span>}
                          </div>
                          <p>{saved.city}, {saved.street}</p>
                          <p className="text-gray-500">{saved.district}, {saved.governorate}</p>
                        </div>
                      </label>
                    ))}
                    <label className={`flex gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${usingNewAddress ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="shipping-address"
                        value={NEW_ADDRESS_VALUE}
                        checked={usingNewAddress}
                        onChange={() => setSelectedAddressId(NEW_ADDRESS_VALUE)}
                        className="mt-1"
                      />
                      <div className="text-sm text-gray-700">
                        <p className="font-medium">Use new address</p>
                        <p className="text-gray-500">Enter a different delivery address for this order.</p>
                      </div>
                    </label>
                  </div>
                )}

                {(isGuest || usingNewAddress) && <LebanonAddressForm value={address} onChange={setAddress} />}

                {!isGuest && usingNewAddress && (
                  <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={saveAddressForFuture}
                        onChange={e => setSaveAddressForFuture(e.target.checked)}
                      />
                      Save this address for future orders
                    </label>
                    {saveAddressForFuture && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address Label</label>
                        <input
                          type="text"
                          value={addressLabel}
                          onChange={e => setAddressLabel(e.target.value)}
                          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. Home or Work"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
            disabled={loading || (!isGuest && addressesLoading)}
            className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium transition-colors"
          >
            {loading ? 'Placing Order...' : `Place Order · $${finalTotal.toFixed(2)}`}
          </button>
        </form>
      )}
    </main>
  );
}
