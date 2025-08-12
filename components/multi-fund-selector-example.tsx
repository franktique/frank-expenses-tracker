"use client";

import { useState } from "react";
import {
  MultiFundSelector,
  useMultiFundSelection,
} from "./multi-fund-selector";
import { Fund } from "@/types/funds";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Example usage of MultiFundSelector component
export function MultiFundSelectorExample() {
  const [selectedFunds, setSelectedFunds] = useState<Fund[]>([]);

  // Example using the custom hook
  const {
    selectedFunds: hookSelectedFunds,
    setSelectedFunds: setHookSelectedFunds,
    addFund,
    removeFund,
    clearSelection,
    summary,
    validation,
  } = useMultiFundSelection([], undefined, 3);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic MultiFundSelector</CardTitle>
          <CardDescription>
            Simple multi-fund selection with no limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MultiFundSelector
            selectedFunds={selectedFunds}
            onFundsChange={setSelectedFunds}
            placeholder="Seleccionar fondos..."
          />

          <div className="text-sm text-muted-foreground">
            Selected: {selectedFunds.length} funds
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limited MultiFundSelector with Hook</CardTitle>
          <CardDescription>
            Multi-fund selection with maximum 3 funds using custom hook
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MultiFundSelector
            selectedFunds={hookSelectedFunds}
            onFundsChange={setHookSelectedFunds}
            placeholder="Seleccionar hasta 3 fondos..."
            maxSelection={3}
          />

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Summary: {summary}
            </div>

            {!validation.isValid && (
              <div className="text-sm text-destructive">
                Errors: {validation.errors.join(", ")}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                disabled={hookSelectedFunds.length === 0}
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disabled MultiFundSelector</CardTitle>
          <CardDescription>Example of disabled state</CardDescription>
        </CardHeader>
        <CardContent>
          <MultiFundSelector
            selectedFunds={[]}
            onFundsChange={() => {}}
            placeholder="Disabled selector..."
            disabled={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
