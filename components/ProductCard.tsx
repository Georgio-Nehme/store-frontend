'use client';

import Link from 'next/link';
import { Product, ProductImage } from '@/lib/types';
import { useCart } from '@/lib/cart';
import StarRating from '@/components/StarRating';
import ProductTags from '@/components/ProductTags';

interface Props {
  product: Product;
  primaryImage?: ProductImage | null;
}

function formatPrice(value: string) {
  return `$${parseFloat(value).toFixed(2)}`;
}

export default function ProductCard({ product, primaryImage }: Props) {
  const { addItem } = useCart();
  const initials = product.name
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  const isOnSale = product.compare_price !== null && parseFloat(product.compare_price) > parseFloat(product.price);
  const stockLabel = product.in_stock ? 'In Stock' : 'Out of Stock';

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
        {product.category && (
          <span className="inline-flex w-fit mb-2 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
            {product.category.name}
          </span>
        )}
        {product.tags.length > 0 && (
          <div className="mb-2">
            <ProductTags tags={product.tags} />
          </div>
        )}
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold text-gray-800 hover:text-blue-600 mb-1">{product.name}</h3>
        </Link>
        {product.review_count > 0 && (
          <div className="flex items-center gap-1.5 mb-1">
            <StarRating rating={product.avg_rating ?? 0} />
            <span className="text-xs text-gray-500">({product.review_count})</span>
          </div>
        )}
        <div className="mb-1">
          <span className="text-blue-600 font-bold text-lg">
            {product.product_type === 'variable' ? `From ${formatPrice(product.price)}` : formatPrice(product.price)}
          </span>
          {isOnSale && product.product_type !== 'variable' && (
            <span className="ml-2 text-gray-400 line-through text-sm">
              {formatPrice(product.compare_price!)}
            </span>
          )}
        </div>
        <p className={`text-sm mb-3 ${product.in_stock ? 'text-green-600' : 'text-red-500'}`}>
          {stockLabel}
        </p>

        {product.product_type === 'simple' ? (
          <button
            onClick={() => addItem({ product_id: product.id, product_name: product.name, unit_price: product.price }, product.moq)}
            disabled={!product.in_stock}
            className="mt-auto bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {product.moq > 1 ? `Add ${product.moq} to Cart` : 'Add to Cart'}
          </button>
        ) : (
          <Link
            href={`/products/${product.id}`}
            className="mt-auto bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium text-center"
          >
            {product.product_type === 'variable' ? 'View Options' : 'Customize'}
          </Link>
        )}
      </div>
    </div>
  );
}
