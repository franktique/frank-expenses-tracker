'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, CreditCard } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SimulationPaymentMethodFilterProps {
  title: string;
  selectedMethods: string[];
  onMethodsChange: (methods: string[]) => void;
  disabled?: boolean;
  simulationContext?: boolean;
  showBudgetInfo?: boolean;
  persistSelection?: boolean;
}

const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo', icon: '💵' },
  { value: 'credito', label: 'Crédito', icon: '💳' },
];

export function SimulationPaymentMethodFilter({
  title,
  selectedMethods,
  onMethodsChange,
  disabled = false,
  simulationContext = false,
  showBudgetInfo = false,
  persistSelection = true,
}: SimulationPaymentMethodFilterProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    const allMethods = PAYMENT_METHODS.map((m) => m.value);
    onMethodsChange(allMethods);

    if (persistSelection && simulationContext) {
      try {
        sessionStorage.setItem(
          'simulation-paymentMethods',
          JSON.stringify(allMethods)
        );
      } catch (error) {
        console.warn('Failed to persist payment method selection:', error);
      }
    }
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

  // Get selection summary for display
  const getSelectionSummary = () => {
    if (noneSelected) {
      return simulationContext ? 'Todos los métodos' : 'Ninguno';
    }
    if (allSelected) {
      return 'Todos';
    }
    return `${selectedMethods.length}/${PAYMENT_METHODS.length}`;
  };

  return (
    <Card
      className={cn(
        'w-full',
        simulationContext && 'border-blue-200 bg-blue-50/30'
      )}
    >
      <CardHeader
        className={cn(
          'cursor-pointer pb-3 transition-colors hover:bg-muted/50',
          simulationContext && 'hover:bg-blue-50'
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <CreditCard
              className={cn('h-4 w-4', simulationContext && 'text-blue-600')}
            />
            <span>{title}</span>
            {simulationContext && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
                Simulación
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-xs text-muted-foreground',
                simulationContext && 'text-blue-600'
              )}
            >
              {getSelectionSummary()}
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
          {/* Simulation context info */}
          {simulationContext && showBudgetInfo && (
            <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-600">
              <p className="font-medium">Filtro de simulación:</p>
              <p>
                Selecciona los métodos de pago para incluir en el análisis de
                simulación. Si no seleccionas ninguno, se incluirán todos los
                métodos.
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={disabled || allSelected}
              className={cn(
                'text-xs',
                simulationContext && 'border-blue-200 hover:bg-blue-50'
              )}
            >
              Todos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              disabled={
                disabled ||
                (noneSelected && simulationContext) ||
                (!simulationContext && selectedMethods.length <= 1)
              }
              className={cn(
                'text-xs',
                simulationContext && 'border-blue-200 hover:bg-blue-50'
              )}
            >
              {simulationContext ? 'Ninguno' : 'Limpiar'}
            </Button>
          </div>

          {/* Payment Method Checkboxes */}
          <div className="space-y-2">
            {PAYMENT_METHODS.map((method) => {
              const isChecked = selectedMethods.includes(method.value);
              const isLastSelected =
                !simulationContext && selectedMethods.length === 1 && isChecked;

              return (
                <div key={method.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${title}-${method.value}`}
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      handleMethodChange(method.value, checked as boolean)
                    }
                    disabled={disabled || isLastSelected}
                    className={simulationContext ? 'border-blue-300' : ''}
                  />
                  <Label
                    htmlFor={`${title}-${method.value}`}
                    className={cn(
                      'flex items-center gap-2 text-sm',
                      disabled || isLastSelected
                        ? 'text-muted-foreground'
                        : 'cursor-pointer',
                      simulationContext &&
                        isChecked &&
                        'font-medium text-blue-700'
                    )}
                  >
                    <span>{method.icon}</span>
                    {method.label}
                  </Label>
                </div>
              );
            })}
          </div>

          {/* Selection info */}
          <div
            className={cn(
              'border-t pt-2 text-xs text-muted-foreground',
              simulationContext && 'border-blue-200 text-blue-600'
            )}
          >
            {noneSelected && simulationContext
              ? 'Se incluirán todos los métodos de pago en el análisis'
              : `${selectedMethods.length} de ${PAYMENT_METHODS.length} métodos seleccionados`}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
