'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProduct, getProductImages } from '@/lib/api';
import { Product, ProductImage } from '@/lib/types';
import { useCart } from '@/lib/cart';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    Promise.all([getProduct(id), getProductImages(id)])
      .then(([p, imgs]) => {
        setProduct(p);
        setQty(1);
        const sorted = [...imgs].sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return a.position - b.position;
        });
        setImages(sorted);
        setActiveIdx(0);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  function handleAddToCart() {
    if (!product) return;
    addItem(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="animate-pulse bg-gray-200 h-96 rounded-xl" />
    </div>
  );
  if (error) return <div className="max-w-3xl mx-auto px-4 py-12 text-red-600">{error}</div>;
  if (!product) return null;

  const initials = product.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const activeImage = images[activeIdx] ?? null;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/" className="text-blue-600 hover:underline text-sm mb-6 block">← Back to Shop</Link>
      <div className="grid md:grid-cols-2 gap-8">

        {/* Image gallery */}
        <div className="flex flex-col gap-3">
          <div className="bg-gray-100 rounded-xl overflow-hidden h-80 flex items-center justify-center">
            {activeImage?.medium_url ? (
              <img
                src={activeImage.medium_url}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-6xl font-bold text-gray-400">{initials}</span>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveIdx(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === activeIdx ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  {img.small_url ? (
                    <img src={img.small_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-400 font-bold">
                      {initials}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-gray-800">{product.name}</h1>
          {product.sku && <p className="text-sm text-gray-500">SKU: {product.sku}</p>}
          <div className="flex items-baseline gap-3">
            <p className="text-3xl font-bold text-blue-600">${parseFloat(product.price).toFixed(2)}</p>
            {product.compare_price && parseFloat(product.compare_price) > parseFloat(product.price) && (
              <p className="text-lg text-gray-400 line-through">${parseFloat(product.compare_price).toFixed(2)}</p>
            )}
          </div>
          {product.description && <p className="text-gray-600">{product.description}</p>}
          <p className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
          </p>
          {product.stock > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">Quantity:</label>
              <input
                type="number"
                min={1}
                max={product.stock}
                value={qty}
                onChange={e => setQty(Math.min(Math.max(1, parseInt(e.target.value) || 1), product.stock))}
                className="border rounded-lg px-3 py-1 w-20 text-center"
              />
            </div>
          )}
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {added ? '✓ Added!' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </main>
  );
}
