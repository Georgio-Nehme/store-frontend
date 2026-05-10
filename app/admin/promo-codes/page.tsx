'use client';

import { useEffect, useState } from 'react';
import {
  adminGetPromoCodes,
  adminCreatePromoCode,
  adminUpdatePromoCode,
  adminDeletePromoCode,
} from '@/lib/api';
import { PromoCode } from '@/lib/types';
import SortableHeader, { useSortFilter } from '@/components/admin/SortableHeader';

const emptyForm = {
  code: '',
  description: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: '',
  min_order_amount: '',
  max_uses: '',
  expires_at: '',
  is_active: true,
};

export default function AdminPromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setCodes(await adminGetPromoCodes());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await adminCreatePromoCode({
        code: form.code,
        description: form.description || undefined,
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        min_order_amount: form.min_order_amount || undefined,
        max_uses: form.max_uses ? parseInt(form.max_uses) : undefined,
        expires_at: form.expires_at || undefined,
        is_active: form.is_active,
      });
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(code: PromoCode) {
    try {
      await adminUpdatePromoCode(code.id, { is_active: !code.is_active });
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function handleDelete(code: PromoCode) {
    if (!confirm(`Delete promo code "${code.code}"?`)) return;
    try {
      await adminDeletePromoCode(code.id);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  }

  function formatDiscount(code: PromoCode) {
    if (code.discount_type === 'percentage') return `${parseFloat(code.discount_value)}% off`;
    return `$${parseFloat(code.discount_value).toFixed(2)} off`;
  }

  const { sorted, sortCol, sortDir, handleSort, query, setQuery } = useSortFilter(
    codes, 'code', 'asc',
    (c, col) => {
      if (col === 'discount') return parseFloat(c.discount_value);
      if (col === 'uses') return c.uses_count;
      if (col === 'expires') return c.expires_at ? new Date(c.expires_at).getTime() : 0;
      if (col === 'status') return c.is_active ? 'active' : 'inactive';
      return c.code.toLowerCase();
    },
    (c, q) => [c.code, c.description || '', c.is_active ? 'active' : 'inactive'].some(v => v.toLowerCase().includes(q)),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Promo Codes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{codes.length} code{codes.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFormError(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Code'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">Create Promo Code</h2>
          {formError && <p className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg">{formError}</p>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input
                type="text"
                required
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SUMMER20"
                className="w-full border rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type *</label>
              <select
                value={form.discount_type}
                onChange={e => setForm({ ...form, discount_type: e.target.value as 'percentage' | 'fixed' })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Value * {form.discount_type === 'percentage' ? '(0–100)' : '($)'}
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0.01"
                max={form.discount_type === 'percentage' ? 100 : undefined}
                value={form.discount_value}
                onChange={e => setForm({ ...form, discount_value: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.min_order_amount}
                onChange={e => setForm({ ...form, min_order_amount: e.target.value })}
                placeholder="No minimum"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
              <input
                type="number"
                min="1"
                value={form.max_uses}
                onChange={e => setForm({ ...form, max_uses: e.target.value })}
                placeholder="Unlimited"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={e => setForm({ ...form, expires_at: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Internal note (optional)"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">Active immediately</span>
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="ml-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm font-medium transition-colors"
              >
                {submitting ? 'Creating...' : 'Create Code'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by code, description, or status…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full sm:w-80 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="animate-pulse bg-white rounded-xl h-64" />
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <SortableHeader label="Code" column="code" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Discount" column="discount" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3">Min Order</th>
                <SortableHeader label="Uses" column="uses" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Expires" column="expires" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Status" column="status" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(code => (
                <tr key={code.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                      {code.code}
                    </span>
                    {code.description && (
                      <p className="text-gray-400 text-xs mt-0.5">{code.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-blue-700">{formatDiscount(code)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {code.min_order_amount ? `$${parseFloat(code.min_order_amount).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {code.uses_count}
                    {code.max_uses !== null ? ` / ${code.max_uses}` : ' / ∞'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(code)}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        code.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      } transition-colors`}
                    >
                      {code.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(code)}
                      className="text-red-500 hover:underline text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-gray-400 text-center">
                    {query ? 'No promo codes match your search' : 'No promo codes yet. Create one above.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
