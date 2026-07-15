'use client';

import { useEffect, useState } from 'react';
import { adminDeleteReview, adminGetProducts, adminGetReviews, adminModerateReview } from '@/lib/api';
import { Product, Review } from '@/lib/types';
import StarRating from '@/components/StarRating';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [reviewList, productList] = await Promise.all([adminGetReviews(), adminGetProducts()]);
      setReviews(reviewList);
      setProducts(productList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const productNameById = new Map(products.map(p => [p.id, p.name]));

  async function toggleHidden(review: Review) {
    try {
      await adminModerateReview(review.id, !review.is_hidden);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function handleDelete(review: Review) {
    if (!confirm('Delete this review?')) return;
    try {
      await adminDeleteReview(review.id);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reviews</h1>
        <p className="text-sm text-gray-500 mt-0.5">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {loading ? (
        <div className="animate-pulse bg-white rounded-xl h-64" />
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Review</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map(review => (
                <tr key={review.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {review.product_id ? (productNameById.get(review.product_id) ?? 'Unknown product') : 'Store review'}
                    <p className="text-gray-400 text-xs font-normal">{review.customer_name || 'Anonymous'}</p>
                  </td>
                  <td className="px-4 py-3"><StarRating rating={review.rating} /></td>
                  <td className="px-4 py-3 max-w-xs">
                    {review.title && <p className="font-medium text-gray-700">{review.title}</p>}
                    {review.body && <p className="text-gray-500 text-xs line-clamp-2">{review.body}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(review.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleHidden(review)}
                      className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        review.is_hidden
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {review.is_hidden ? 'Hidden' : 'Visible'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(review)} className="text-red-500 hover:underline text-xs">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {reviews.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-gray-400 text-center">
                    No reviews yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
