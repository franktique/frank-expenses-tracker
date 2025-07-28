"use client";

import { useState } from "react";
import { BudgetToggle } from "./budget-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
          <h4 className="text-sm font-medium mb-2">Normal State:</h4>
          <BudgetToggle showBudgets={showBudgets} onToggle={setShowBudgets} />
          <p className="text-xs text-muted-foreground mt-1">
            Current state: {showBudgets ? "Showing budgets" : "Hiding budgets"}
          </p>
        </div>

        {/* Disabled state */}
        <div>
          <h4 className="text-sm font-medium mb-2">Disabled State:</h4>
          <BudgetToggle
            showBudgets={false}
            onToggle={() => {}}
            disabled={!budgetDataAvailable}
          />
          <button
            onClick={() => setBudgetDataAvailable(!budgetDataAvailable)}
            className="text-xs text-blue-600 hover:underline mt-1 block"
          >
            Toggle availability:{" "}
            {budgetDataAvailable ? "Available" : "Unavailable"}
          </button>
        </div>

        {/* With custom className */}
        <div>
          <h4 className="text-sm font-medium mb-2">Custom Styling:</h4>
          <BudgetToggle
            showBudgets={showBudgets}
            onToggle={setShowBudgets}
            className="p-2 border rounded-md bg-muted/50"
          />
        </div>
      </CardContent>
    </Card>
  );
}
