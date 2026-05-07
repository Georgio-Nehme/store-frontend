'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminCreateProduct } from '@/lib/api';

export default function NewProductPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [stock, setStock] = useState(0);
  const [sku, setSku] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await adminCreateProduct({ name, description, price, compare_price: comparePrice || undefined, stock, sku: sku || undefined, is_active: isActive });
      router.push('/admin/products');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Link href="/admin/products" className="text-blue-600 hover:underline text-sm mb-6 block">← Back</Link>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Product</h1>
      <div className="bg-white rounded-xl shadow p-6 max-w-lg">
        {error && <p className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Name *" required>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="input" />
          </Field>
          <Field label="Description">
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="input" />
          </Field>
          <Field label="Price *" required>
            <input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} required className="input" />
          </Field>
          <Field label="Compare Price (original/was price)">
            <input type="number" step="0.01" min="0" value={comparePrice} onChange={e => setComparePrice(e.target.value)} placeholder="Leave blank for no sale badge" className="input" />
          </Field>
          <Field label="Stock">
            <input type="number" min="0" value={stock} onChange={e => setStock(parseInt(e.target.value) || 0)} className="input" />
          </Field>
          <Field label="SKU">
            <input type="text" value={sku} onChange={e => setSku(e.target.value)} className="input" />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
          <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium transition-colors">
            {loading ? 'Creating...' : 'Create Product'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="[&_.input]:w-full [&_.input]:border [&_.input]:rounded-lg [&_.input]:px-3 [&_.input]:py-2 [&_.input]:focus:outline-none [&_.input]:focus:ring-2 [&_.input]:focus:ring-blue-500">
        {children}
      </div>
    </div>
  );
}
