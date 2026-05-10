'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCategories, getProductImages, getProducts } from '@/lib/api';
import { Category, Product, ProductImage } from '@/lib/types';
import ProductCard from '@/components/ProductCard';

function sortCategories(categories: Category[]) {
  return [...categories].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [primaryImages, setPrimaryImages] = useState<Record<string, ProductImage>>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    getProducts(selectedCategoryId ? { category_id: selectedCategoryId } : undefined)
      .then(async prods => {
        setProducts(prods);
        const results = await Promise.allSettled(prods.map(product => getProductImages(product.id)));
        const map: Record<string, ProductImage> = {};
        results.forEach((result, i) => {
          if (result.status === 'fulfilled' && result.value.length > 0) {
            const sorted = [...result.value].sort((a, b) => {
              if (a.is_primary && !b.is_primary) return -1;
              if (!a.is_primary && b.is_primary) return 1;
              return a.position - b.position;
            });
            map[prods[i].id] = sorted[0];
          }
        });
        setPrimaryImages(map);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedCategoryId]);

  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'My Store';
  const topLevelCategories = useMemo(
    () => sortCategories(categories.filter(category => !category.parent_id)),
    [categories],
  );
  const activeParent = topLevelCategories.find(category => category.id === activeParentId) ?? null;
  const activeSubcategories = activeParent
    ? sortCategories(
        categories.filter(category => category.parent_id === activeParent.id || activeParent.subcategories.some(sub => sub.id === category.id)),
      )
    : [];

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">{storeName} — Shop</h1>

      <div className="mb-8 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSelectedCategoryId(null);
              setActiveParentId(null);
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategoryId === null ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          {topLevelCategories.map(category => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategoryId(category.id);
                setActiveParentId(category.id);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategoryId === category.id || activeParentId === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {activeParent && activeSubcategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeSubcategories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedCategoryId === category.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-200 rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <p className="font-semibold">Failed to load products</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-sm mt-1 text-red-500">Make sure NEXT_PUBLIC_STORE_ID is set correctly in your .env.local file.</p>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <p className="text-gray-500 text-center py-16">No products found.</p>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              primaryImage={primaryImages[product.id] ?? null}
            />
          ))}
        </div>
      )}
    </main>
  );
}
