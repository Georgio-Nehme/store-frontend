'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminGetProducts, adminDeleteProduct, adminUpdateStock } from '@/lib/api';
import { Product } from '@/lib/types';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await adminGetProducts();
      setProducts(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await adminDeleteProduct(id);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleStock(id: string, change: number) {
    try {
      await adminUpdateStock(id, change);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Stock update failed');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Products</h1>
        <Link href="/admin/products/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Add Product
        </Link>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {loading ? (
        <div className="animate-pulse bg-white rounded-xl h-64" />
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{p.sku || '—'}</td>
                  <td className="px-4 py-3">
                    <div>
                      <span>${parseFloat(p.price).toFixed(2)}</span>
                      {p.compare_price && parseFloat(p.compare_price) > parseFloat(p.price) && (
                        <span className="ml-2 text-xs text-gray-400 line-through">${parseFloat(p.compare_price).toFixed(2)}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleStock(p.id, -1)} className="w-6 h-6 border rounded hover:bg-gray-100">−</button>
                      <span className="w-8 text-center">{p.stock}</span>
                      <button onClick={() => handleStock(p.id, 1)} className="w-6 h-6 border rounded hover:bg-gray-100">+</button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/admin/products/${p.id}/edit`} className="text-blue-600 hover:underline text-xs">Edit</Link>
                      <button onClick={() => handleDelete(p.id, p.name)} className="text-red-500 hover:underline text-xs">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-gray-400 text-center">No products found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
