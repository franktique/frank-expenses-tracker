import { useState, useEffect, useCallback } from "react";
import { Fund } from "@/types/funds";
import { SOURCE_FUND_VALIDATION_MESSAGES } from "@/lib/source-fund-validation";

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

interface SourceFundValidationState {
  isValidating: boolean;
  validation: ValidationResult | null;
  availableFunds: Fund[];
  hasRestrictions: boolean;
  categoryName: string;
}

export function useSourceFundValidation() {
  const [state, setState] = useState<SourceFundValidationState>({
    isValidating: false,
    validation: null,
    availableFunds: [],
    hasRestrictions: false,
    categoryName: "",
  });

  // Validate source fund for a specific category
  const validateSourceFund = useCallback(
    async (
      categoryId: string,
      sourceFundId: string,
      destinationFundId?: string,
      amount?: number
    ): Promise<ValidationResult> => {
      setState((prev) => ({ ...prev, isValidating: true }));

      try {
        const params = new URLSearchParams({
          category_id: categoryId,
          source_fund_id: sourceFundId,
        });

        if (destinationFundId) {
          params.append("destination_fund_id", destinationFundId);
        }

        if (amount) {
          params.append("amount", amount.toString());
        }

        const response = await fetch(
          `/api/expenses/validate-source-fund?${params}`
        );
        const data = await response.json();

        const result: ValidationResult = {
          isValid: data.isValid || false,
          errors: data.errors || [],
          warnings: data.warnings || [],
          recommendations: data.recommendations || [],
        };

        setState((prev) => ({ ...prev, validation: result }));
        return result;
      } catch (error) {
        console.error("Error validating source fund:", error);
        const result: ValidationResult = {
          isValid: false,
          errors: [SOURCE_FUND_VALIDATION_MESSAGES.SERVER_ERROR],
          warnings: [],
          recommendations: ["Intente nuevamente o contacte al soporte técnico"],
        };

        setState((prev) => ({ ...prev, validation: result }));
        return result;
      } finally {
        setState((prev) => ({ ...prev, isValidating: false }));
      }
    },
    []
  );

  // Get available funds for a category
  const getAvailableFunds = useCallback(
    async (categoryId: string): Promise<Fund[]> => {
      setState((prev) => ({ ...prev, isValidating: true }));

      try {
        const response = await fetch(
          `/api/expenses/validate-source-fund?category_id=${categoryId}`
        );
        const data = await response.json();

        setState((prev) => ({
          ...prev,
          availableFunds: data.available_funds || [],
          hasRestrictions: data.has_restrictions || false,
          categoryName: data.category_name || "",
        }));

        return data.available_funds || [];
      } catch (error) {
        console.error("Error fetching available funds:", error);
        setState((prev) => ({
          ...prev,
          availableFunds: [],
          hasRestrictions: false,
          categoryName: "",
        }));
        return [];
      } finally {
        setState((prev) => ({ ...prev, isValidating: false }));
      }
    },
    []
  );

  // Comprehensive validation with POST request
  const validateExpenseConfiguration = useCallback(
    async (config: {
      category_id: string;
      source_fund_id: string;
      destination_fund_id?: string;
      amount?: number;
      expense_id?: string;
    }): Promise<ValidationResult> => {
      setState((prev) => ({ ...prev, isValidating: true }));

      try {
        const response = await fetch("/api/expenses/validate-source-fund", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
        });

        const data = await response.json();

        const result: ValidationResult = {
          isValid: data.isValid || false,
          errors: data.errors || [],
          warnings: data.warnings || [],
          recommendations: data.recommendations || [],
        };

        setState((prev) => ({ ...prev, validation: result }));
        return result;
      } catch (error) {
        console.error("Error validating expense configuration:", error);
        const result: ValidationResult = {
          isValid: false,
          errors: [SOURCE_FUND_VALIDATION_MESSAGES.SERVER_ERROR],
          warnings: [],
          recommendations: ["Intente nuevamente o contacte al soporte técnico"],
        };

        setState((prev) => ({ ...prev, validation: result }));
        return result;
      } finally {
        setState((prev) => ({ ...prev, isValidating: false }));
      }
    },
    []
  );

  // Client-side validation for immediate feedback
  const validateClientSide = useCallback(
    (
      selectedSourceFund: Fund | null,
      availableFunds: Fund[],
      required: boolean = true,
      amount?: number
    ): ValidationResult => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const recommendations: string[] = [];

      // Required field validation
      if (required && !selectedSourceFund) {
        errors.push(SOURCE_FUND_VALIDATION_MESSAGES.SOURCE_FUND_REQUIRED);
        recommendations.push(
          "Seleccione un fondo origen de la lista disponible"
        );
      }

      // Fund availability validation
      if (selectedSourceFund && availableFunds.length > 0) {
        const isAvailable = availableFunds.some(
          (fund) => fund.id === selectedSourceFund.id
        );
        if (!isAvailable) {
          errors.push(
            SOURCE_FUND_VALIDATION_MESSAGES.SOURCE_FUND_INVALID_FOR_CATEGORY
          );
          recommendations.push(
            "Seleccione un fondo que esté asociado con la categoría"
          );
        }
      }

      // Balance validation
      if (selectedSourceFund && amount) {
        if (selectedSourceFund.current_balance <= 0) {
          warnings.push(SOURCE_FUND_VALIDATION_MESSAGES.ZERO_BALANCE);
          recommendations.push("Considere usar un fondo con balance positivo");
        } else if (amount > selectedSourceFund.current_balance) {
          warnings.push(SOURCE_FUND_VALIDATION_MESSAGES.INSUFFICIENT_BALANCE);
          recommendations.push(
            "Reduzca el monto o seleccione un fondo con mayor balance"
          );
        }
      }

      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        recommendations,
      };

      setState((prev) => ({ ...prev, validation: result }));
      return result;
    },
    []
  );

  // Clear validation state
  const clearValidation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      validation: null,
    }));
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    setState({
      isValidating: false,
      validation: null,
      availableFunds: [],
      hasRestrictions: false,
      categoryName: "",
    });
  }, []);

  return {
    // State
    isValidating: state.isValidating,
    validation: state.validation,
    availableFunds: state.availableFunds,
    hasRestrictions: state.hasRestrictions,
    categoryName: state.categoryName,

    // Actions
    validateSourceFund,
    getAvailableFunds,
    validateExpenseConfiguration,
    validateClientSide,
    clearValidation,
    reset,

    // Computed properties
    isValid: state.validation?.isValid ?? true,
    errors: state.validation?.errors ?? [],
    warnings: state.validation?.warnings ?? [],
    recommendations: state.validation?.recommendations ?? [],
    hasErrors: (state.validation?.errors.length ?? 0) > 0,
    hasWarnings: (state.validation?.warnings.length ?? 0) > 0,
  };
}

// Hook for managing source fund selection with validation
export function useSourceFundSelection(
  categoryId: string | null,
  initialSourceFund?: Fund | null
) {
  const [selectedSourceFund, setSelectedSourceFund] = useState<Fund | null>(
    initialSourceFund || null
  );
  const validation = useSourceFundValidation();

  // Load available funds when category changes
  useEffect(() => {
    if (categoryId) {
      validation.getAvailableFunds(categoryId);
    } else {
      validation.reset();
      setSelectedSourceFund(null);
    }
  }, [categoryId, validation]);

  // Auto-select fund when only one is available
  useEffect(() => {
    if (
      validation.availableFunds.length === 1 &&
      !selectedSourceFund &&
      categoryId
    ) {
      setSelectedSourceFund(validation.availableFunds[0]);
    }
  }, [validation.availableFunds, selectedSourceFund, categoryId]);

  // Validate selection when it changes
  useEffect(() => {
    if (categoryId && selectedSourceFund) {
      validation.validateSourceFund(categoryId, selectedSourceFund.id);
    } else {
      validation.clearValidation();
    }
  }, [categoryId, selectedSourceFund, validation]);

  const handleSourceFundChange = useCallback((fund: Fund | null) => {
    setSelectedSourceFund(fund);
  }, []);

  return {
    // Selection state
    selectedSourceFund,
    setSelectedSourceFund: handleSourceFundChange,

    // Validation state
    ...validation,

    // Computed properties
    canSelectFund: validation.availableFunds.length > 0,
    shouldAutoSelect: validation.availableFunds.length === 1,
  };
}

// Hook for form validation with source funds
export function useSourceFundFormValidation() {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const validation = useSourceFundValidation();

  const validateForm = useCallback(
    async (formData: {
      category_id?: string;
      source_fund_id?: string;
      destination_fund_id?: string;
      amount?: number;
      description?: string;
    }): Promise<boolean> => {
      const errors: Record<string, string> = {};

      // Basic field validation
      if (!formData.category_id) {
        errors.category_id = "La categoría es obligatoria";
      }

      if (!formData.source_fund_id) {
        errors.source_fund_id =
          SOURCE_FUND_VALIDATION_MESSAGES.SOURCE_FUND_REQUIRED;
      }

      if (!formData.description?.trim()) {
        errors.description = "La descripción es obligatoria";
      }

      if (!formData.amount || formData.amount <= 0) {
        errors.amount = "El monto debe ser mayor a cero";
      }

      // Source fund validation if both category and source fund are provided
      if (formData.category_id && formData.source_fund_id) {
        const result = await validation.validateExpenseConfiguration({
          category_id: formData.category_id,
          source_fund_id: formData.source_fund_id,
          destination_fund_id: formData.destination_fund_id,
          amount: formData.amount,
        });

        if (!result.isValid) {
          errors.source_fund_id = result.errors[0] || "Fondo origen no válido";
        }
      }

      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    },
    [validation]
  );

  const clearFormErrors = useCallback(() => {
    setFormErrors({});
  }, []);

  const getFieldError = useCallback(
    (fieldName: string): string | undefined => {
      return formErrors[fieldName];
    },
    [formErrors]
  );

  return {
    formErrors,
    validateForm,
    clearFormErrors,
    getFieldError,
    hasErrors: Object.keys(formErrors).length > 0,
    validation,
  };
}
