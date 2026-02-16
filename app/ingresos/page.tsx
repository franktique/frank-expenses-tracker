import { IncomesView } from '@/components/incomes-view';
import { ProtectedRoute } from '@/components/protected-route';

export default function IncomesPage() {
  return (
    <ProtectedRoute>
      <IncomesView />
    </ProtectedRoute>
  );
}
