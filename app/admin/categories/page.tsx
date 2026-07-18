'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { adminDeleteCategory, adminGetCategories, adminUpdateCategory } from '@/lib/api';
import { Category } from '@/lib/types';
import TableStats from '@/components/admin/TableStats';
import ExportCsvButton from '@/components/admin/ExportCsvButton';

function flattenCategories(categories: Category[]) {
  const byParent = new Map<string | null, Category[]>();
  categories.forEach(category => {
    const current = byParent.get(category.parent_id) ?? [];
    current.push(category);
    byParent.set(category.parent_id, current);
  });

  const rows: Array<{ category: Category; depth: number }> = [];
  const walk = (parentId: string | null, depth: number) => {
    const items = [...(byParent.get(parentId) ?? [])].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    items.forEach(item => {
      rows.push({ category: item, depth });
      walk(item.id, depth + 1);
    });
  };

  walk(null, 0);
  return rows;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCategories() {
    setLoading(true);
    try {
      setCategories(await adminGetCategories());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  const rows = useMemo(() => flattenCategories(categories), [categories]);
  const parentNames = useMemo(() => Object.fromEntries(categories.map(category => [category.id, category.name])), [categories]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await adminDeleteCategory(id);
      await loadCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleToggleActive(category: Category) {
    const nextActive = !category.is_active;
    if (nextActive === false && !confirm(`Hide "${category.name}"? This will deactivate all products in it (and its subcategories).`)) return;
    try {
      await adminUpdateCategory(category.id, { is_active: nextActive });
      await loadCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update category');
    }
  }

  const activeCount = categories.filter(c => c.is_active).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Categories</h1>
        <div className="flex items-center gap-3">
          <ExportCsvButton
            data={rows}
            filename="categories.csv"
            columns={[
              { label: 'Name', value: r => r.category.name },
              { label: 'Slug', value: r => r.category.slug },
              { label: 'Parent', value: r => r.category.parent_id ? parentNames[r.category.parent_id] || '' : '' },
              { label: 'Active', value: r => r.category.is_active ? 'active' : 'inactive' },
              { label: 'Subcategories', value: r => r.category.subcategories.length },
            ]}
          />
          <Link href="/admin/categories/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
            + Add Category
          </Link>
        </div>
      </div>

      <TableStats stats={[
        { label: 'Categories', value: categories.length },
        { label: 'Active', value: activeCount },
      ]} />

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {loading ? (
        <div className="animate-pulse bg-white rounded-xl h-48" />
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-left text-gray-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Subcategories</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ category, depth }) => (
                <tr key={category.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 18}px` }}>
                      {depth > 0 && <span className="text-gray-300">↳</span>}
                      <div>
                        <p className="font-medium text-gray-800">{category.name}</p>
                        <p className="text-xs text-gray-400">/{category.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{category.parent_id ? parentNames[category.parent_id] || '—' : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{category.subcategories.length}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link href={`/admin/categories/${category.id}/edit`} className="text-blue-600 hover:underline text-xs">Edit</Link>
                      <button onClick={() => handleToggleActive(category)} className="text-amber-600 hover:underline text-xs">
                        {category.is_active ? 'Hide' : 'Unhide'}
                      </button>
                      <button onClick={() => handleDelete(category.id, category.name)} className="text-red-500 hover:underline text-xs">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">No categories found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
