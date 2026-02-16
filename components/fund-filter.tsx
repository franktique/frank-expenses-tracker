'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useBudget } from '@/context/budget-context';
import { Fund } from '@/types/funds';

interface FundFilterProps {
  selectedFund: Fund | null;
  onFundChange: (fund: Fund | null) => void;
  placeholder?: string;
  className?: string;
  includeAllFunds?: boolean;
  allFundsLabel?: string;
  availableFunds?: Fund[]; // New prop to filter available funds
  defaultFund?: Fund | null; // Optional default fund for initial selection
  required?: boolean; // Optional required flag for validation styling
}

export function FundFilter({
  selectedFund,
  onFundChange,
  placeholder = 'Seleccionar fondo...',
  className,
  includeAllFunds = true,
  allFundsLabel = 'Todos los fondos',
  availableFunds,
  defaultFund,
}: FundFilterProps) {
  const { funds, isLoading, error } = useBudget();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Use availableFunds if provided, otherwise use all funds
  const fundsToUse = availableFunds || funds || [];

  // Filter funds based on search
  const filteredFunds = fundsToUse.filter((fund) =>
    fund.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSelect = (fundId: string | null) => {
    if (fundId === null) {
      onFundChange(null);
    } else {
      const fund = fundsToUse.find((f) => f.id === fundId);
      onFundChange(fund || null);
    }
    setOpen(false);
    setSearchValue('');
  };

  const getDisplayValue = () => {
    if (selectedFund) {
      return selectedFund.name;
    }
    if (includeAllFunds && selectedFund === null) {
      return allFundsLabel;
    }
    return placeholder;
  };

  if (isLoading) {
    return (
      <Button
        variant="outline"
        role="combobox"
        className={cn('w-[200px] justify-between', className)}
        disabled
      >
        Cargando...
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  if (error) {
    return (
      <Button
        variant="outline"
        role="combobox"
        className={cn('w-[200px] justify-between text-destructive', className)}
        disabled
      >
        Error cargando fondos
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  if (fundsToUse.length === 0) {
    return (
      <Button
        variant="outline"
        role="combobox"
        className={cn(
          'w-[200px] justify-between text-muted-foreground',
          className
        )}
        disabled
      >
        No hay fondos disponibles
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-[200px] justify-between', className)}
        >
          {getDisplayValue()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput
            placeholder="Buscar fondo..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>No se encontraron fondos.</CommandEmpty>
            <CommandGroup>
              {includeAllFunds && (
                <CommandItem
                  value="all-funds"
                  onSelect={() => handleSelect(null)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedFund === null ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {allFundsLabel}
                </CommandItem>
              )}
              {filteredFunds
                .sort((a, b) =>
                  a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
                )
                .map((fund) => (
                  <CommandItem
                    key={fund.id}
                    value={fund.id}
                    onSelect={() => handleSelect(fund.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedFund?.id === fund.id
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-1 flex-col">
                      <span>{fund.name}</span>
                      {fund.description && (
                        <span className="text-xs text-muted-foreground">
                          {fund.description}
                        </span>
                      )}
                    </div>
                    {defaultFund?.id === fund.id && (
                      <span className="ml-2 text-xs text-blue-600">
                        Por defecto
                      </span>
                    )}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Hook for managing fund filter state with persistence
export function useFundFilter(storageKey: string = 'selectedFund') {
  const { funds, selectedFund, setSelectedFund } = useBudget();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    if (funds && funds.length > 0 && !isInitialized) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const fundId = JSON.parse(stored);
          if (fundId) {
            const fund = funds.find((f) => f.id === fundId);
            if (fund) {
              setSelectedFund(fund);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load fund filter from localStorage:', error);
      }
      setIsInitialized(true);
    }
  }, [funds, storageKey, setSelectedFund, isInitialized]);

  // Persist to localStorage when selection changes
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify(selectedFund?.id || null)
        );
      } catch (error) {
        console.warn('Failed to save fund filter to localStorage:', error);
      }
    }
  }, [selectedFund, storageKey, isInitialized]);

  const handleFundChange = (fund: Fund | null) => {
    setSelectedFund(fund);
  };

  return {
    selectedFund,
    onFundChange: handleFundChange,
    isInitialized,
  };
}

// Specialized components for common use cases
export function ExpenseFundFilter() {
  const { selectedFund, onFundChange } = useFundFilter('expenseFundFilter');

  return (
    <FundFilter
      selectedFund={selectedFund}
      onFundChange={onFundChange}
      placeholder="Seleccionar fondo..."
      includeAllFunds={false}
      className="w-[250px]"
    />
  );
}

export function DashboardFundFilter() {
  const { selectedFund, onFundChange } = useFundFilter('dashboardFundFilter');

  return (
    <FundFilter
      selectedFund={selectedFund}
      onFundChange={onFundChange}
      placeholder="Filtrar por fondo..."
      includeAllFunds={true}
      allFundsLabel="Todos los fondos"
      className="w-[200px]"
    />
  );
}

export function CategoryFundFilter() {
  const { selectedFund, onFundChange } = useFundFilter('categoryFundFilter');

  return (
    <FundFilter
      selectedFund={selectedFund}
      onFundChange={onFundChange}
      placeholder="Asignar a fondo..."
      includeAllFunds={false}
      className="w-[200px]"
    />
  );
}
