'use client';

import { useState } from 'react';
import { BudgetToggle } from './budget-toggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function BudgetToggleExample() {
  const [showBudgets, setShowBudgets] = useState(false);
  const [budgetDataAvailable, setBudgetDataAvailable] = useState(true);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Budget Toggle Example</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Normal state */}
        <div>
          <h4 className="mb-2 text-sm font-medium">Normal State:</h4>
          <BudgetToggle showBudgets={showBudgets} onToggle={setShowBudgets} />
          <p className="mt-1 text-xs text-muted-foreground">
            Current state: {showBudgets ? 'Showing budgets' : 'Hiding budgets'}
          </p>
        </div>

        {/* Disabled state */}
        <div>
          <h4 className="mb-2 text-sm font-medium">Disabled State:</h4>
          <BudgetToggle
            showBudgets={false}
            onToggle={() => {}}
            disabled={!budgetDataAvailable}
          />
          <button
            onClick={() => setBudgetDataAvailable(!budgetDataAvailable)}
            className="mt-1 block text-xs text-blue-600 hover:underline"
          >
            Toggle availability:{' '}
            {budgetDataAvailable ? 'Available' : 'Unavailable'}
          </button>
        </div>

        {/* With custom className */}
        <div>
          <h4 className="mb-2 text-sm font-medium">Custom Styling:</h4>
          <BudgetToggle
            showBudgets={showBudgets}
            onToggle={setShowBudgets}
            className="rounded-md border bg-muted/50 p-2"
          />
        </div>
      </CardContent>
    </Card>
  );
}
