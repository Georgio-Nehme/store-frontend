'use client';

import { useState, useEffect } from 'react';
import { adminResendSenderVerification, getStoreSettings, updateStoreSettings } from '@/lib/api';

export default function SettingsPage() {
  const [deliveryFee, setDeliveryFee] = useState('');
  const [allowGuestOrders, setAllowGuestOrders] = useState(false);
  const [senderEmail, setSenderEmail] = useState('');
  const [senderEmailVerified, setSenderEmailVerified] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [tagBestSellerEnabled, setTagBestSellerEnabled] = useState(true);
  const [tagLowStockEnabled, setTagLowStockEnabled] = useState(true);
  const [tagLimitedTimeEnabled, setTagLimitedTimeEnabled] = useState(true);
  const [financePluginEnabled, setFinancePluginEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  useEffect(() => {
    getStoreSettings()
      .then(s => {
        setDeliveryFee(s.delivery_fee);
        setAllowGuestOrders(s.allow_guest_orders);
        setSenderEmail(s.sender_email || '');
        setSenderEmailVerified(s.sender_email_verified);
        setLowStockThreshold(s.low_stock_threshold);
        setTagBestSellerEnabled(s.tag_best_seller_enabled);
        setTagLowStockEnabled(s.tag_low_stock_enabled);
        setTagLimitedTimeEnabled(s.tag_limited_time_enabled);
        setFinancePluginEnabled(s.finance_plugin_enabled);
        setTaxRate(s.tax_rate);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      const updated = await updateStoreSettings({
        delivery_fee: parseFloat(deliveryFee) || 0,
        allow_guest_orders: allowGuestOrders,
        sender_email: senderEmail || undefined,
        low_stock_threshold: lowStockThreshold,
        tag_best_seller_enabled: tagBestSellerEnabled,
        tag_low_stock_enabled: tagLowStockEnabled,
        tag_limited_time_enabled: tagLimitedTimeEnabled,
        tax_rate: parseFloat(taxRate) || 0,
      });
      setSenderEmailVerified(updated.sender_email_verified);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResendMsg(null);
    try {
      await adminResendSenderVerification();
      setResendMsg('Verification email sent — check that inbox.');
    } catch (err: unknown) {
      setResendMsg(err instanceof Error ? err.message : 'Failed to resend');
    } finally {
      setResending(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Store Settings</h1>
      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="bg-white rounded-xl shadow p-6 max-w-md">
          {success && <p className="text-green-600 text-sm mb-4 p-3 bg-green-50 rounded-lg">Settings saved!</p>}
          {error && <p className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg">{error}</p>}
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Fee ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={deliveryFee}
                onChange={e => setDeliveryFee(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Set to 0 for free delivery</p>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-gray-700">Allow Guest Orders</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    When enabled, customers can place orders without creating an account.
                    Their contact info is collected at checkout.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={allowGuestOrders}
                  onClick={() => setAllowGuestOrders(v => !v)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${allowGuestOrders ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${allowGuestOrders ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </label>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
              <p className="text-sm font-medium text-gray-700">Product Tags</p>
              <p className="text-xs text-gray-500 -mt-2">
                Choose which merchandising badges show on product cards store-wide.
              </p>
              {[
                { label: 'Best Seller', checked: tagBestSellerEnabled, onChange: setTagBestSellerEnabled },
                { label: 'Low in Stock', checked: tagLowStockEnabled, onChange: setTagLowStockEnabled },
                { label: 'Limited Time Only', checked: tagLimitedTimeEnabled, onChange: setTagLimitedTimeEnabled },
              ].map(({ label, checked, onChange }) => (
                <label key={label} className="flex items-center justify-between gap-4 cursor-pointer">
                  <span className="text-sm text-gray-700">{label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    onClick={() => onChange(v => !v)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </label>
              ))}
              {tagLowStockEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={lowStockThreshold}
                    onChange={e => setLowStockThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Products show the &quot;Low in Stock&quot; badge when stock is at or below this number.
                  </p>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Email Sender</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={e => setSenderEmail(e.target.value)}
                  placeholder="orders@yourstore.com"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Customers get an email from this address when their order status changes.
                </p>
              </div>

              {senderEmail && (
                <div className="flex items-center justify-between gap-3">
                  {senderEmailVerified ? (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800">
                      ✓ Verified
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                      ⏳ Pending — check that inbox for a confirmation link
                    </span>
                  )}
                  {!senderEmailVerified && (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      className="text-xs text-blue-600 hover:underline disabled:text-gray-400"
                    >
                      {resending ? 'Resending...' : 'Resend verification email'}
                    </button>
                  )}
                </div>
              )}
              {resendMsg && <p className="text-xs text-gray-500">{resendMsg}</p>}
            </div>

            <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Accounting &amp; Finance</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tax, invoicing, refunds, and financial/margin reports. Enabled or disabled by
                    your platform provider, not from here.
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${financePluginEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                  {financePluginEnabled ? 'Enabled' : 'Not enabled'}
                </span>
              </div>
              {financePluginEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={taxRate}
                    onChange={e => setTaxRate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Applied to new orders&apos; subtotal (after discount, before delivery fee).
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
