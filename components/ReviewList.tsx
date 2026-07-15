'use client';

import { Review } from '@/lib/types';
import StarRating from '@/components/StarRating';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="text-gray-500 text-sm py-4">No reviews yet. Be the first to leave one.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {reviews.map(review => (
        <div key={review.id} className="py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} />
              <span className="text-sm font-medium text-gray-700">{review.customer_name || 'Anonymous'}</span>
            </div>
            <span className="text-xs text-gray-400">{formatDate(review.created_at)}</span>
          </div>
          {review.title && <p className="font-medium text-gray-800 mt-2">{review.title}</p>}
          {review.body && <p className="text-sm text-gray-600 mt-1">{review.body}</p>}
        </div>
      ))}
    </div>
  );
}
