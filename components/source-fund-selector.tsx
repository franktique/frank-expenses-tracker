'use client';

import { useState, useEffect } from 'react';
import {
  Check,
  ChevronsUpDown,
  AlertCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useBudget } from '@/context/budget-context';
import { Fund } from '@/types/funds';
import { SOURCE_FUND_VALIDATION_MESSAGES } from '@/lib/source-fund-validation';
import { SourceFundErrorWrapper } from '@/components/source-fund-error-boundary';

interface SourceFundSelectorProps {
  selectedCategoryId: string | null;
  selectedSourceFund: Fund | null;
  onSourceFundChange: (fund: Fund | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  currentFundFilter?: Fund | null; // For smart defaults from fund filter
  defaultFund?: Fund | null; // For configured default fund
  required?: boolean;
  error?: string;
  onValidationChange?: (
    isValid: boolean,
    errors: string[],
    warnings: string[]
  ) => void;
  validateOnChange?: boolean;
  showBalance?: boolean;
  amount?: number; // For balance validation
  componentId?: string; // For component identification
}

export function SourceFundSelector({
  selectedCategoryId,
  selectedSourceFund,
  onSourceFundChange,
  placeholder = 'Seleccionar fondo origen...',
  className,
  disabled = false,
  currentFundFilter,
  defaultFund,
  required = true,
  error,
  onValidationChange,
  validateOnChange = true,
  showBalance = true,
  amount,
  componentId,
}: SourceFundSelectorProps) {
  const { funds, isLoading, error: contextError } = useBudget();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [categoryFunds, setCategoryFunds] = useState<Fund[]>([]);
  const [loadingCategoryFunds, setLoadingCategoryFunds] = useState(false);
  const [categoryFundsError, setCategoryFundsError] = useState<string | null>(
    null
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [hasRestrictions, setHasRestrictions] = useState(false);

  // Fetch funds related to the selected category with enhanced validation
  useEffect(() => {
    if (!selectedCategoryId) {
      setCategoryFunds([]);
      setValidationErrors([]);
      setValidationWarnings([]);
      setHasRestrictions(false);
      onValidationChange?.(true, [], []);
      return;
    }

    const fetchCategoryFunds = async () => {
      setLoadingCategoryFunds(true);
      setCategoryFundsError(null);
      setValidationErrors([]);
      setValidationWarnings([]);

      try {
        // Fetch funds from the API endpoint
        const response = await fetch(
          `/api/categories/${selectedCategoryId}/funds`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const funds = data.funds || [];

        setCategoryFunds(funds);
        setHasRestrictions(funds.length > 0);

        // Auto-select logic when category has only one related fund
        if (funds.length === 1 && !selectedSourceFund) {
          onSourceFundChange(funds[0]);
        }
        // Smart default: use current fund filter if it's related to the category
        else if (
          currentFundFilter &&
          !selectedSourceFund &&
          funds.some((fund: Fund) => fund.id === currentFundFilter.id)
        ) {
          onSourceFundChange(currentFundFilter);
        }
        // Fallback: use configured default fund if it's related to the category
        else if (
          defaultFund &&
          !selectedSourceFund &&
          !currentFundFilter &&
          funds.some((fund: Fund) => fund.id === defaultFund.id)
        ) {
          onSourceFundChange(defaultFund);
        }

        // Add informational warnings
        const warnings: string[] = [];
        if (funds.length === 0) {
          warnings.push('No hay fondos disponibles para esta categoría');
        } else {
          warnings.push(`Esta categoría tiene fondos específicos asociados`);
        }

        setValidationWarnings(warnings);
        onValidationChange?.(funds.length > 0, [], warnings);
      } catch (err) {
        console.error('Error fetching category funds:', err);
        const errorMessage = 'Error cargando fondos de la categoría';
        setCategoryFundsError(errorMessage);
        setCategoryFunds([]);
        setValidationErrors([errorMessage]);
        onValidationChange?.(false, [errorMessage], []);
      } finally {
        setLoadingCategoryFunds(false);
      }
    };

    fetchCategoryFunds();
  }, [
    selectedCategoryId,
    currentFundFilter,
    defaultFund,
    selectedSourceFund,
    onSourceFundChange,
    onValidationChange,
  ]);

  // Clear selection when category changes and current fund is no longer valid
  useEffect(() => {
    if (
      selectedSourceFund &&
      categoryFunds.length > 0 &&
      !categoryFunds.some((fund) => fund.id === selectedSourceFund.id)
    ) {
      onSourceFundChange(null);
    }
  }, [categoryFunds, selectedSourceFund, onSourceFundChange]);

  // Validate selected source fund when it changes
  useEffect(() => {
    if (!validateOnChange || !selectedCategoryId || !selectedSourceFund) {
      setValidationErrors([]);
      setValidationWarnings([]);
      onValidationChange?.(true, [], []);
      return;
    }

    // Simple client-side validation
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if selected fund is in the available funds for this category
    if (
      categoryFunds.length > 0 &&
      !categoryFunds.some((fund) => fund.id === selectedSourceFund.id)
    ) {
      errors.push(
        'El fondo origen seleccionado no está asociado con esta categoría'
      );
    }

    // Add balance warning if amount is provided
    if (amount && amount > selectedSourceFund.current_balance) {
      const balanceWarning = `El monto (${amount.toLocaleString()}) excede el balance disponible (${selectedSourceFund.current_balance.toLocaleString()})`;
      warnings.push(balanceWarning);
    }

    // Add low balance warning
    if (selectedSourceFund.current_balance <= 0) {
      warnings.push(
        `El fondo "${selectedSourceFund.name}" tiene balance cero o negativo`
      );
    }

    setValidationErrors(errors);
    setValidationWarnings(warnings);
    onValidationChange?.(errors.length === 0, errors, warnings);
  }, [
    selectedCategoryId,
    selectedSourceFund,
    validateOnChange,
    onValidationChange,
    amount,
    categoryFunds,
  ]);

  // Filter funds based on search
  const filteredFunds = categoryFunds.filter((fund) =>
    fund.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSelect = (fundId: string) => {
    const fund = categoryFunds.find((f) => f.id === fundId);
    onSourceFundChange(fund || null);
    setOpen(false);
    setSearchValue('');
  };

  const getDisplayValue = () => {
    if (selectedSourceFund) {
      return selectedSourceFund.name;
    }
    return placeholder;
  };

  const getButtonVariant = () => {
    if (error) return 'destructive';
    if (required && !selectedSourceFund) return 'outline';
    return 'outline';
  };

  const getButtonClassName = () => {
    let baseClass = 'w-full justify-between';
    if (error) {
      baseClass += ' border-destructive text-destructive';
    } else if (required && !selectedSourceFund) {
      baseClass += ' border-amber-300 text-amber-700';
    }
    return cn(baseClass, className);
  };

  // Loading state
  if (isLoading || loadingCategoryFunds) {
    return (
      <SourceFundErrorWrapper context="Loading category funds">
        <div className="space-y-2">
          <Button
            variant="outline"
            role="combobox"
            className={getButtonClassName()}
            disabled
          >
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando fondos...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
          {isValidating && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Validando selección...
            </div>
          )}
        </div>
      </SourceFundErrorWrapper>
    );
  }

  // Error state
  if (contextError || categoryFundsError) {
    return (
      <div className="space-y-2">
        <Button
          variant="outline"
          role="combobox"
          className={cn('w-full justify-between text-destructive', className)}
          disabled
        >
          Error cargando fondos
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        {(contextError || categoryFundsError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {contextError || categoryFundsError}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // No category selected
  if (!selectedCategoryId) {
    return (
      <div className="space-y-2">
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            'w-full justify-between text-muted-foreground',
            className
          )}
          disabled
        >
          Seleccione una categoría primero
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>
    );
  }

  // No funds available for category
  if (categoryFunds.length === 0) {
    return (
      <div className="space-y-2">
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            'w-full justify-between text-muted-foreground',
            className
          )}
          disabled
        >
          No hay fondos asociados a esta categoría
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esta categoría no tiene fondos asociados. Configure las relaciones
            categoría-fondo en la sección de categorías.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <SourceFundErrorWrapper context="Source fund selection" resetOnPropsChange>
      <div className="space-y-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              componentId={componentId}
              variant={getButtonVariant()}
              role="combobox"
              aria-expanded={open}
              className={getButtonClassName()}
              disabled={disabled || isValidating}
            >
              {isValidating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
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
                      a.name.localeCompare(b.name, 'es', {
                        sensitivity: 'base',
                      })
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
                            selectedSourceFund?.id === fund.id
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
                          {showBalance && (
                            <span
                              className={cn(
                                'text-xs',
                                fund.current_balance <= 0
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                              )}
                            >
                              Balance: ${fund.current_balance.toLocaleString()}
                              {amount && amount > fund.current_balance && (
                                <span className="ml-1 text-amber-600">
                                  (Insuficiente)
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        {currentFundFilter?.id === fund.id && (
                          <span className="ml-2 text-xs text-blue-600">
                            Filtro actual
                          </span>
                        )}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Validation errors */}
        {(error || validationErrors.length > 0) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error || validationErrors[0]}
              {validationErrors.length > 1 && (
                <ul className="mt-1 list-inside list-disc">
                  {validationErrors.slice(1).map((err, index) => (
                    <li key={index} className="text-xs">
                      {err}
                    </li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Validation warnings */}
        {validationWarnings.length > 0 &&
          !error &&
          validationErrors.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {validationWarnings[0]}
                {validationWarnings.length > 1 && (
                  <ul className="mt-1 list-inside list-disc">
                    {validationWarnings.slice(1).map((warning, index) => (
                      <li key={index} className="text-xs">
                        {warning}
                      </li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

        {/* Required field indicator */}
        {required &&
          !selectedSourceFund &&
          !error &&
          validationErrors.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {SOURCE_FUND_VALIDATION_MESSAGES.SOURCE_FUND_REQUIRED}
              </AlertDescription>
            </Alert>
          )}

        {/* Fund selection info */}
        {selectedSourceFund && showBalance && (
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Fondo origen: {selectedSourceFund.name}</span>
              <span
                className={cn(
                  selectedSourceFund.current_balance <= 0 && 'text-destructive'
                )}
              >
                Balance: ${selectedSourceFund.current_balance.toLocaleString()}
              </span>
            </div>
            {amount && amount > selectedSourceFund.current_balance && (
              <div className="mt-1 text-xs text-amber-600">
                ⚠️ El monto excede el balance disponible
              </div>
            )}
          </div>
        )}

        {/* Auto-selection indicator */}
        {categoryFunds.length === 1 && selectedSourceFund && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <Check className="h-3 w-3" />
            Seleccionado automáticamente (único fondo disponible)
          </div>
        )}

        {/* Smart default indicator */}
        {currentFundFilter &&
          selectedSourceFund?.id === currentFundFilter.id &&
          categoryFunds.length > 1 && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <Check className="h-3 w-3" />
              Seleccionado por filtro actual
            </div>
          )}

        {/* Fund restrictions info */}
        {hasRestrictions && categoryFunds.length > 1 && (
          <div className="text-xs text-muted-foreground">
            Esta categoría tiene {categoryFunds.length} fondos asociados
          </div>
        )}
      </div>
    </SourceFundErrorWrapper>
  );
}

// Validation utility function
export function validateSourceFund(
  selectedSourceFund: Fund | null,
  categoryFunds: Fund[],
  required: boolean = true
): { isValid: boolean; error?: string } {
  if (required && !selectedSourceFund) {
    return {
      isValid: false,
      error: 'Debe seleccionar un fondo origen para el gasto',
    };
  }

  if (
    selectedSourceFund &&
    !categoryFunds.some((fund) => fund.id === selectedSourceFund.id)
  ) {
    return {
      isValid: false,
      error: 'El fondo origen seleccionado no está asociado con esta categoría',
    };
  }

  return { isValid: true };
}

// Hook for managing source fund selection state
export function useSourceFundSelection(
  categoryId: string | null,
  currentFundFilter?: Fund | null
) {
  const [selectedSourceFund, setSelectedSourceFund] = useState<Fund | null>(
    null
  );
  const [categoryFunds, setCategoryFunds] = useState<Fund[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch category funds when category changes
  useEffect(() => {
    if (!categoryId) {
      setCategoryFunds([]);
      setSelectedSourceFund(null);
      return;
    }

    const fetchCategoryFunds = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/categories/${categoryId}/funds`);
        if (!response.ok) {
          throw new Error('Failed to fetch category funds');
        }

        const data = await response.json();
        const funds = data.funds || [];
        setCategoryFunds(funds);

        // Auto-select logic
        if (funds.length === 1) {
          setSelectedSourceFund(funds[0]);
        } else if (
          currentFundFilter &&
          funds.some((fund: Fund) => fund.id === currentFundFilter.id)
        ) {
          setSelectedSourceFund(currentFundFilter);
        } else {
          setSelectedSourceFund(null);
        }
      } catch (err) {
        console.error('Error fetching category funds:', err);
        setError('Error cargando fondos de la categoría');
        setCategoryFunds([]);
        setSelectedSourceFund(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategoryFunds();
  }, [categoryId, currentFundFilter]);

  const validation = validateSourceFund(
    selectedSourceFund,
    categoryFunds,
    true
  );

  return {
    selectedSourceFund,
    setSelectedSourceFund,
    categoryFunds,
    isLoading,
    error,
    validation,
  };
}
