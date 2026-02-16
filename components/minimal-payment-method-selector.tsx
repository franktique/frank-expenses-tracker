'use client';

import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface MinimalPaymentMethodSelectorProps {
  selectedMethods: string[];
  onSelectionChange: (methods: string[]) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export type PaymentMethod = 'cash' | 'credit' | 'debit';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'credit', label: 'Crédito' },
  { value: 'debit', label: 'Débito' },
];

export function MinimalPaymentMethodSelector({
  selectedMethods,
  onSelectionChange,
  disabled = false,
  label = 'Métodos de Pago',
  className = '',
}: MinimalPaymentMethodSelectorProps) {
  const [isAllSelected, setIsAllSelected] = useState(false);

  // Update "All Methods" state when selectedMethods changes
  useEffect(() => {
    setIsAllSelected(selectedMethods.length === 0);
  }, [selectedMethods]);

  const handleAllMethodsChange = (checked: boolean) => {
    try {
      if (checked) {
        // Clear all specific selections to indicate "all methods"
        onSelectionChange([]);
      } else {
        // If unchecking "all methods", select all individual methods
        onSelectionChange(PAYMENT_METHODS.map((method) => method.value));
      }
    } catch (error) {
      console.error('Error handling all methods change:', error);
    }
  };

  const handleMethodChange = (method: PaymentMethod, checked: boolean) => {
    try {
      let newMethods: string[];

      if (checked) {
        // Add method if not already selected
        newMethods = selectedMethods.includes(method)
          ? selectedMethods
          : [...selectedMethods, method];
      } else {
        // Remove method from selection
        newMethods = selectedMethods.filter((m) => m !== method);
      }

      onSelectionChange(newMethods);
    } catch (error) {
      console.error('Error handling method change:', error);
    }
  };

  const isMethodSelected = (method: PaymentMethod): boolean => {
    // If no specific methods are selected, all methods are considered selected
    if (selectedMethods.length === 0) return false;
    return selectedMethods.includes(method);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* All Methods Option */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="all-methods"
            checked={isAllSelected}
            onCheckedChange={handleAllMethodsChange}
            disabled={disabled}
          />
          <Label
            htmlFor="all-methods"
            className={`text-sm ${
              disabled ? 'text-muted-foreground' : 'cursor-pointer'
            }`}
          >
            Todos los métodos
          </Label>
        </div>

        {/* Individual Payment Methods */}
        <div className="space-y-2 border-l-2 border-muted pl-4">
          {PAYMENT_METHODS.map((method) => (
            <div key={method.value} className="flex items-center space-x-2">
              <Checkbox
                id={`method-${method.value}`}
                checked={isMethodSelected(method.value)}
                onCheckedChange={(checked) =>
                  handleMethodChange(method.value, checked as boolean)
                }
                disabled={disabled || isAllSelected}
              />
              <Label
                htmlFor={`method-${method.value}`}
                className={`text-sm ${
                  disabled || isAllSelected
                    ? 'text-muted-foreground'
                    : 'cursor-pointer'
                }`}
              >
                {method.label}
              </Label>
            </div>
          ))}
        </div>

        {/* Helper Text */}
        <div className="mt-3 space-y-1 rounded-md bg-muted/50 p-2">
          <p className="text-xs text-muted-foreground">
            {isAllSelected
              ? 'Se incluirán gastos de todos los métodos de pago (efectivo, crédito y débito)'
              : selectedMethods.length > 0
                ? `Se incluirán gastos de: ${selectedMethods
                    .map(
                      (m) => PAYMENT_METHODS.find((pm) => pm.value === m)?.label
                    )
                    .join(', ')}`
                : 'Todos los métodos (configuración por defecto)'}
          </p>
          <p className="text-xs text-muted-foreground/80">
            💡 Tip: Selecciona "Todos los métodos" para incluir gastos de
            cualquier forma de pago, o elige métodos específicos para filtrar
            solo esos tipos de transacciones.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
