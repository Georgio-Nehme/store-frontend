'use client';

import Link from 'next/link';
import { Product, ProductImage } from '@/lib/types';
import { useCart } from '@/lib/cart';

interface Props {
  product: Product;
  primaryImage?: ProductImage | null;
}

export default function ProductCard({ product, primaryImage }: Props) {
  const { addItem } = useCart();
  const initials = product.name
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  const isOnSale = product.compare_price !== null &&
    parseFloat(product.compare_price) > parseFloat(product.price);

  return (
    <div className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow flex flex-col overflow-hidden">
      <Link href={`/products/${product.id}`}>
        <div className="bg-gray-100 h-48 flex items-center justify-center relative overflow-hidden">
          {primaryImage?.medium_url ? (
            <img
              src={primaryImage.medium_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-4xl font-bold text-gray-400">{initials}</span>
          )}
          {isOnSale && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              SALE
            </span>
          )}
        </div>
      </Link>
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold text-gray-800 hover:text-blue-600 mb-1">{product.name}</h3>
        </Link>
        <div className="mb-1">
          <span className="text-blue-600 font-bold text-lg">${parseFloat(product.price).toFixed(2)}</span>
          {isOnSale && (
            <span className="ml-2 text-gray-400 line-through text-sm">
              ${parseFloat(product.compare_price!).toFixed(2)}
            </span>
          )}
        </div>
        <p className={`text-sm mb-3 ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
          {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
        </p>
        <button
          onClick={() => addItem(product)}
          disabled={product.stock === 0}
          className="mt-auto bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
