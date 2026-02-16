'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CategoryFundValidationStatus } from '@/components/category-fund-loading-states';
import { Fund } from '@/types/funds';

interface ExpenseFundValidatorProps {
  categoryId: string | null;
  selectedFundId: string | null;
  onValidationChange?: (isValid: boolean, availableFunds: Fund[]) => void;
  className?: string;
}

interface ValidationResult {
  isValid: boolean;
  availableFunds: Fund[];
  hasRestrictions: boolean;
  message: string;
  warnings: string[];
}

export function ExpenseFundValidator({
  categoryId,
  selectedFundId,
  onValidationChange,
  className,
}: ExpenseFundValidatorProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate fund-category combination
  useEffect(() => {
    if (!categoryId) {
      setValidation(null);
      setError(null);
      onValidationChange?.(true, []);
      return;
    }

    const validateCombination = async () => {
      setIsValidating(true);
      setError(null);

      try {
        // Get available funds for category
        const availableFundsResponse = await fetch(
          `/api/categories/${categoryId}/validate-fund`
        );

        if (!availableFundsResponse.ok) {
          throw new Error('Failed to fetch available funds');
        }

        const availableFundsData = await availableFundsResponse.json();

        let validationResult: ValidationResult = {
          isValid: true,
          availableFunds: availableFundsData.available_funds || [],
          hasRestrictions: availableFundsData.has_fund_restrictions || false,
          message: availableFundsData.message || '',
          warnings: [],
        };

        // If a specific fund is selected, validate the combination
        if (selectedFundId) {
          const validationResponse = await fetch(
            `/api/categories/${categoryId}/validate-fund?fund_id=${selectedFundId}`
          );

          if (!validationResponse.ok) {
            const errorData = await validationResponse.json();
            validationResult = {
              ...validationResult,
              isValid: false,
              message:
                errorData.details?.[0] ||
                errorData.error ||
                'Invalid combination',
            };
          } else {
            const validationData = await validationResponse.json();
            validationResult = {
              ...validationResult,
              isValid: true,
              message: validationData.message || 'Valid combination',
              warnings: validationData.warnings || [],
            };
          }
        }

        setValidation(validationResult);
        onValidationChange?.(
          validationResult.isValid,
          validationResult.availableFunds
        );
      } catch (err) {
        const errorMessage = (err as Error).message || 'Validation failed';
        setError(errorMessage);
        onValidationChange?.(false, []);
      } finally {
        setIsValidating(false);
      }
    };

    validateCombination();
  }, [categoryId, selectedFundId, onValidationChange]);

  if (!categoryId) {
    return null;
  }

  if (error) {
    return (
      <CategoryFundValidationStatus
        status="invalid"
        message={`Error de validación: ${error}`}
        className={className}
      />
    );
  }

  if (isValidating) {
    return (
      <CategoryFundValidationStatus
        status="validating"
        message="Validando combinación fondo-categoría..."
        className={className}
      />
    );
  }

  if (!validation) {
    return null;
  }

  const getValidationStatus = () => {
    if (!validation.isValid) return 'invalid';
    if (validation.warnings.length > 0) return 'warning';
    return 'valid';
  };

  return (
    <div className={className}>
      <CategoryFundValidationStatus
        status={getValidationStatus()}
        message={validation.message}
      />

      {/* Available funds info */}
      {validation.availableFunds.length > 0 && (
        <Card className="mt-2 border-muted bg-muted/20">
          <CardContent className="pb-3 pt-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {validation.hasRestrictions
                    ? 'Fondos permitidos para esta categoría:'
                    : 'Todos los fondos están disponibles:'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {validation.availableFunds.map((fund) => (
                  <Badge
                    key={fund.id}
                    variant={fund.id === selectedFundId ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {fund.name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <Card className="mt-2 border-amber-200 bg-amber-50">
          <CardContent className="pb-3 pt-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">
                  Advertencias:
                </span>
              </div>
              <ul className="space-y-1 text-sm">
                {validation.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-amber-600">•</span>
                    <span className="text-amber-700">{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Hook for managing expense fund validation
export function useExpenseFundValidation() {
  const [isValid, setIsValid] = useState(true);
  const [availableFunds, setAvailableFunds] = useState<Fund[]>([]);
  const [validationMessage, setValidationMessage] = useState<string>('');

  const handleValidationChange = (valid: boolean, funds: Fund[]) => {
    setIsValid(valid);
    setAvailableFunds(funds);
  };

  const validateFundForCategory = async (
    categoryId: string,
    fundId: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/categories/${categoryId}/validate-fund?fund_id=${fundId}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        setValidationMessage(
          errorData.details?.[0] || errorData.error || 'Invalid combination'
        );
        return false;
      }

      const data = await response.json();
      setValidationMessage(data.message || 'Valid combination');
      return true;
    } catch (error) {
      setValidationMessage('Error validating fund-category combination');
      return false;
    }
  };

  const getAvailableFundsForCategory = async (
    categoryId: string
  ): Promise<Fund[]> => {
    try {
      const response = await fetch(
        `/api/categories/${categoryId}/validate-fund`
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.available_funds || [];
    } catch (error) {
      console.error('Error fetching available funds:', error);
      return [];
    }
  };

  return {
    isValid,
    availableFunds,
    validationMessage,
    handleValidationChange,
    validateFundForCategory,
    getAvailableFundsForCategory,
  };
}
