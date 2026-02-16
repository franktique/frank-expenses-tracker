'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useBudget } from '@/context/budget-context';
import { Fund } from '@/types/funds';

interface MultiFundSelectorProps {
  selectedFunds: Fund[];
  onFundsChange: (funds: Fund[]) => void;
  availableFunds?: Fund[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxSelection?: number;
}

export function MultiFundSelector({
  selectedFunds,
  onFundsChange,
  availableFunds,
  placeholder = 'Seleccionar fondos...',
  className,
  disabled = false,
  maxSelection,
}: MultiFundSelectorProps) {
  const { funds: contextFunds, isLoading, error } = useBudget();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Use provided availableFunds or fall back to context funds
  const funds = availableFunds || contextFunds || [];

  // Filter funds based on search
  const filteredFunds = funds.filter((fund) =>
    fund.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSelect = (fund: Fund) => {
    const isSelected = selectedFunds.some((f) => f.id === fund.id);

    if (isSelected) {
      // Remove fund from selection
      const newSelection = selectedFunds.filter((f) => f.id !== fund.id);
      onFundsChange(newSelection);
    } else {
      // Add fund to selection (if not at max limit)
      if (!maxSelection || selectedFunds.length < maxSelection) {
        const newSelection = [...selectedFunds, fund];
        onFundsChange(newSelection);
      }
    }
  };

  const handleRemoveFund = (fundId: string) => {
    const newSelection = selectedFunds.filter((f) => f.id !== fundId);
    onFundsChange(newSelection);
  };

  const getDisplayValue = () => {
    if (selectedFunds.length === 0) {
      return placeholder;
    }
    if (selectedFunds.length === 1) {
      return selectedFunds[0].name;
    }
    return `${selectedFunds.length} fondos seleccionados`;
  };

  const isMaxSelectionReached =
    maxSelection && selectedFunds.length >= maxSelection;

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between"
          disabled
        >
          Cargando fondos...
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('space-y-2', className)}>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between text-destructive"
          disabled
        >
          Error cargando fondos
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>
    );
  }

  if (!funds || funds.length === 0) {
    return (
      <div className={cn('space-y-2', className)}>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between text-muted-foreground"
          disabled
        >
          No hay fondos disponibles
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate">{getDisplayValue()}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar fondos..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>No se encontraron fondos.</CommandEmpty>
              <CommandGroup>
                {filteredFunds
                  .sort((a, b) =>
                    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
                  )
                  .map((fund) => {
                    const isSelected = selectedFunds.some(
                      (f) => f.id === fund.id
                    );
                    const isDisabled = !isSelected && isMaxSelectionReached;

                    return (
                      <CommandItem
                        key={fund.id}
                        value={fund.id}
                        onSelect={() => !isDisabled && handleSelect(fund)}
                        className={cn(
                          isDisabled && 'cursor-not-allowed opacity-50'
                        )}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex flex-1 flex-col">
                          <span
                            className={cn(
                              isDisabled && 'text-muted-foreground'
                            )}
                          >
                            {fund.name}
                          </span>
                          {fund.description && (
                            <span className="text-xs text-muted-foreground">
                              {fund.description}
                            </span>
                          )}
                        </div>
                        {isDisabled && maxSelection && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            Máximo {maxSelection}
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected funds badges */}
      {selectedFunds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedFunds.map((fund) => (
            <Badge
              key={fund.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <span className="max-w-[120px] truncate" title={fund.name}>
                {fund.name}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveFund(fund.id)}
                disabled={disabled}
                className="ml-1 rounded-full p-0.5 hover:bg-secondary-foreground/20 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Remover ${fund.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Selection summary with enhanced visual feedback */}
      {selectedFunds.length > 0 && (
        <div className="flex items-center justify-between text-xs">
          <div className="text-muted-foreground">
            {selectedFunds.length} de {funds.length} fondos seleccionados
            {maxSelection && ` (máximo ${maxSelection})`}
          </div>
          <div className="flex items-center gap-1">
            {selectedFunds.length === 1 && (
              <span className="text-xs text-green-600">✓ Específico</span>
            )}
            {selectedFunds.length > 1 && (
              <span className="text-xs text-blue-600">⚡ Múltiple</span>
            )}
            {selectedFunds.length === 0 && (
              <span className="text-xs text-amber-600">⚠ Sin restricción</span>
            )}
          </div>
        </div>
      )}

      {/* Help text for empty selection */}
      {selectedFunds.length === 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>💡 Sin fondos seleccionados = acepta cualquier fondo</span>
        </div>
      )}
    </div>
  );
}

// Utility function to validate fund selection
export function validateFundSelection(
  selectedFunds: Fund[],
  availableFunds: Fund[],
  maxSelection?: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if all selected funds are available
  const invalidFunds = selectedFunds.filter(
    (selected) =>
      !availableFunds.some((available) => available.id === selected.id)
  );

  if (invalidFunds.length > 0) {
    errors.push(
      `Los siguientes fondos no están disponibles: ${invalidFunds
        .map((f) => f.name)
        .join(', ')}`
    );
  }

  // Check max selection limit
  if (maxSelection && selectedFunds.length > maxSelection) {
    errors.push(`No se pueden seleccionar más de ${maxSelection} fondos`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Utility function to get fund selection summary
export function getFundSelectionSummary(selectedFunds: Fund[]): string {
  if (selectedFunds.length === 0) {
    return 'Ningún fondo seleccionado';
  }

  if (selectedFunds.length === 1) {
    return selectedFunds[0].name;
  }

  if (selectedFunds.length <= 3) {
    return selectedFunds.map((f) => f.name).join(', ');
  }

  return `${selectedFunds
    .slice(0, 2)
    .map((f) => f.name)
    .join(', ')} y ${selectedFunds.length - 2} más`;
}

// Hook for managing multi-fund selection state
export function useMultiFundSelection(
  initialFunds: Fund[] = [],
  availableFunds?: Fund[],
  maxSelection?: number
) {
  const [selectedFunds, setSelectedFunds] = useState<Fund[]>(initialFunds);
  const { funds: contextFunds } = useBudget();

  const funds = availableFunds || contextFunds || [];

  const handleFundsChange = (newFunds: Fund[]) => {
    const validation = validateFundSelection(newFunds, funds, maxSelection);
    if (validation.isValid) {
      setSelectedFunds(newFunds);
    }
  };

  const addFund = (fund: Fund) => {
    if (!selectedFunds.some((f) => f.id === fund.id)) {
      const newFunds = [...selectedFunds, fund];
      handleFundsChange(newFunds);
    }
  };

  const removeFund = (fundId: string) => {
    const newFunds = selectedFunds.filter((f) => f.id !== fundId);
    setSelectedFunds(newFunds);
  };

  const clearSelection = () => {
    setSelectedFunds([]);
  };

  const isSelected = (fundId: string) => {
    return selectedFunds.some((f) => f.id === fundId);
  };

  const canAddMore = !maxSelection || selectedFunds.length < maxSelection;

  return {
    selectedFunds,
    setSelectedFunds: handleFundsChange,
    addFund,
    removeFund,
    clearSelection,
    isSelected,
    canAddMore,
    summary: getFundSelectionSummary(selectedFunds),
    validation: validateFundSelection(selectedFunds, funds, maxSelection),
  };
}
