'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Review } from '@/lib/types';
import { getCustomerId, getCustomerToken } from '@/lib/api';
import StarRating from '@/components/StarRating';

interface Props {
  existingReview: Review | null;
  onCreate: (data: { rating: number; title?: string; body?: string }) => Promise<Review>;
  onUpdate: (reviewId: string, data: { rating?: number; title?: string; body?: string }) => Promise<Review>;
  onDelete: (reviewId: string) => Promise<void>;
  onChanged: (review: Review | null) => void;
}

export default function ReviewForm({ existingReview, onCreate, onUpdate, onDelete, onChanged }: Props) {
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [title, setTitle] = useState(existingReview?.title ?? '');
  const [body, setBody] = useState(existingReview?.body ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = !!getCustomerToken() && !!getCustomerId();

  if (!isLoggedIn) {
    return (
      <p className="text-sm text-gray-500">
        <Link href="/login" className="text-blue-600 hover:underline">Log in</Link> to leave a review.
      </p>
    );
  }

  if (existingReview && !editing) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-sm text-gray-500">You already reviewed this.</p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm text-blue-600 hover:underline"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!confirm('Delete your review?')) return;
            await onDelete(existingReview.id);
            onChanged(null);
          }}
          className="text-sm text-red-500 hover:underline"
        >
          Delete
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data = { rating, title: title || undefined, body: body || undefined };
      const saved = existingReview ? await onUpdate(existingReview.id, data) : await onCreate(data);
      onChanged(saved);
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-md">
      {error && <p className="text-red-600 text-sm p-2 bg-red-50 rounded-lg">{error}</p>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Your rating</label>
        <StarRating rating={rating} size="lg" interactive onChange={setRating} />
      </div>
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Title (optional)"
        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Share your thoughts (optional)"
        rows={3}
        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300"
        >
          {submitting ? 'Saving…' : existingReview ? 'Save Changes' : 'Submit Review'}
        </button>
        {existingReview && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
