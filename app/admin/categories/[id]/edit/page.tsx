'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminDeleteCategory, adminGetCategories, adminUpdateCategory } from '@/lib/api';
import { Category } from '@/lib/types';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function EditCategoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [position, setPosition] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminGetCategories()
      .then(allCategories => {
        setCategories(allCategories);
        const current = allCategories.find(category => category.id === id);
        if (!current) throw new Error('Category not found');
        setName(current.name);
        setSlug(current.slug);
        setDescription(current.description || '');
        setParentId(current.parent_id || '');
        setPosition(current.position);
        setIsActive(current.is_active);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load category'));
  }, [id]);

  const topLevelCategories = useMemo(
    () => categories
      .filter(category => !category.parent_id && category.id !== id)
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
    [categories, id],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await adminUpdateCategory(id, {
        name,
        slug,
        description: description || null,
        parent_id: parentId || null,
        position,
        is_active: isActive,
      });
      router.push('/admin/categories');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this category?')) return;
    try {
      await adminDeleteCategory(id);
      router.push('/admin/categories');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  }

  return (
    <div className="max-w-2xl">
      <Link href="/admin/categories" className="text-blue-600 hover:underline text-sm mb-6 block">← Back</Link>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Category</h1>
      <div className="bg-white rounded-xl shadow p-6">
        {error && <p className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => {
                const value = e.target.value;
                setName(value);
                if (!slugEdited) setSlug(slugify(value));
              }}
              required
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <input
              type="text"
              value={slug}
              onChange={e => {
                setSlugEdited(true);
                setSlug(slugify(e.target.value));
              }}
              required
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
            <select value={parentId} onChange={e => setParentId(e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="">None (top-level)</option>
              {topLevelCategories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <input type="number" value={position} onChange={e => setPosition(parseInt(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            Active
          </label>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={handleDelete} className="text-red-500 hover:underline text-sm">
              Delete Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
