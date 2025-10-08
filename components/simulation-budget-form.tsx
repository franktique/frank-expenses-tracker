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
import { Loader2, Save, Calculator, AlertCircle, Download } from "lucide-react";
import { exportSimulationToExcel } from "@/lib/excel-export-utils";
import {
  validateBudgetAmountInput,
  validateBudgetFormData,
  checkDataLossRisks,
} from "@/lib/simulation-validation";
import { useSimulationRetry } from "@/hooks/use-simulation-retry";
import { SimulationErrorWrapper } from "@/components/simulation-error-boundary";
import { DataConsistencyAlert } from "@/components/simulation-fallback-components";

// Types
type Category = {
  id: string | number; // Support both string (UUID) and number IDs
  name: string;
  fund_name?: string;
};

type SimulationBudget = {
  category_id: string | number; // Support both string (UUID) and number IDs
  category_name: string;
  efectivo_amount: number;
  credito_amount: number;
};

type BudgetFormData = {
  [categoryId: string]: {
    // Use string to support UUID category IDs
    efectivo_amount: string;
    credito_amount: string;
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
    };
  }>({});

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
    field: "efectivo_amount" | "credito_amount",
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

    // Update budget data, ensuring both fields exist
    setBudgetData((prev) => ({
      ...prev,
      [categoryKey]: {
        efectivo_amount: prev[categoryKey]?.efectivo_amount ?? "0",
        credito_amount: prev[categoryKey]?.credito_amount ?? "0",
        [field]: sanitizedValue,
      },
    }));

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);

    // Validate and update errors for the changed field only (with typing flag)
    const error = validateField(sanitizedValue, true);
    setErrors((prev) => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        [field === "efectivo_amount" ? "efectivo" : "credito"]: error,
      },
    }));
  };

  // Handle input blur (when user finishes editing and field loses focus)
  const handleInputBlur = useCallback(
    async (
      categoryId: string | number,
      field: "efectivo_amount" | "credito_amount",
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
      setErrors((prev) => ({
        ...prev,
        [categoryKey]: {
          ...prev[categoryKey],
          [field === "efectivo_amount" ? "efectivo" : "credito"]: error,
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
    let totalGeneral = 0;

    Object.entries(budgetData).forEach(([categoryId, data]) => {
      const efectivo = parseFloat(data.efectivo_amount) || 0;
      const credito = parseFloat(data.credito_amount) || 0;

      totalEfectivo += efectivo;
      totalCredito += credito;
      totalGeneral += efectivo + credito;
    });

    return {
      efectivo: totalEfectivo,
      credito: totalCredito,
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

  // Calculate balances for each category (running balance)
  const categoryBalances = useMemo(() => {
    const balances = new Map<string, number>();
    let runningBalance = totalIncome;

    // Sort categories by name (same order as display)
    const sortedCategories = [...categories].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    sortedCategories.forEach((category) => {
      const categoryData = budgetData[String(category.id)];
      if (categoryData) {
        // Only decrease balance for Efectivo (cash) amounts
        const efectivoAmount = parseFloat(categoryData.efectivo_amount) || 0;
        runningBalance -= efectivoAmount;
        balances.set(String(category.id), runningBalance);
      } else {
        balances.set(String(category.id), runningBalance);
      }
    });

    return balances;
  }, [budgetData, categories, totalIncome]);

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
        <div className="grid gap-4 md:grid-cols-3">
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
                  <TableHead className="w-1/4">Categoría</TableHead>
                  <TableHead className="text-right w-1/5">Efectivo</TableHead>
                  <TableHead className="text-right w-1/5">Crédito</TableHead>
                  <TableHead className="text-right w-1/5">Total</TableHead>
                  <TableHead className="text-right w-1/5">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((category) => {
                    const categoryData = budgetData[String(category.id)];
                    const categoryErrors = errors[String(category.id)];
                    const categoryTotal = getCategoryTotal(category.id);

                    return (
                      <TableRow key={category.id}>
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
                {categories.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
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
