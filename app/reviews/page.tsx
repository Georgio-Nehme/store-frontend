import ReviewsSection from '@/components/ReviewsSection';
import { branding } from '@/store.config/branding';

export default function StoreReviewsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{branding.storeName} — Reviews</h1>
      <ReviewsSection />
    </main>
  );
}
