"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Save, Calculator, AlertCircle, Download, ArrowUpDown, GripVertical } from "lucide-react";
import { exportSimulationToExcel } from "@/lib/excel-export-utils";
import {
  validateBudgetAmountInput,
  validateBudgetFormData,
  checkDataLossRisks,
} from "@/lib/simulation-validation";
import { useSimulationRetry } from "@/hooks/use-simulation-retry";
import { SimulationErrorWrapper } from "@/components/simulation-error-boundary";
import { DataConsistencyAlert } from "@/components/simulation-fallback-components";
import { TipoGastoBadge } from "@/components/tipo-gasto-badge";
import type { TipoGasto } from "@/types/funds";
import { TIPO_GASTO_SORT_ORDERS } from "@/types/funds";

// Types
type Category = {
  id: string | number; // Support both string (UUID) and number IDs
  name: string;
  fund_name?: string;
  tipo_gasto?: TipoGasto;
};

type SimulationBudget = {
  category_id: string | number; // Support both string (UUID) and number IDs
  category_name: string;
  efectivo_amount: number;
  credito_amount: number;
  expected_savings: number;
  tipo_gasto?: TipoGasto;
};

type BudgetFormData = {
  [categoryId: string]: {
    // Use string to support UUID category IDs
    efectivo_amount: string;
    credito_amount: string;
    expected_savings: string;
  };
};

interface SimulationBudgetFormProps {
  simulationId: number;
  simulationName: string;
  totalIncome?: number;
  onSave?: () => void;
  onCancel?: () => void;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export function SimulationBudgetForm({
  simulationId,
  simulationName,
  totalIncome = 0,
  onSave,
  onCancel,
  autoSave = true,
  autoSaveDelay = 2000,
}: SimulationBudgetFormProps) {
  const { toast } = useToast();

  // Enhanced error handling with retry mechanism
  const retry = useSimulationRetry({
    maxRetries: 3,
    showToasts: true,
    onSuccess: () => {
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    },
  });

  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetData, setBudgetData] = useState<BudgetFormData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isSavingOnBlur, setIsSavingOnBlur] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errors, setErrors] = useState<{
    [categoryId: number]: {
      efectivo?: string;
      credito?: string;
      expected_savings?: string;
    };
  }>({});
  const [sortField, setSortField] = useState<"tipo_gasto" | "category_name" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  // Custom sort state for tipo_gasto: 0 = none, 1 = Fijo first, 2 = Variable first
  const [tipoGastoSortState, setTipoGastoSortState] = useState<0 | 1 | 2>(0);

  // Drag & drop state management
  const [categoryOrder, setCategoryOrder] = useState<(string | number)[]>([]);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | number | null>(null);
  const [draggedTipoGasto, setDraggedTipoGasto] = useState<TipoGasto | undefined>(undefined);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [isValidDropTarget, setIsValidDropTarget] = useState(false);

  // Load categories and existing budget data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load categories
        const categoriesResponse = await fetch("/api/categories");
        if (!categoriesResponse.ok) {
          throw new Error("Error al cargar categorías");
        }
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);

        // Load existing simulation budgets
        const budgetsResponse = await fetch(
          `/api/simulations/${simulationId}/budgets`
        );
        if (!budgetsResponse.ok) {
          throw new Error("Error al cargar presupuestos de simulación");
        }
        const budgetsResponseData = await budgetsResponse.json();
        const budgetsData: SimulationBudget[] =
          budgetsResponseData.budgets || [];

        console.log("Loaded budgets data:", budgetsData);
        console.log("Categories data:", categoriesData);

        // Initialize budget form data
        const initialBudgetData: BudgetFormData = {};
        categoriesData.forEach((category: Category) => {
          // Ensure category has a valid ID (can be number or UUID string)
          if (!category.id) {
            console.warn("Missing category ID:", category);
            return;
          }

          const existingBudget = budgetsData.find(
            (b) => String(b.category_id) === String(category.id)
          );

          console.log(
            `Category ${category.id} (${category.name}):`,
            existingBudget
          );

          // Ensure amounts are valid numbers
          const efectivoAmount = existingBudget?.efectivo_amount;
          const creditoAmount = existingBudget?.credito_amount;
          const expectedSavings = existingBudget?.expected_savings;

          initialBudgetData[String(category.id)] = {
            efectivo_amount:
              efectivoAmount !== null &&
              efectivoAmount !== undefined &&
              !isNaN(efectivoAmount)
                ? efectivoAmount.toString()
                : "0",
            credito_amount:
              creditoAmount !== null &&
              creditoAmount !== undefined &&
              !isNaN(creditoAmount)
                ? creditoAmount.toString()
                : "0",
            expected_savings:
              expectedSavings !== null &&
              expectedSavings !== undefined &&
              !isNaN(expectedSavings)
                ? expectedSavings.toString()
                : "0",
          };
        });

        setBudgetData(initialBudgetData);
      } catch (error) {
        toast({
          title: "Error",
          description: (error as Error).message || "Error al cargar los datos",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [simulationId, toast]);

  // Simple validation state
  const [hasErrors, setHasErrors] = useState(false);

  // Update validation state when budgetData changes
  useEffect(() => {
    // Don't validate if still loading or budgetData is empty (initial state)
    if (isLoading || !budgetData || Object.keys(budgetData).length === 0) {
      setHasErrors(false);
      return;
    }

    // Add a small delay to avoid validating during rapid typing
    const timeoutId = setTimeout(() => {
      try {
        const formValidation = validateBudgetFormData(budgetData);
        setHasErrors(!formValidation.isValid);
      } catch (error) {
        console.error("Error validating budget form data:", error);
        setHasErrors(false);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [budgetData, isLoading]);

  // Initialize categoryOrder from localStorage or sorted categories
  useEffect(() => {
    if (categories.length > 0 && categoryOrder.length === 0) {
      // Try to load saved order from localStorage
      const storageKey = `simulation_${simulationId}_category_order`;
      const savedOrder = localStorage.getItem(storageKey);

      if (savedOrder) {
        try {
          const parsedOrder = JSON.parse(savedOrder);
          if (Array.isArray(parsedOrder)) {
            setCategoryOrder(parsedOrder);
          } else {
            // Fallback if stored format is invalid
            setCategoryOrder(categories.map((c) => c.id));
          }
        } catch (error) {
          console.error("Error parsing saved category order:", error);
          setCategoryOrder(categories.map((c) => c.id));
        }
      } else {
        // Initialize with current category IDs
        setCategoryOrder(categories.map((c) => c.id));
      }
    }
  }, [categories, simulationId]);

  // Save categoryOrder to localStorage whenever it changes
  useEffect(() => {
    if (categoryOrder.length > 0) {
      const storageKey = `simulation_${simulationId}_category_order`;
      localStorage.setItem(storageKey, JSON.stringify(categoryOrder));
    }
  }, [categoryOrder, simulationId]);

  // Auto-save functionality
  const performSave = useCallback(
    async (showToast = false) => {
      if (hasErrors) {
        return false;
      }

      const isAutoSaveOperation = !showToast;
      if (isAutoSaveOperation) {
        setIsAutoSaving(true);
      } else {
        setIsSaving(true);
      }

      try {
        // Prepare budgets array for API
        const budgets = Object.entries(budgetData).map(([categoryId, data]) => {
          // Handle both numeric and UUID category IDs
          let parsedCategoryId: string | number = categoryId;

          // If it looks like a number, parse it as such
          if (/^\d+$/.test(categoryId)) {
            parsedCategoryId = parseInt(categoryId);
          }
          // Otherwise, keep it as a string (UUID)

          return {
            category_id: parsedCategoryId,
            efectivo_amount: parseFloat(data.efectivo_amount) || 0,
            credito_amount: parseFloat(data.credito_amount) || 0,
            expected_savings: parseFloat(data.expected_savings) || 0,
          };
        });

        console.log("Saving budgets:", budgets);

        const response = await fetch(
          `/api/simulations/${simulationId}/budgets`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ budgets }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Error al guardar los presupuestos"
          );
        }

        setLastSaved(new Date());
        setHasUnsavedChanges(false);

        if (showToast) {
          toast({
            title: "Presupuestos guardados",
            description:
              "Los presupuestos de simulación han sido guardados exitosamente",
          });
        }

        if (onSave) {
          onSave();
        }

        return true;
      } catch (error) {
        if (showToast) {
          toast({
            title: "Error",
            description:
              (error as Error).message || "Error al guardar los presupuestos",
            variant: "destructive",
          });
        }
        return false;
      } finally {
        if (isAutoSaveOperation) {
          setIsAutoSaving(false);
        } else {
          setIsSaving(false);
        }
      }
    },
    [budgetData, hasErrors, simulationId, toast, onSave]
  );

  // Auto-save effect (disabled since we now save on blur)
  // useEffect(() => {
  //   if (!autoSave || !hasUnsavedChanges || hasErrors || isLoading) {
  //     return;
  //   }

  //   const timeoutId = setTimeout(() => {
  //     performSave(false);
  //   }, autoSaveDelay);

  //   return () => clearTimeout(timeoutId);
  // }, [
  //   autoSave,
  //   hasUnsavedChanges,
  //   hasErrors,
  //   isLoading,
  //   autoSaveDelay,
  //   performSave,
  // ]);

  // Import validation utilities
  const {
    validateBudgetAmountInput,
    validateBudgetFormData,
  } = require("@/lib/simulation-validation");

  // Validate individual field using comprehensive validation
  const validateField = (
    value: string,
    isTyping: boolean = true
  ): string | undefined => {
    try {
      const validation = validateBudgetAmountInput(value, isTyping);
      return validation.isValid ? undefined : validation.error;
    } catch (error) {
      console.error("Error validating field:", error);
      return undefined;
    }
  };

  // Handle input changes with validation
  const handleInputChange = (
    categoryId: string | number,
    field: "efectivo_amount" | "credito_amount" | "expected_savings",
    value: string
  ) => {
    // Ensure categoryId is valid (can be string UUID or number)
    if (!categoryId) {
      console.error("Invalid category ID in handleInputChange:", categoryId);
      return;
    }

    // Convert to string for consistent handling
    const categoryKey = String(categoryId);

    // Sanitize the input value
    const sanitizedValue = value === "" ? "0" : value;

    // Update budget data, ensuring all fields exist
    setBudgetData((prev) => ({
      ...prev,
      [categoryKey]: {
        efectivo_amount: prev[categoryKey]?.efectivo_amount ?? "0",
        credito_amount: prev[categoryKey]?.credito_amount ?? "0",
        expected_savings: prev[categoryKey]?.expected_savings ?? "0",
        [field]: sanitizedValue,
      },
    }));

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);

    // Validate and update errors for the changed field only (with typing flag)
    const error = validateField(sanitizedValue, true);
    const errorFieldName = field === "efectivo_amount" ? "efectivo" : field === "credito_amount" ? "credito" : "expected_savings";
    setErrors((prev) => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        [errorFieldName]: error,
      },
    }));
  };

  // Handle input blur (when user finishes editing and field loses focus)
  const handleInputBlur = useCallback(
    async (
      categoryId: string | number,
      field: "efectivo_amount" | "credito_amount" | "expected_savings",
      value: string
    ) => {
      // Ensure categoryId is valid
      if (!categoryId) {
        console.error("Invalid category ID in handleInputBlur:", categoryId);
        return;
      }

      // Convert to string for consistent handling
      const categoryKey = String(categoryId);

      // Final validation without typing flag (stricter validation)
      const error = validateField(value, false);
      const errorFieldName = field === "efectivo_amount" ? "efectivo" : field === "credito_amount" ? "credito" : "expected_savings";
      setErrors((prev) => ({
        ...prev,
        [categoryKey]: {
          ...prev[categoryKey],
          [errorFieldName]: error,
        },
      }));

      // Small delay to allow state updates to propagate
      setTimeout(async () => {
        // Check if we have unsaved changes and no validation errors
        if (hasUnsavedChanges && !error) {
          try {
            // Perform a quick validation check on the entire form
            const formValidation = validateBudgetFormData(budgetData);

            if (formValidation.isValid) {
              setIsSavingOnBlur(true);
              await performSave(false); // Auto-save without showing toast
              setIsSavingOnBlur(false);
            }
          } catch (saveError) {
            console.error("Auto-save failed on blur:", saveError);
            setIsSavingOnBlur(false);
            // Don't show error toast for auto-save failures to avoid being intrusive
          }
        }
      }, 100);
    },
    [hasUnsavedChanges, budgetData, performSave]
  );

  // Calculate totals
  const totals = useMemo(() => {
    let totalEfectivo = 0;
    let totalCredito = 0;
    let totalExpectedSavings = 0;
    let totalGeneral = 0;

    Object.entries(budgetData).forEach(([categoryId, data]) => {
      const efectivo = parseFloat(data.efectivo_amount) || 0;
      const credito = parseFloat(data.credito_amount) || 0;
      const expectedSavings = parseFloat(data.expected_savings) || 0;

      totalEfectivo += efectivo;
      totalCredito += credito;
      totalExpectedSavings += expectedSavings;
      totalGeneral += efectivo + credito;
    });

    const totalNetSpend = totalEfectivo - totalExpectedSavings;

    return {
      efectivo: totalEfectivo,
      credito: totalCredito,
      expectedSavings: totalExpectedSavings,
      netSpend: totalNetSpend,
      general: totalGeneral,
    };
  }, [budgetData]);

  // Get category total
  const getCategoryTotal = (categoryId: string | number): number => {
    const data = budgetData[String(categoryId)];
    if (!data) return 0;

    const efectivo = parseFloat(data.efectivo_amount) || 0;
    const credito = parseFloat(data.credito_amount) || 0;
    return efectivo + credito;
  };

  // Helper function to get numeric sort value for tipo_gasto based on current sort state
  const getTipoGastoSortValue = (tipoGasto: TipoGasto | undefined): number => {
    if (!tipoGasto) return 5; // Put undefined values at the end

    if (tipoGastoSortState === 1) {
      // State 1: Fijo → Semi-Fijo → Variable → Eventual
      return (TIPO_GASTO_SORT_ORDERS.STATE_1[tipoGasto] as number) || 5;
    } else if (tipoGastoSortState === 2) {
      // State 2: Variable → Semi-Fijo → Fijo → Eventual
      return (TIPO_GASTO_SORT_ORDERS.STATE_2[tipoGasto] as number) || 5;
    }
    return 5; // Default for state 0 (no custom sort)
  };

  // Get sorted categories based on current sort settings
  const getSortedCategories = useMemo(() => {
    let sorted = [...categories].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    if (sortField === "tipo_gasto" && tipoGastoSortState !== 0) {
      // Use custom tipo_gasto sort order
      sorted.sort((a, b) => {
        const aSortValue = getTipoGastoSortValue(a.tipo_gasto);
        const bSortValue = getTipoGastoSortValue(b.tipo_gasto);
        return aSortValue - bSortValue;
      });

      // Apply custom drag-drop order within each tipo_gasto group
      if (categoryOrder.length > 0) {
        sorted.sort((a, b) => {
          // First, sort by tipo_gasto value (from getTipoGastoSortValue)
          const aSortValue = getTipoGastoSortValue(a.tipo_gasto);
          const bSortValue = getTipoGastoSortValue(b.tipo_gasto);

          if (aSortValue !== bSortValue) {
            return aSortValue - bSortValue;
          }

          // If same tipo_gasto group, use custom categoryOrder
          const aIndex = categoryOrder.indexOf(a.id);
          const bIndex = categoryOrder.indexOf(b.id);

          const aOrderIndex = aIndex !== -1 ? aIndex : categoryOrder.length;
          const bOrderIndex = bIndex !== -1 ? bIndex : categoryOrder.length;

          return aOrderIndex - bOrderIndex;
        });
      }
    } else if (sortField === "category_name") {
      sorted.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name);
        return sortDirection === "asc" ? comparison : -comparison;
      });
    } else if (categoryOrder.length > 0) {
      // Apply custom drag-drop order when no sorting is active
      sorted.sort((a, b) => {
        const aIndex = categoryOrder.indexOf(a.id);
        const bIndex = categoryOrder.indexOf(b.id);

        const aOrderIndex = aIndex !== -1 ? aIndex : categoryOrder.length;
        const bOrderIndex = bIndex !== -1 ? bIndex : categoryOrder.length;

        return aOrderIndex - bOrderIndex;
      });
    }

    return sorted;
  }, [categories, sortField, sortDirection, tipoGastoSortState, categoryOrder]);

  // Calculate balances for each category (running balance)
  const categoryBalances = useMemo(() => {
    const balances = new Map<string, number>();
    let runningBalance = totalIncome;

    getSortedCategories.forEach((category) => {
      const categoryData = budgetData[String(category.id)];
      if (categoryData) {
        // Calculate net spend: Efectivo - Expected Savings
        const efectivoAmount = parseFloat(categoryData.efectivo_amount) || 0;
        const expectedSavings = parseFloat(categoryData.expected_savings) || 0;
        const netSpend = efectivoAmount - expectedSavings;

        // Decrease balance by net spend (actual amount after savings)
        runningBalance -= netSpend;
        balances.set(String(category.id), runningBalance);
      } else {
        balances.set(String(category.id), runningBalance);
      }
    });

    return balances;
  }, [budgetData, getSortedCategories, totalIncome]);

  // Get balance color based on value
  const getBalanceColor = (balance: number): string => {
    if (balance < 0) return "text-red-600";
    if (balance < totalIncome * 0.1) return "text-orange-600"; // Warning if less than 10% remaining
    return "text-green-600";
  };

  // Get comprehensive validation feedback
  const validationFeedback = useMemo(() => {
    const formValidation = validateBudgetFormData(budgetData);
    if (formValidation.isValid) return null;

    const errorMessages: string[] = [];
    Object.entries(formValidation.errors).forEach(
      ([categoryId, categoryErrors]) => {
        // Handle both numeric and UUID category IDs
        const category = categories.find((c) => String(c.id) === categoryId);
        const categoryName = category?.name || `Categoría ${categoryId}`;

        if (categoryErrors.efectivo) {
          errorMessages.push(
            `${categoryName} - Efectivo: ${categoryErrors.efectivo}`
          );
        }
        if (categoryErrors.credito) {
          errorMessages.push(
            `${categoryName} - Crédito: ${categoryErrors.credito}`
          );
        }
      }
    );

    return {
      totalErrors: formValidation.totalErrors,
      messages: errorMessages,
    };
  }, [budgetData, categories]);

  // Handle save
  // Handle manual save
  const handleSave = async () => {
    if (hasErrors) {
      toast({
        title: "Error de validación",
        description: "Corrige los errores antes de guardar",
        variant: "destructive",
      });
      return;
    }

    await performSave(true);
  };

  // Handle Excel export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportSimulationToExcel(simulationId);
      toast({
        title: "Exportación exitosa",
        description: "El archivo Excel se ha descargado correctamente",
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Error al exportar",
        description:
          (error as Error).message || "No se pudo generar el archivo Excel",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle sort column click
  const handleSortClick = (field: "tipo_gasto" | "category_name") => {
    if (field === "tipo_gasto") {
      // Custom 3-cycle behavior for tipo_gasto: 0 → 1 → 2 → 0
      if (sortField === "tipo_gasto") {
        // Already sorting by tipo_gasto, cycle to next state
        if (tipoGastoSortState === 0) {
          setTipoGastoSortState(1);
          setSortField("tipo_gasto");
        } else if (tipoGastoSortState === 1) {
          setTipoGastoSortState(2);
          setSortField("tipo_gasto");
        } else {
          // State 2 → reset to state 0
          setTipoGastoSortState(0);
          setSortField(null);
        }
      } else {
        // Start sorting by tipo_gasto with state 1
        setSortField("tipo_gasto");
        setTipoGastoSortState(1);
      }
    } else if (field === "category_name") {
      // Standard toggle behavior for category_name
      if (sortField === field) {
        // If clicking the same field, toggle direction
        if (sortDirection === "asc") {
          setSortDirection("desc");
        } else {
          // If descending, clear the sort
          setSortField(null);
          setSortDirection("asc");
        }
      } else {
        // If clicking a different field, set it as sort field with ascending direction
        setSortField(field);
        setSortDirection("asc");
      }
    }
  };

  // Drag & Drop Event Handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, categoryId: string | number, tipoGasto?: TipoGasto) => {
      setDraggedCategoryId(categoryId);
      setDraggedTipoGasto(tipoGasto);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/html", "");
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetCategoryId: string | number, targetTipoGasto?: TipoGasto) => {
      e.preventDefault();

      // Check if drop target is in the same tipo_gasto group as dragged item
      const isValidTarget = draggedTipoGasto === targetTipoGasto;
      setIsValidDropTarget(isValidTarget);

      if (isValidTarget) {
        e.dataTransfer.dropEffect = "move";
      } else {
        e.dataTransfer.dropEffect = "none";
      }
    },
    [draggedTipoGasto]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetCategoryId: string | number, targetTipoGasto?: TipoGasto) => {
      e.preventDefault();

      if (!draggedCategoryId || draggedTipoGasto !== targetTipoGasto) {
        return;
      }

      // Create new order array
      const newOrder = [...categoryOrder];
      const draggedIndex = newOrder.indexOf(draggedCategoryId);
      const targetIndex = newOrder.indexOf(targetCategoryId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      // Remove dragged item
      const [draggedItem] = newOrder.splice(draggedIndex, 1);

      // Insert at target position
      if (draggedIndex < targetIndex) {
        newOrder.splice(targetIndex - 1, 0, draggedItem);
      } else {
        newOrder.splice(targetIndex, 0, draggedItem);
      }

      setCategoryOrder(newOrder);
      setDraggedCategoryId(null);
      setDraggedTipoGasto(undefined);
      setIsValidDropTarget(false);
    },
    [draggedCategoryId, draggedTipoGasto, categoryOrder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedCategoryId(null);
    setDraggedTipoGasto(undefined);
    setDropTargetIndex(null);
    setIsValidDropTarget(false);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando presupuestos...</span>
        </div>
      </div>
    );
  }

  return (
    <SimulationErrorWrapper
      context="Configuración de presupuestos"
      simulationId={simulationId}
      showDetails={false}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Configurar Presupuestos
            </h1>
            <p className="text-muted-foreground">
              Simulación: <span className="font-medium">{simulationName}</span>
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {(isAutoSaving || isSaving || isSavingOnBlur) && (
              <div className="flex items-center space-x-2 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Guardando...</span>
              </div>
            )}
            {!isAutoSaving && !isSaving && !isSavingOnBlur && lastSaved && (
              <div className="text-green-600">
                Guardado: {lastSaved.toLocaleTimeString()}
              </div>
            )}
            {!isAutoSaving &&
              !isSaving &&
              !isSavingOnBlur &&
              hasUnsavedChanges && (
                <div className="text-orange-600">Cambios sin guardar</div>
              )}
          </div>
        </div>

        {/* Validation Feedback */}
        {validationFeedback && validationFeedback.totalErrors > 0 && (
          <DataConsistencyAlert
            issues={validationFeedback.messages}
            severity="error"
            onResolve={() => {
              toast({
                title: "Corrija los errores",
                description:
                  "Revise los campos marcados en rojo y corrija los valores",
                variant: "destructive",
              });
            }}
          />
        )}

        {/* Totals Summary */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Efectivo
              </CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.efectivo)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Crédito
              </CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(totals.credito)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ahorro Esperado
              </CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(totals.expectedSavings)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Gasto neto: {formatCurrency(totals.netSpend)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total General
              </CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totals.general)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {
                  Object.keys(budgetData).filter(
                    (categoryId) => getCategoryTotal(categoryId) > 0
                  ).length
                }{" "}
                categorías con presupuesto
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Budget Form */}
        <Card>
          <CardHeader>
            <CardTitle>Presupuestos por Categoría</CardTitle>
            <CardDescription>
              Establece los montos de Efectivo y Crédito para cada categoría
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 pl-2"></TableHead>
                  <TableHead className="w-1/6">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSortClick("category_name")}
                    >
                      Categoría
                      {sortField === "category_name" && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="w-1/6">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSortClick("tipo_gasto")}
                      title={
                        tipoGastoSortState === 0
                          ? "Click para ordenar: Fijo → Semi-Fijo → Variable → Eventual"
                          : tipoGastoSortState === 1
                            ? "Click para ordenar: Variable → Semi-Fijo → Fijo → Eventual"
                            : "Click para resetear orden"
                      }
                    >
                      Tipo Gasto
                      {sortField === "tipo_gasto" && (
                        <>
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                          <span className="ml-1 text-xs text-muted-foreground">
                            {tipoGastoSortState}
                          </span>
                        </>
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right w-1/6">Efectivo</TableHead>
                  <TableHead className="text-right w-1/6">Crédito</TableHead>
                  <TableHead className="text-right w-1/6">Ahorro Esperado</TableHead>
                  <TableHead className="text-right w-1/6">Total</TableHead>
                  <TableHead className="text-right w-1/6">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getSortedCategories.map((category) => {
                    const categoryData = budgetData[String(category.id)];
                    const categoryErrors = errors[String(category.id)];
                    const categoryTotal = getCategoryTotal(category.id);

                    return (
                      <TableRow
                        key={category.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, category.id, category.tipo_gasto)}
                        onDragOver={(e) => handleDragOver(e, category.id, category.tipo_gasto)}
                        onDrop={(e) => handleDrop(e, category.id, category.tipo_gasto)}
                        onDragEnd={handleDragEnd}
                        className={`cursor-move group ${
                          draggedCategoryId === category.id
                            ? "opacity-50 bg-accent"
                            : ""
                        } ${
                          draggedCategoryId &&
                          draggedTipoGasto === category.tipo_gasto &&
                          draggedCategoryId !== category.id
                            ? isValidDropTarget
                              ? "bg-blue-50 dark:bg-blue-950"
                              : ""
                            : ""
                        }`}
                      >
                        <TableCell className="font-medium w-8 pl-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <div>{category.name}</div>
                            {category.fund_name && (
                              <div className="text-xs text-muted-foreground">
                                Fondo: {category.fund_name}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {category.tipo_gasto ? (
                            <TipoGastoBadge tipoGasto={category.tipo_gasto} />
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={categoryData?.efectivo_amount || "0"}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Ensure we have a valid category ID
                                if (category.id) {
                                  handleInputChange(
                                    category.id,
                                    "efectivo_amount",
                                    value
                                  );
                                } else {
                                  console.error(
                                    "Invalid category ID:",
                                    category.id
                                  );
                                }
                              }}
                              onBlur={(e) => {
                                const value = e.target.value;
                                // Ensure we have a valid category ID
                                if (category.id) {
                                  handleInputBlur(
                                    category.id,
                                    "efectivo_amount",
                                    value
                                  );
                                } else {
                                  console.error(
                                    "Invalid category ID:",
                                    category.id
                                  );
                                }
                              }}
                              className={`w-full text-right ${
                                categoryErrors?.efectivo
                                  ? "border-destructive"
                                  : ""
                              }`}
                              placeholder="0.00"
                            />
                            {categoryErrors?.efectivo && (
                              <p className="text-xs text-destructive">
                                {categoryErrors.efectivo}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={categoryData?.credito_amount || "0"}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Ensure we have a valid category ID
                                if (category.id) {
                                  handleInputChange(
                                    category.id,
                                    "credito_amount",
                                    value
                                  );
                                } else {
                                  console.error(
                                    "Invalid category ID:",
                                    category.id
                                  );
                                }
                              }}
                              onBlur={(e) => {
                                const value = e.target.value;
                                // Ensure we have a valid category ID
                                if (category.id) {
                                  handleInputBlur(
                                    category.id,
                                    "credito_amount",
                                    value
                                  );
                                } else {
                                  console.error(
                                    "Invalid category ID:",
                                    category.id
                                  );
                                }
                              }}
                              className={`w-full text-right ${
                                categoryErrors?.credito
                                  ? "border-destructive"
                                  : ""
                              }`}
                              placeholder="0.00"
                            />
                            {categoryErrors?.credito && (
                              <p className="text-xs text-destructive">
                                {categoryErrors.credito}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              max={parseFloat(categoryData?.efectivo_amount || "0")}
                              value={categoryData?.expected_savings || "0"}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Ensure we have a valid category ID
                                if (category.id) {
                                  handleInputChange(
                                    category.id,
                                    "expected_savings",
                                    value
                                  );
                                } else {
                                  console.error(
                                    "Invalid category ID:",
                                    category.id
                                  );
                                }
                              }}
                              onBlur={(e) => {
                                const value = e.target.value;
                                // Ensure we have a valid category ID
                                if (category.id) {
                                  handleInputBlur(
                                    category.id,
                                    "expected_savings",
                                    value
                                  );
                                } else {
                                  console.error(
                                    "Invalid category ID:",
                                    category.id
                                  );
                                }
                              }}
                              className={`w-full text-right ${
                                categoryErrors?.expected_savings
                                  ? "border-destructive"
                                  : parseFloat(categoryData?.expected_savings || "0") > 0
                                  ? "text-purple-600 font-semibold"
                                  : ""
                              }`}
                              placeholder="0.00"
                            />
                            {categoryErrors?.expected_savings && (
                              <p className="text-xs text-destructive">
                                {categoryErrors.expected_savings}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span
                            className={
                              categoryTotal > 0
                                ? "text-primary"
                                : "text-muted-foreground"
                            }
                          >
                            {formatCurrency(categoryTotal)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          <span
                            className={getBalanceColor(
                              categoryBalances.get(String(category.id)) || 0
                            )}
                          >
                            {formatCurrency(
                              categoryBalances.get(String(category.id)) || 0
                            )}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {getSortedCategories.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-4 text-muted-foreground"
                    >
                      No hay categorías disponibles
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancelar
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting || isSaving || isSavingOnBlur}
            className="text-green-600 hover:text-green-700"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar a Excel
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving || hasErrors || isSavingOnBlur}
            className="text-muted-foreground"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Manualmente
              </>
            )}
          </Button>
        </div>

        {/* Auto-save info */}
        <div className="text-xs text-muted-foreground text-center">
          Los cambios se guardan automáticamente al terminar de editar cada
          campo
        </div>
      </div>
    </SimulationErrorWrapper>
  );
}
