'use client';

import { useState, useEffect, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import {
  validatePaymentMethods,
  sanitizePaymentMethods,
  formatPaymentMethodsForDisplay,
  type PaymentMethod,
} from '@/lib/payment-method-validation';

export interface PaymentMethodSelectorProps {
  selectedMethods: string[];
  onSelectionChange: (methods: string[]) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  showValidation?: boolean;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
}

export type { PaymentMethod };

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'credit', label: 'Crédito' },
  { value: 'debit', label: 'Débito' },
];

export function PaymentMethodSelector({
  selectedMethods,
  onSelectionChange,
  disabled = false,
  label = 'Métodos de Pago',
  className = '',
  showValidation = true,
  onValidationChange,
}: PaymentMethodSelectorProps) {
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [validationResult, setValidationResult] = useState(
    validatePaymentMethods(
      selectedMethods.length === 0 ? null : selectedMethods
    )
  );
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Update "All Methods" state when selectedMethods changes
  useEffect(() => {
    setIsAllSelected(selectedMethods.length === 0);
  }, [selectedMethods]);

  // Validate payment methods whenever they change
  useEffect(() => {
    // In the UI context, empty array means "all methods" so we treat it as null for validation
    const methodsForValidation =
      selectedMethods.length === 0 ? null : selectedMethods;
    const result = validatePaymentMethods(methodsForValidation);
    setValidationResult(result);

    if (onValidationChange) {
      onValidationChange(result.isValid, result.errors);
    }
  }, [selectedMethods, onValidationChange]);

  // Safe selection change handler with validation
  const handleSelectionChange = useCallback(
    (methods: string[]) => {
      setHasUserInteracted(true);

      // Sanitize the methods before applying
      const sanitizedMethods = sanitizePaymentMethods(methods);
      const finalMethods = sanitizedMethods || [];

      onSelectionChange(finalMethods);
    },
    [onSelectionChange]
  );

  const handleAllMethodsChange = (checked: boolean) => {
    try {
      if (checked) {
        // Clear all specific selections to indicate "all methods"
        handleSelectionChange([]);
      } else {
        // If unchecking "all methods", select all individual methods
        handleSelectionChange(PAYMENT_METHODS.map((method) => method.value));
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

      handleSelectionChange(newMethods);
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

        {/* Validation Messages */}
        {showValidation && hasUserInteracted && (
          <div className="mt-3 space-y-2">
            {validationResult.errors.length > 0 && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  {validationResult.errors.map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {validationResult.warnings.length > 0 && (
              <Alert className="border-orange-200 bg-orange-50 py-2">
                <Info className="h-3 w-3 text-orange-600" />
                <AlertDescription className="text-xs text-orange-800">
                  {validationResult.warnings.map((warning, index) => (
                    <div key={index}>{warning}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {validationResult.isValid &&
              validationResult.errors.length === 0 &&
              hasUserInteracted && (
                <Alert className="border-green-200 bg-green-50 py-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <AlertDescription className="text-xs text-green-800">
                    Configuración válida:{' '}
                    {formatPaymentMethodsForDisplay(
                      selectedMethods as PaymentMethod[]
                    )}
                  </AlertDescription>
                </Alert>
              )}
          </div>
        )}

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
                : '⚠️ Ningún método seleccionado - no se incluirán gastos'}
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
