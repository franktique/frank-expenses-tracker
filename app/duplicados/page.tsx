import { DuplicateReviewsView } from '@/components/duplicate-reviews-view';
import { ProtectedRoute } from '@/components/protected-route';

export default function DuplicateReviewsPage() {
  return (
    <ProtectedRoute>
      <DuplicateReviewsView />
    </ProtectedRoute>
  );
}
