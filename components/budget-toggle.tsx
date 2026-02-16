'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BudgetToggleProps {
  showBudgets: boolean;
  onToggle: (show: boolean) => void;
  disabled?: boolean;
  className?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function BudgetToggle({
  showBudgets,
  onToggle,
  disabled = false,
  className,
  isLoading = false,
  error = null,
  onRetry,
}: BudgetToggleProps) {
  const handleToggle = (checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      onToggle(checked);
    }
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Checkbox
        id="budget-toggle"
        checked={showBudgets}
        onCheckedChange={handleToggle}
        disabled={disabled || isLoading}
        aria-describedby={disabled ? 'budget-toggle-description' : undefined}
      />
      <Label
        htmlFor="budget-toggle"
        className={cn(
          'flex cursor-pointer select-none items-center gap-1',
          (disabled || isLoading) && 'cursor-not-allowed opacity-70',
          error && 'text-destructive'
        )}
      >
        {error && <AlertCircle className="h-3 w-3" />}
        Mostrar Presupuestos
        {isLoading && (
          <span className="ml-2 flex items-center gap-1 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3 animate-spin" />
            (cargando...)
          </span>
        )}
      </Label>
      {disabled && (
        <span
          id="budget-toggle-description"
          className="sr-only"
          role="status"
          aria-live="polite"
        >
          Los datos de presupuesto no están disponibles
        </span>
      )}
      {error && onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="h-6 px-2 text-xs text-destructive hover:text-destructive/80"
          title="Reintentar cargar presupuestos"
          disabled={isLoading}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
