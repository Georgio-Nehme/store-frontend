'use client';

import { useEffect, useState } from 'react';
import {
  createProductReview,
  createStoreReview,
  deleteReview,
  getCustomerId,
  getProductReviewSummary,
  getProductReviews,
  getStoreReviewSummary,
  getStoreReviews,
  updateReview,
} from '@/lib/api';
import { Review } from '@/lib/types';
import StarRating from '@/components/StarRating';
import ReviewList from '@/components/ReviewList';
import ReviewForm from '@/components/ReviewForm';

interface Props {
  productId?: string;
  title?: string;
}

export default function ReviewsSection({ productId, title = 'Reviews' }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [list, summary] = await Promise.all([
        productId ? getProductReviews(productId) : getStoreReviews(),
        productId ? getProductReviewSummary(productId) : getStoreReviewSummary(),
      ]);
      setReviews(list);
      setAverageRating(summary.average_rating);
      setReviewCount(summary.review_count);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const customerId = getCustomerId();
  const existingReview = reviews.find(r => r.customer_id === customerId) ?? null;

  function handleChanged(review: Review | null) {
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        {reviewCount > 0 && (
          <>
            <StarRating rating={averageRating ?? 0} />
            <span className="text-sm text-gray-500">
              {averageRating?.toFixed(1)} ({reviewCount} review{reviewCount === 1 ? '' : 's'})
            </span>
          </>
        )}
      </div>

      <ReviewForm
        existingReview={existingReview}
        onCreate={data => (productId ? createProductReview(productId, data) : createStoreReview(data))}
        onUpdate={updateReview}
        onDelete={deleteReview}
        onChanged={handleChanged}
      />

      {loading ? (
        <div className="animate-pulse bg-gray-100 rounded-xl h-24" />
      ) : (
        <ReviewList reviews={reviews} />
      )}
    </div>
  );
}
