'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PaymentMethodFilterProps {
  title: string;
  selectedMethods: string[];
  onMethodsChange: (methods: string[]) => void;
  disabled?: boolean;
  simulationContext?: boolean;
  showBudgetInfo?: boolean;
  persistSelection?: boolean;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo', icon: '💵' },
  { value: 'credit', label: 'Crédito', icon: '💳' },
  { value: 'debit', label: 'Débito', icon: '💰' },
];

export function PaymentMethodFilter({
  title,
  selectedMethods,
  onMethodsChange,
  disabled = false,
  simulationContext = false,
  showBudgetInfo = false,
  persistSelection = true,
}: PaymentMethodFilterProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const handleMethodChange = (method: string, checked: boolean) => {
    let newMethods: string[];

    if (checked) {
      newMethods = [...selectedMethods, method];
    } else {
      newMethods = selectedMethods.filter((m) => m !== method);
    }

    // In simulation context, allow empty selection (means all methods)
    // In regular context, prevent empty selection
    if (!simulationContext && newMethods.length === 0) {
      return;
    }

    onMethodsChange(newMethods);

    // Persist selection if enabled
    if (persistSelection && simulationContext) {
      try {
        sessionStorage.setItem(
          'simulation-paymentMethods',
          JSON.stringify(newMethods)
        );
      } catch (error) {
        console.warn('Failed to persist payment method selection:', error);
      }
    }
  };

  const handleSelectAll = () => {
    onMethodsChange(PAYMENT_METHODS.map((m) => m.value));
  };

  const handleDeselectAll = () => {
    if (simulationContext) {
      // In simulation context, allow empty selection
      onMethodsChange([]);
      if (persistSelection) {
        try {
          sessionStorage.setItem(
            'simulation-paymentMethods',
            JSON.stringify([])
          );
        } catch (error) {
          console.warn('Failed to persist payment method selection:', error);
        }
      }
    } else {
      // Keep at least one method selected in regular context
      onMethodsChange([PAYMENT_METHODS[0].value]);
    }
  };

  const allSelected = selectedMethods.length === PAYMENT_METHODS.length;
  const noneSelected = selectedMethods.length === 0;

  return (
    <Card
      className={cn(
        'w-full',
        simulationContext && 'border-blue-200 bg-blue-50/30'
      )}
    >
      <CardHeader
        className="cursor-pointer pb-3 transition-colors hover:bg-muted/50"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span>{title}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selectedMethods.length === PAYMENT_METHODS.length
                ? 'Todos'
                : `${selectedMethods.length}/${PAYMENT_METHODS.length}`}
            </span>
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardTitle>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="space-y-3 pt-0">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={disabled || allSelected}
              className="text-xs"
            >
              Todos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              disabled={disabled || selectedMethods.length <= 1}
              className="text-xs"
            >
              Limpiar
            </Button>
          </div>

          {/* Payment Method Checkboxes */}
          <div className="space-y-2">
            {PAYMENT_METHODS.map((method) => {
              const isChecked = selectedMethods.includes(method.value);
              const isLastSelected = selectedMethods.length === 1 && isChecked;

              return (
                <div key={method.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${title}-${method.value}`}
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      handleMethodChange(method.value, checked as boolean)
                    }
                    disabled={disabled || isLastSelected}
                  />
                  <Label
                    htmlFor={`${title}-${method.value}`}
                    className={`text-sm ${
                      disabled || isLastSelected
                        ? 'text-muted-foreground'
                        : 'cursor-pointer'
                    }`}
                  >
                    {method.label}
                  </Label>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
