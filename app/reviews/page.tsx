import ReviewsSection from '@/components/ReviewsSection';
import { branding } from '@/store.config/branding';
import { theme } from '@/lib/theme';

export default function StoreReviewsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-5 sm:py-8">
      <h1 className={`text-xl sm:text-2xl ${theme.classes.heading} mb-4 sm:mb-6 break-words`}>{branding.storeName} — Reviews</h1>
      <ReviewsSection />
    </main>
  );
}
