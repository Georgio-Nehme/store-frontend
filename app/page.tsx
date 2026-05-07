'use client';

import { useEffect, useState } from 'react';
import { getProducts, getProductImages } from '@/lib/api';
import { Product, ProductImage } from '@/lib/types';
import ProductCard from '@/components/ProductCard';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [primaryImages, setPrimaryImages] = useState<Record<string, ProductImage>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProducts()
      .then(async (prods) => {
        setProducts(prods);
        // Fetch images for all products in parallel, pick the primary one
        const results = await Promise.allSettled(prods.map(p => getProductImages(p.id)));
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
  }, []);

  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'My Store';

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">{storeName} — Shop</h1>

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
