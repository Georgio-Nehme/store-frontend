'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminDeleteProduct, adminGetProducts, adminUpdateStock } from '@/lib/api';
import { Product } from '@/lib/types';
import SortableHeader, { useSortFilter } from '@/components/admin/SortableHeader';
import TableStats from '@/components/admin/TableStats';
import ExportCsvButton from '@/components/admin/ExportCsvButton';

function getVal(p: Product, col: string): string | number {
  if (col === 'price') return parseFloat(p.price);
  if (col === 'stock') return p.stock;
  if (col === 'status') return p.is_active ? 'active' : 'inactive';
  if (col === 'type') return p.product_type;
  return p.name.toLowerCase();
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setProducts(await adminGetProducts());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const { sorted, sortCol, sortDir, handleSort, query, setQuery } = useSortFilter(
    products,
    'name',
    'asc',
    getVal,
    (p, q) => [p.name, p.sku || '', p.product_type, p.category?.name || '', p.is_active ? 'active' : 'inactive'].some(v => v.toLowerCase().includes(q)),
  );

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

  const thCls = 'text-left text-gray-500 uppercase text-xs tracking-wide';
  const totalStock = sorted.reduce((sum, p) => sum + (p.stock || 0), 0);
  const inventoryValue = sorted.reduce((sum, p) => sum + parseFloat(p.price) * (p.stock || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Products</h1>
        <div className="flex items-center gap-3">
          <ExportCsvButton
            data={sorted}
            filename="products.csv"
            columns={[
              { label: 'Name', value: p => p.name },
              { label: 'Category', value: p => p.category?.name || '' },
              { label: 'Type', value: p => p.product_type },
              { label: 'SKU', value: p => p.sku || '' },
              { label: 'Price', value: p => parseFloat(p.price).toFixed(2) },
              { label: 'Stock', value: p => p.stock },
              { label: 'Status', value: p => p.is_active ? 'active' : 'inactive' },
            ]}
          />
          <Link href="/admin/products/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
            + Add Product
          </Link>
        </div>
      </div>

      <TableStats stats={[
        { label: 'Products', value: sorted.length },
        { label: 'Total Stock', value: totalStock },
        { label: 'Inventory Value', value: `$${inventoryValue.toFixed(2)}` },
      ]} />

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, SKU, type, category, or status…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full sm:w-96 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {loading ? <div className="animate-pulse bg-white rounded-xl h-64" /> : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className={thCls}>
                <SortableHeader label="Name" column="name" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3">Category</th>
                <SortableHeader label="Type" column="type" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3">SKU</th>
                <SortableHeader label="Price" column="price" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Stock" column="stock" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Status" column="status" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.category?.name || '—'}</td>
                  <td className="px-4 py-3 capitalize">{p.product_type}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{p.sku || '—'}</td>
                  <td className="px-4 py-3">
                    <span>${parseFloat(p.price).toFixed(2)}</span>
                    {p.compare_price && parseFloat(p.compare_price) > parseFloat(p.price) && (
                      <span className="ml-2 text-xs text-gray-400 line-through">${parseFloat(p.compare_price).toFixed(2)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.product_type === 'variable' ? (
                      <span className="text-xs text-gray-500">Managed by variants ({p.stock})</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleStock(p.id, -1)} className="w-6 h-6 border rounded hover:bg-gray-100">−</button>
                        <span className="w-8 text-center">{p.stock}</span>
                        <button onClick={() => handleStock(p.id, 1)} className="w-6 h-6 border rounded hover:bg-gray-100">+</button>
                      </div>
                    )}
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
              {sorted.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-gray-400 text-center">{query ? 'No products match your search' : 'No products found'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
