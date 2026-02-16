import { ExpensesView } from '@/components/expenses-view';
import { ProtectedRoute } from '@/components/protected-route';

export default function ExpensesPage() {
  return (
    <ProtectedRoute>
      <ExpensesView />
    </ProtectedRoute>
  );
}
