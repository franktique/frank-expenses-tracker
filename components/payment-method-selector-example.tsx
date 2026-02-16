'use client';

import { useState } from 'react';
import { PaymentMethodSelector } from './payment-method-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PaymentMethodSelectorExample() {
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [isDisabled, setIsDisabled] = useState(false);

  const handleReset = () => {
    setSelectedMethods([]);
  };

  const handleSelectAll = () => {
    setSelectedMethods(['cash', 'credit', 'debit']);
  };

  const handleSelectCashOnly = () => {
    setSelectedMethods(['cash']);
  };

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Method Selector Example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PaymentMethodSelector
            selectedMethods={selectedMethods}
            onSelectionChange={setSelectedMethods}
            disabled={isDisabled}
            label="Seleccionar Métodos de Pago"
          />

          <div className="space-y-2">
            <p className="text-sm font-medium">Current Selection:</p>
            <p className="text-sm text-muted-foreground">
              {selectedMethods.length === 0
                ? 'All methods (no specific selection)'
                : `Selected: ${selectedMethods.join(', ')}`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleReset} variant="outline" size="sm">
              Reset (All Methods)
            </Button>
            <Button onClick={handleSelectAll} variant="outline" size="sm">
              Select All Specific
            </Button>
            <Button onClick={handleSelectCashOnly} variant="outline" size="sm">
              Cash Only
            </Button>
            <Button
              onClick={() => setIsDisabled(!isDisabled)}
              variant="outline"
              size="sm"
            >
              {isDisabled ? 'Enable' : 'Disable'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
