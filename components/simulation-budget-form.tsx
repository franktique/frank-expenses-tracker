'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatCurrency } from '@/lib/utils';
import {
  Loader2,
  Save,
  Calculator,
  AlertCircle,
  Download,
  ArrowUpDown,
  GripVertical,
  Filter,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ChevronsDown,
  ChevronsUp,
} from 'lucide-react';
import type { Subgroup, VisibilityState } from '@/types/simulation';
import { exportSimulationToExcel } from '@/lib/excel-export-utils';
import {
  validateBudgetAmountInput,
  validateBudgetFormData,
  checkDataLossRisks,
} from '@/lib/simulation-validation';
import { useSimulationRetry } from '@/hooks/use-simulation-retry';
import { SimulationErrorWrapper } from '@/components/simulation-error-boundary';
import { DataConsistencyAlert } from '@/components/simulation-fallback-components';
import { TipoGastoBadge } from '@/components/tipo-gasto-badge';
import type { TipoGasto } from '@/types/funds';
import { TIPO_GASTO_SORT_ORDERS } from '@/types/funds';
import { SubgroupNameDialog } from '@/components/subgroup-name-dialog';
import { SubgroupHeaderRow } from '@/components/subgroup-header-row';
import { SubgroupSubtotalRow } from '@/components/subgroup-subtotal-row';
import { TemplateSelector } from '@/components/template-selector';
import { SaveAsTemplateDialog } from '@/components/save-as-template-dialog';
import { TemplateManager } from '@/components/template-manager';
import {
  organizeTableRowsWithSubgroups,
  shouldShowRow,
  getSubgroupForCategory,
} from '@/lib/subgroup-table-utils';
import {
  calculateSubgroupSubtotals,
  getSubgroupCategoryCount,
} from '@/lib/subgroup-calculations';
import {
  reorganizeTableRowsWithSubgroupOrder,
  initializeSubgroupOrder,
  cleanupSubgroupOrder,
} from '@/lib/subgroup-reordering-utils';
import {
  toggleVisibility,
  loadVisibilityFromStorage,
  saveVisibilityToStorage,
  isSubgroupVisible,
  isCategoryVisible,
  filterVisibleCategories,
} from '@/lib/visibility-calculation-utils';

// Types
type Category = {
  id: string | number; // Support both string (UUID) and number IDs
  name: string;
  tipo_gasto?: TipoGasto;
};

type SimulationBudget = {
  category_id: string | number; // Support both string (UUID) and number IDs
  category_name: string;
  efectivo_amount: number;
  credito_amount: number;
  ahorro_efectivo_amount?: number;
  ahorro_credito_amount?: number;
  expected_savings: number;
  tipo_gasto?: TipoGasto;
  needs_adjustment?: boolean;
};

type BudgetFormData = {
  [categoryId: string]: {
    // Use string to support UUID category IDs
    efectivo_amount: string;
    credito_amount: string;
    ahorro_efectivo_amount: string;
    ahorro_credito_amount: string;
    expected_savings: string; // Keep for backward compatibility
    needs_adjustment: string; // Boolean as string
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
    [categoryId: string | number]: {
      efectivo?: string;
      credito?: string;
      ahorro_efectivo?: string;
      ahorro_credito?: string;
      expected_savings?: string;
    };
  }>({});
  const [sortField, setSortField] = useState<
    'tipo_gasto' | 'category_name' | null
  >(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  // Custom sort state for tipo_gasto: 0 = none, 1 = Fijo first, 2 = Variable first
  const [tipoGastoSortState, setTipoGastoSortState] = useState<0 | 1 | 2>(0);

  // Drag & drop state management
  const [categoryOrder, setCategoryOrder] = useState<(string | number)[]>([]);
  const [draggedCategoryId, setDraggedCategoryId] = useState<
    string | number | null
  >(null);
  const [draggedTipoGasto, setDraggedTipoGasto] = useState<
    TipoGasto | undefined
  >(undefined);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [isValidDropTarget, setIsValidDropTarget] = useState(false);

  // Filter state management
  const [hideEmptyCategories, setHideEmptyCategories] = useState(false);
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<
    (string | number)[]
  >([]);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  // Sub-group state management
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [isLoadingSubgroups, setIsLoadingSubgroups] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<
    (string | number)[]
  >([]);
  const [isSubgroupCreationMode, setIsSubgroupCreationMode] = useState(false);
  const [expandedSubgroups, setExpandedSubgroups] = useState<Set<string>>(
    new Set()
  );
  const [isSubgroupNameDialogOpen, setIsSubgroupNameDialogOpen] =
    useState(false);
  const [isCreatingSubgroup, setIsCreatingSubgroup] = useState(false);

  // Sub-group addition mode state management
  const [addingToSubgroupId, setAddingToSubgroupId] = useState<string | null>(
    null
  );
  const [categoriesToAddToSubgroup, setCategoriesToAddToSubgroup] = useState<
    (string | number)[]
  >([]);
  const [isAddingCategoriesLoading, setIsAddingCategoriesLoading] =
    useState(false);

  // Sub-group drag & drop reordering state management
  const [subgroupOrder, setSubgroupOrder] = useState<string[]>([]);
  const [uncategorizedCategoryOrder, setUncategorizedCategoryOrder] = useState<
    (string | number)[]
  >([]);
  const [subgroupDragState, setSubgroupDragState] = useState<{
    draggedItemId: string | null;
    draggedItemType: 'subgroup' | 'uncategorized' | null;
    dropZoneIndex: number | null;
  }>({
    draggedItemId: null,
    draggedItemType: null,
    dropZoneIndex: null,
  });

  // Visibility state management
  const [visibilityState, setVisibilityState] = useState<VisibilityState>({});

  // Template state management
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(
    null
  );
  const [currentTemplateName, setCurrentTemplateName] = useState<string | null>(
    null
  );
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);

  // Load categories and existing budget data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load categories
        const categoriesResponse = await fetch('/api/categories');
        if (!categoriesResponse.ok) {
          throw new Error('Error al cargar categorías');
        }
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);

        // Load existing simulation budgets
        const budgetsResponse = await fetch(
          `/api/simulations/${simulationId}/budgets`
        );
        if (!budgetsResponse.ok) {
          throw new Error('Error al cargar presupuestos de simulación');
        }
        const budgetsResponseData = await budgetsResponse.json();
        const budgetsData: SimulationBudget[] =
          budgetsResponseData.budgets || [];

        console.log('Loaded budgets data:', budgetsData);
        console.log('Categories data:', categoriesData);

        // Initialize budget form data
        const initialBudgetData: BudgetFormData = {};
        categoriesData.forEach((category: Category) => {
          // Ensure category has a valid ID (can be number or UUID string)
          if (!category.id) {
            console.warn('Missing category ID:', category);
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
          const ahorroEfectivoAmount = existingBudget?.ahorro_efectivo_amount;
          const ahorroCreditoAmount = existingBudget?.ahorro_credito_amount;
          const expectedSavings = existingBudget?.expected_savings;
          const needsAdjustment = existingBudget?.needs_adjustment;

          initialBudgetData[String(category.id)] = {
            efectivo_amount:
              efectivoAmount !== null &&
              efectivoAmount !== undefined &&
              !isNaN(efectivoAmount)
                ? efectivoAmount.toString()
                : '0',
            credito_amount:
              creditoAmount !== null &&
              creditoAmount !== undefined &&
              !isNaN(creditoAmount)
                ? creditoAmount.toString()
                : '0',
            ahorro_efectivo_amount:
              ahorroEfectivoAmount !== null &&
              ahorroEfectivoAmount !== undefined &&
              !isNaN(ahorroEfectivoAmount)
                ? ahorroEfectivoAmount.toString()
                : // Fallback to expected_savings for backward compatibility
                  expectedSavings !== null &&
                    expectedSavings !== undefined &&
                    !isNaN(expectedSavings)
                  ? expectedSavings.toString()
                  : '0',
            ahorro_credito_amount:
              ahorroCreditoAmount !== null &&
              ahorroCreditoAmount !== undefined &&
              !isNaN(ahorroCreditoAmount)
                ? ahorroCreditoAmount.toString()
                : '0',
            expected_savings:
              expectedSavings !== null &&
              expectedSavings !== undefined &&
              !isNaN(expectedSavings)
                ? expectedSavings.toString()
                : '0',
            needs_adjustment:
              needsAdjustment !== null && needsAdjustment !== undefined
                ? String(needsAdjustment)
                : 'false',
          };
        });

        setBudgetData(initialBudgetData);
      } catch (error) {
        toast({
          title: 'Error',
          description: (error as Error).message || 'Error al cargar los datos',
          variant: 'destructive',
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
        console.error('Error validating budget form data:', error);
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
          console.error('Error parsing saved category order:', error);
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

  // Load excluded categories from localStorage on mount
  useEffect(() => {
    const storageKey = `simulation_${simulationId}_excluded_categories`;
    const savedExcluded = localStorage.getItem(storageKey);
    if (savedExcluded) {
      try {
        const parsed = JSON.parse(savedExcluded);
        if (Array.isArray(parsed)) {
          setExcludedCategoryIds(parsed);
        }
      } catch (error) {
        console.error(
          'Error parsing excluded categories from localStorage:',
          error
        );
        setExcludedCategoryIds([]);
      }
    }
  }, [simulationId]);

  // Save excluded categories to localStorage whenever they change
  useEffect(() => {
    const storageKey = `simulation_${simulationId}_excluded_categories`;
    localStorage.setItem(storageKey, JSON.stringify(excludedCategoryIds));
  }, [excludedCategoryIds, simulationId]);

  // Load sub-groups from database
  useEffect(() => {
    const loadSubgroups = async () => {
      setIsLoadingSubgroups(true);
      try {
        const response = await fetch(
          `/api/simulations/${simulationId}/subgroups`
        );
        if (!response.ok) {
          throw new Error('Error al cargar subgrupos');
        }
        const data = await response.json();
        setSubgroups(data.subgroups || []);
      } catch (error) {
        console.error('Error loading subgroups:', error);
        // Don't show error toast for subgroups, as they are optional
        setSubgroups([]);
      } finally {
        setIsLoadingSubgroups(false);
      }
    };

    loadSubgroups();
  }, [simulationId]);

  // Load currently applied template info
  useEffect(() => {
    const loadAppliedTemplate = async () => {
      try {
        const response = await fetch(
          `/api/simulations/${simulationId}/applied-template`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.appliedTemplate) {
            setCurrentTemplateId(data.appliedTemplate.templateId);
            setCurrentTemplateName(data.appliedTemplate.templateName);
          }
        }
      } catch (error) {
        console.error('Error loading applied template:', error);
        // Non-critical, don't show error to user
      }
    };

    loadAppliedTemplate();
  }, [simulationId]);

  // One-time localStorage migration to database
  useEffect(() => {
    const migrateLocalStorageData = async () => {
      // Check if migration already completed
      const migrationKey = `simulation_${simulationId}_migrated_db_v1`;
      if (localStorage.getItem(migrationKey)) {
        return; // Already migrated
      }

      try {
        // Read localStorage data
        const subgroupOrderKey = `simulation_${simulationId}_subgroup_order`;
        const visibilityKey = `simulation_${simulationId}_visibility_state`;
        const savedOrder = localStorage.getItem(subgroupOrderKey);
        const savedVisibility = localStorage.getItem(visibilityKey);

        // Only migrate if there's data to migrate
        if (!savedOrder && !savedVisibility) {
          localStorage.setItem(migrationKey, 'true');
          return;
        }

        // Send to API for migration
        const response = await fetch(
          `/api/simulations/${simulationId}/migrate-localstorage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subgroupOrder: savedOrder ? JSON.parse(savedOrder) : undefined,
              visibilityState: savedVisibility
                ? JSON.parse(savedVisibility)
                : undefined,
            }),
          }
        );

        const data = await response.json();

        if (data.success) {
          console.log('localStorage data migrated to database:', data.details);
          localStorage.setItem(migrationKey, 'true');
          toast({
            title: 'Data Migrated',
            description:
              'Your subgroup settings have been saved to the database',
          });
        }
      } catch (error) {
        console.error('Failed to migrate localStorage data:', error);
        // Don't block UI, just log error
      }
    };

    migrateLocalStorageData();
  }, [simulationId, toast]);

  // Initialize subgroupOrder from localStorage or database displayOrder
  useEffect(() => {
    if (subgroups.length > 0) {
      try {
        // Try to load saved order from localStorage
        const storageKey = `simulation_${simulationId}_subgroup_order`;
        const savedOrder = localStorage.getItem(storageKey);

        if (savedOrder) {
          const parsedOrder = JSON.parse(savedOrder);
          if (Array.isArray(parsedOrder)) {
            // Validate that all IDs in saved order still exist
            // and add any new subgroups
            const cleanedOrder = cleanupSubgroupOrder(parsedOrder, subgroups);
            const newSubgroupIds = subgroups
              .filter((sg) => !cleanedOrder.includes(sg.id))
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((sg) => sg.id);
            const updatedOrder = [...cleanedOrder, ...newSubgroupIds];
            setSubgroupOrder(updatedOrder);
          } else {
            // Fallback to database order
            setSubgroupOrder(initializeSubgroupOrder(subgroups));
          }
        } else if (subgroupOrder.length === 0) {
          // Only initialize if not already set
          setSubgroupOrder(initializeSubgroupOrder(subgroups));
        } else {
          // Update existing order with any new subgroups
          const newSubgroupIds = subgroups
            .filter((sg) => !subgroupOrder.includes(sg.id))
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((sg) => sg.id);
          if (newSubgroupIds.length > 0) {
            setSubgroupOrder([...subgroupOrder, ...newSubgroupIds]);
          }
        }
      } catch (error) {
        console.error('Error loading subgroup order from localStorage:', error);
        // Fallback to database order
        if (subgroupOrder.length === 0) {
          setSubgroupOrder(initializeSubgroupOrder(subgroups));
        }
      }
    }
  }, [subgroups, simulationId]);

  // Save subgroupOrder to localStorage whenever it changes
  useEffect(() => {
    if (subgroupOrder.length > 0) {
      try {
        const storageKey = `simulation_${simulationId}_subgroup_order`;
        localStorage.setItem(storageKey, JSON.stringify(subgroupOrder));
      } catch (error) {
        console.error('Error saving subgroup order to localStorage:', error);
      }
    }
  }, [subgroupOrder, simulationId]);

  // Load visibility state from localStorage on mount
  useEffect(() => {
    const savedVisibility = loadVisibilityFromStorage(simulationId);
    setVisibilityState(savedVisibility);
  }, [simulationId]);

  // Save visibility state to localStorage whenever it changes
  useEffect(() => {
    saveVisibilityToStorage(simulationId, visibilityState);
  }, [visibilityState, simulationId]);

  // Helper function to toggle visibility for a subgroup or category
  const handleToggleVisibility = useCallback((itemId: string | number) => {
    setVisibilityState((prev) => toggleVisibility(prev, itemId));
  }, []);

  // Helper function to toggle needs_adjustment for a category
  const handleToggleNeedsAdjustment = useCallback(
    (categoryId: string | number) => {
      setBudgetData((prev) => {
        const categoryKey = String(categoryId);
        const currentData = prev[categoryKey];
        if (!currentData) return prev;

        const currentValue = currentData.needs_adjustment === 'true';
        const newBudgetData = {
          ...prev,
          [categoryKey]: {
            ...currentData,
            needs_adjustment: String(!currentValue),
          },
        };

        // Trigger auto-save after a short delay with the updated data
        setTimeout(async () => {
          try {
            // Prepare budgets array from the updated state
            const budgets = Object.entries(newBudgetData).map(
              ([catId, data]) => {
                let parsedCategoryId: string | number = catId;
                if (/^\d+$/.test(catId)) {
                  parsedCategoryId = parseInt(catId);
                }
                return {
                  category_id: parsedCategoryId,
                  efectivo_amount: parseFloat(data.efectivo_amount) || 0,
                  credito_amount: parseFloat(data.credito_amount) || 0,
                  ahorro_efectivo_amount:
                    parseFloat(data.ahorro_efectivo_amount) || 0,
                  ahorro_credito_amount:
                    parseFloat(data.ahorro_credito_amount) || 0,
                  expected_savings: parseFloat(data.expected_savings) || 0,
                  needs_adjustment: data.needs_adjustment === 'true',
                };
              }
            );

            const response = await fetch(
              `/api/simulations/${simulationId}/budgets`,
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ budgets }),
              }
            );

            if (response.ok) {
              setLastSaved(new Date());
              setHasUnsavedChanges(false);
            }
          } catch (error) {
            console.error('Failed to save needs_adjustment:', error);
          }
        }, 500);

        return newBudgetData;
      });
      setHasUnsavedChanges(true);
    },
    [simulationId]
  );

  // Helper function to toggle subgroup expansion
  const toggleSubgroupExpanded = useCallback((subgroupId: string) => {
    setExpandedSubgroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subgroupId)) {
        newSet.delete(subgroupId);
      } else {
        newSet.add(subgroupId);
      }
      return newSet;
    });
  }, []);

  // Expand all subgroups
  const expandAllSubgroups = useCallback(() => {
    const allSubgroupIds = new Set(subgroups.map((sg) => sg.id));
    setExpandedSubgroups(allSubgroupIds);
  }, [subgroups]);

  // Collapse all subgroups
  const collapseAllSubgroups = useCallback(() => {
    setExpandedSubgroups(new Set());
  }, []);

  // Toggle between expand and collapse all
  const toggleExpandCollapseAll = useCallback(() => {
    const allSubgroupIds = subgroups.map((sg) => sg.id);
    const allExpanded = allSubgroupIds.every((id) => expandedSubgroups.has(id));

    if (allExpanded) {
      collapseAllSubgroups();
    } else {
      expandAllSubgroups();
    }
  }, [subgroups, expandedSubgroups, expandAllSubgroups, collapseAllSubgroups]);

  // Helper function to toggle category selection in creation mode
  const toggleCategorySelection = useCallback((categoryId: string | number) => {
    setSelectedCategoryIds((prev) => {
      const id = String(categoryId);
      if (prev.includes(id)) {
        return prev.filter((cId) => cId !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  // Helper function to reset creation mode
  const resetSubgroupCreationMode = useCallback(() => {
    setIsSubgroupCreationMode(false);
    setSelectedCategoryIds([]);
  }, []);

  // Handler for creating a sub-group
  const handleCreateSubgroup = useCallback(
    async (name: string) => {
      if (selectedCategoryIds.length === 0) {
        throw new Error('Debe seleccionar al menos una categoría');
      }

      setIsCreatingSubgroup(true);
      try {
        const response = await fetch(
          `/api/simulations/${simulationId}/subgroups`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name,
              categoryIds: selectedCategoryIds,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al crear el subgrupo');
        }

        const result = await response.json();

        // Add the new subgroup to the list
        if (result.data) {
          setSubgroups((prev) => [...prev, result.data]);
          // Auto-expand the newly created subgroup
          setExpandedSubgroups((prev) => new Set(prev).add(result.data.id));
        }

        // Reset creation mode
        resetSubgroupCreationMode();

        // Show success toast
        toast({
          title: 'Subgrupo creado',
          description: `El subgrupo "${name}" se ha creado correctamente`,
          variant: 'default',
        });

        // Close the dialog
        setIsSubgroupNameDialogOpen(false);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Error al crear el subgrupo';
        throw new Error(errorMessage);
      } finally {
        setIsCreatingSubgroup(false);
      }
    },
    [simulationId, selectedCategoryIds, resetSubgroupCreationMode, toast]
  );

  // Handler for deleting a sub-group
  const handleDeleteSubgroup = useCallback(
    async (subgroupId: string) => {
      // Confirm deletion
      const subgroup = subgroups.find((sg) => sg.id === subgroupId);
      if (!subgroup) return;

      const confirmDelete = window.confirm(
        `¿Estás seguro de que deseas eliminar el subgrupo "${subgroup.name}"? Esto no eliminará las categorías, solo desagruparlas.`
      );

      if (!confirmDelete) return;

      try {
        const response = await fetch(
          `/api/simulations/${simulationId}/subgroups/${subgroupId}`,
          {
            method: 'DELETE',
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al eliminar el subgrupo');
        }

        // Remove subgroup from list
        setSubgroups((prev) => prev.filter((sg) => sg.id !== subgroupId));

        // Remove from expanded set
        setExpandedSubgroups((prev) => {
          const newSet = new Set(prev);
          newSet.delete(subgroupId);
          return newSet;
        });

        // Show success toast
        toast({
          title: 'Subgrupo eliminado',
          description: `El subgrupo "${subgroup.name}" se ha eliminado correctamente`,
          variant: 'default',
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Error al eliminar el subgrupo';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
    [simulationId, subgroups, toast]
  );

  // Handler for toggling category selection for adding to sub-group
  const toggleCategoryForAddition = useCallback(
    (categoryId: string | number) => {
      setCategoriesToAddToSubgroup((prev) => {
        const id = String(categoryId);
        if (prev.includes(id)) {
          return prev.filter((cId) => String(cId) !== id);
        } else {
          return [...prev, id];
        }
      });
    },
    []
  );

  // Handler for entering add mode for a specific sub-group
  const handleAddToSubgroupClick = useCallback((subgroupId: string) => {
    setAddingToSubgroupId(subgroupId);
    setCategoriesToAddToSubgroup([]);
  }, []);

  // Handler for exiting add mode without saving
  const handleCancelAddToSubgroup = useCallback(() => {
    setAddingToSubgroupId(null);
    setCategoriesToAddToSubgroup([]);
  }, []);

  // Handler for adding selected categories to a sub-group
  const handleDoneAddingToSubgroup = useCallback(
    async (subgroupId: string) => {
      if (categoriesToAddToSubgroup.length === 0) {
        toast({
          title: 'Error',
          description: 'Debes seleccionar al menos una categoría',
          variant: 'destructive',
        });
        return;
      }

      setIsAddingCategoriesLoading(true);
      try {
        // Get current sub-group to merge with new categories
        const currentSubgroup = subgroups.find((sg) => sg.id === subgroupId);
        if (!currentSubgroup) {
          throw new Error('Sub-grupo no encontrado');
        }

        const allCategoryIds = Array.from(
          new Set([
            ...currentSubgroup.categoryIds,
            ...categoriesToAddToSubgroup,
          ])
        );

        const response = await fetch(
          `/api/simulations/${simulationId}/subgroups/${subgroupId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              categoryIds: allCategoryIds,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || 'Error al agregar categorías al sub-grupo'
          );
        }

        const result = await response.json();

        // Update sub-groups in state
        setSubgroups((prev) =>
          prev.map((sg) => (sg.id === subgroupId ? result.data : sg))
        );

        // Reset add mode
        setAddingToSubgroupId(null);
        setCategoriesToAddToSubgroup([]);

        // Show success toast
        toast({
          title: 'Categorías agregadas',
          description: `${categoriesToAddToSubgroup.length} categoría(s) se agregó(aron) al sub-grupo`,
          variant: 'default',
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Error al agregar categorías';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsAddingCategoriesLoading(false);
      }
    },
    [simulationId, subgroups, categoriesToAddToSubgroup, toast]
  );

  // Handler for removing a category from a sub-group
  const handleRemoveCategoryFromSubgroup = useCallback(
    async (categoryId: string | number) => {
      // Find which sub-group this category belongs to
      const subgroupWithCategory = subgroups.find((sg) =>
        sg.categoryIds.some((cid) => String(cid) === String(categoryId))
      );

      if (!subgroupWithCategory) {
        toast({
          title: 'Error',
          description: 'No se encontró el sub-grupo',
          variant: 'destructive',
        });
        return;
      }

      const confirmDelete = window.confirm(
        '¿Deseas eliminar esta categoría del sub-grupo? La categoría seguirá disponible sin agrupar.'
      );

      if (!confirmDelete) return;

      setIsAddingCategoriesLoading(true);
      try {
        // Remove the category from the sub-group
        const updatedCategoryIds = subgroupWithCategory.categoryIds.filter(
          (cid) => String(cid) !== String(categoryId)
        );

        const response = await fetch(
          `/api/simulations/${simulationId}/subgroups/${subgroupWithCategory.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              categoryIds: updatedCategoryIds,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || 'Error al remover categoría del sub-grupo'
          );
        }

        const result = await response.json();

        // Update sub-groups in state
        setSubgroups((prev) =>
          prev.map((sg) =>
            sg.id === subgroupWithCategory.id ? result.data : sg
          )
        );

        toast({
          title: 'Categoría removida',
          description: 'La categoría ha sido removida del sub-grupo',
          variant: 'default',
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Error al remover categoría';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsAddingCategoriesLoading(false);
      }
    },
    [simulationId, subgroups, toast]
  );

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
            ahorro_efectivo_amount:
              parseFloat(data.ahorro_efectivo_amount) || 0,
            ahorro_credito_amount: parseFloat(data.ahorro_credito_amount) || 0,
            expected_savings: parseFloat(data.expected_savings) || 0, // Keep for backward compatibility
            needs_adjustment: data.needs_adjustment === 'true',
          };
        });

        console.log('Saving budgets:', budgets);

        const response = await fetch(
          `/api/simulations/${simulationId}/budgets`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ budgets }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || 'Error al guardar los presupuestos'
          );
        }

        setLastSaved(new Date());
        setHasUnsavedChanges(false);

        if (showToast) {
          toast({
            title: 'Presupuestos guardados',
            description:
              'Los presupuestos de simulación han sido guardados exitosamente',
          });
        }

        if (onSave) {
          onSave();
        }

        return true;
      } catch (error) {
        if (showToast) {
          toast({
            title: 'Error',
            description:
              (error as Error).message || 'Error al guardar los presupuestos',
            variant: 'destructive',
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
  } = require('@/lib/simulation-validation');

  // Validate individual field using comprehensive validation
  const validateField = (
    value: string,
    isTyping: boolean = true
  ): string | undefined => {
    try {
      const validation = validateBudgetAmountInput(value, isTyping);
      return validation.isValid ? undefined : validation.error;
    } catch (error) {
      console.error('Error validating field:', error);
      return undefined;
    }
  };

  // Handle input changes with validation
  const handleInputChange = (
    categoryId: string | number,
    field:
      | 'efectivo_amount'
      | 'credito_amount'
      | 'ahorro_efectivo_amount'
      | 'ahorro_credito_amount'
      | 'expected_savings',
    value: string
  ) => {
    // Ensure categoryId is valid (can be string UUID or number)
    if (!categoryId) {
      console.error('Invalid category ID in handleInputChange:', categoryId);
      return;
    }

    // Convert to string for consistent handling
    const categoryKey = String(categoryId);

    // Sanitize the input value
    const sanitizedValue = value === '' ? '0' : value;

    // Update budget data, ensuring all fields exist
    setBudgetData((prev) => {
      const updatedCategory = {
        efectivo_amount: prev[categoryKey]?.efectivo_amount ?? '0',
        credito_amount: prev[categoryKey]?.credito_amount ?? '0',
        ahorro_efectivo_amount:
          prev[categoryKey]?.ahorro_efectivo_amount ?? '0',
        ahorro_credito_amount: prev[categoryKey]?.ahorro_credito_amount ?? '0',
        expected_savings: prev[categoryKey]?.expected_savings ?? '0',
        needs_adjustment: prev[categoryKey]?.needs_adjustment ?? 'false',
      };
      (updatedCategory as any)[field] = sanitizedValue;
      return {
        ...prev,
        [categoryKey]: updatedCategory,
      } as BudgetFormData;
    });

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);

    // Validate and update errors for the changed field only (with typing flag)
    const error = validateField(sanitizedValue, true);
    const errorFieldName =
      field === 'efectivo_amount'
        ? 'efectivo'
        : field === 'credito_amount'
          ? 'credito'
          : field === 'ahorro_efectivo_amount'
            ? 'ahorro_efectivo'
            : field === 'ahorro_credito_amount'
              ? 'ahorro_credito'
              : 'expected_savings';
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
      field:
        | 'efectivo_amount'
        | 'credito_amount'
        | 'ahorro_efectivo_amount'
        | 'ahorro_credito_amount'
        | 'expected_savings',
      value: string
    ) => {
      // Ensure categoryId is valid
      if (!categoryId) {
        console.error('Invalid category ID in handleInputBlur:', categoryId);
        return;
      }

      // Convert to string for consistent handling
      const categoryKey = String(categoryId);

      // Final validation without typing flag (stricter validation)
      const error = validateField(value, false);
      const errorFieldName =
        field === 'efectivo_amount'
          ? 'efectivo'
          : field === 'credito_amount'
            ? 'credito'
            : field === 'ahorro_efectivo_amount'
              ? 'ahorro_efectivo'
              : field === 'ahorro_credito_amount'
                ? 'ahorro_credito'
                : 'expected_savings';
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
            console.error('Auto-save failed on blur:', saveError);
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
    let totalAhorroEfectivo = 0;
    let totalAhorroCredito = 0;
    let totalGeneral = 0;

    Object.entries(budgetData).forEach(([categoryId, data]) => {
      const efectivo = parseFloat(data.efectivo_amount) || 0;
      const credito = parseFloat(data.credito_amount) || 0;
      const ahorroEfectivo = parseFloat(data.ahorro_efectivo_amount) || 0;
      const ahorroCredito = parseFloat(data.ahorro_credito_amount) || 0;

      totalEfectivo += efectivo;
      totalCredito += credito;
      totalAhorroEfectivo += ahorroEfectivo;
      totalAhorroCredito += ahorroCredito;
      totalGeneral += efectivo + credito - ahorroEfectivo - ahorroCredito;
    });

    const totalNetSpend = totalEfectivo - totalAhorroEfectivo;

    return {
      efectivo: totalEfectivo,
      credito: totalCredito,
      ahorroEfectivo: totalAhorroEfectivo,
      ahorroCredito: totalAhorroCredito,
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
    const ahorroEfectivo = parseFloat(data.ahorro_efectivo_amount) || 0;
    const ahorroCredito = parseFloat(data.ahorro_credito_amount) || 0;
    return efectivo + credito - ahorroEfectivo - ahorroCredito;
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
    // First, apply filters
    let filtered = [...categories].filter((category) => {
      // Filter out excluded categories
      if (excludedCategoryIds.includes(category.id)) {
        return false;
      }

      // Filter out empty categories if hideEmptyCategories is enabled
      if (hideEmptyCategories) {
        const categoryData = budgetData[String(category.id)];
        const efectivo = parseFloat(categoryData?.efectivo_amount || '0') || 0;
        const credito = parseFloat(categoryData?.credito_amount || '0') || 0;
        if (efectivo === 0 && credito === 0) {
          return false;
        }
      }

      return true;
    });

    let sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

    if (sortField === 'tipo_gasto' && tipoGastoSortState !== 0) {
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
    } else if (sortField === 'category_name') {
      sorted.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name);
        return sortDirection === 'asc' ? comparison : -comparison;
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
  }, [
    categories,
    sortField,
    sortDirection,
    tipoGastoSortState,
    categoryOrder,
    hideEmptyCategories,
    excludedCategoryIds,
    budgetData,
  ]);

  // Helper function to find which sub-group a category belongs to
  // Moved before categoryBalances memo to avoid reference error
  const getSubgroupForCategory = (
    subgroupsList: Subgroup[],
    categoryId: string | number
  ): Subgroup | undefined => {
    return subgroupsList.find((sg) =>
      sg.categoryIds.some((cid) => String(cid) === String(categoryId))
    );
  };

  // Calculate balances for each category respecting sub-group order
  const categoryBalances = useMemo(() => {
    const balances = new Map<string, number>();
    let runningBalance = totalIncome;

    // Build the display order including sub-group reordering
    let displayOrder: (string | number)[] = [];

    if (subgroupOrder.length > 0) {
      // Include sub-group order
      const subgroupMap = new Map<string, Subgroup>();
      for (const sg of subgroups) {
        subgroupMap.set(sg.id, sg);
      }

      // Process in sub-group order
      for (const sgId of subgroupOrder) {
        const sg = subgroupMap.get(sgId);
        if (sg) {
          displayOrder.push(...sg.categoryIds);
        }
      }

      // Add uncategorized categories
      const categoriesInSubgroups = new Set<string | number>();
      for (const sg of subgroups) {
        for (const catId of sg.categoryIds) {
          categoriesInSubgroups.add(catId);
        }
      }

      for (const cat of getSortedCategories) {
        if (!categoriesInSubgroups.has(cat.id)) {
          displayOrder.push(cat.id);
        }
      }
    } else {
      // Use default sorted order (no sub-group reordering)
      displayOrder = getSortedCategories.map((c) => c.id);
    }

    // Calculate balances in display order, excluding hidden items
    displayOrder.forEach((categoryId) => {
      const category = getSortedCategories.find((c) => c.id === categoryId);
      if (category) {
        // Check if category is visible (considering parent subgroup visibility)
        const parentSubgroupId = getSubgroupForCategory(
          subgroups,
          category.id
        )?.id;
        const isVisible = isCategoryVisible(
          category.id,
          parentSubgroupId,
          visibilityState
        );

        const categoryData = budgetData[String(category.id)];
        if (categoryData && isVisible) {
          // Calculate net spend: Efectivo - Ahorro Efectivo (only efectivo savings affect balance)
          const efectivoAmount = parseFloat(categoryData.efectivo_amount) || 0;
          const ahorroEfectivo =
            parseFloat(categoryData.ahorro_efectivo_amount) || 0;
          const netSpend = efectivoAmount - ahorroEfectivo;

          // Decrease balance by net spend (actual amount after savings)
          runningBalance -= netSpend;
          balances.set(String(category.id), runningBalance);
        } else {
          balances.set(String(category.id), runningBalance);
        }
      }
    });

    return balances;
  }, [
    budgetData,
    getSortedCategories,
    totalIncome,
    subgroups,
    subgroupOrder,
    visibilityState,
  ]);

  // Calculate balance after each sub-group (for display in subtotal rows)
  const subgroupBalances = useMemo(() => {
    const balances = new Map<string, number>();
    let runningBalance = totalIncome;

    // Build the display order including sub-group reordering
    let displayOrder: (string | number)[] = [];

    if (subgroupOrder.length > 0) {
      // Include sub-group order
      const subgroupMap = new Map<string, Subgroup>();
      for (const sg of subgroups) {
        subgroupMap.set(sg.id, sg);
      }

      // Process in sub-group order
      for (const sgId of subgroupOrder) {
        const sg = subgroupMap.get(sgId);
        if (sg) {
          displayOrder.push(...sg.categoryIds);
        }
      }

      // Add uncategorized categories
      const categoriesInSubgroups = new Set<string | number>();
      for (const sg of subgroups) {
        for (const catId of sg.categoryIds) {
          categoriesInSubgroups.add(catId);
        }
      }

      for (const cat of getSortedCategories) {
        if (!categoriesInSubgroups.has(cat.id)) {
          displayOrder.push(cat.id);
        }
      }
    } else {
      // Use default sorted order (no sub-group reordering)
      displayOrder = getSortedCategories.map((c) => c.id);
    }

    // Calculate balances and track which subgroup each category belongs to
    let currentSubgroupId: string | null = null;
    displayOrder.forEach((categoryId) => {
      // Find which subgroup this category belongs to
      const subgroupForCategory = subgroups.find((sg) =>
        sg.categoryIds.includes(categoryId as string & number)
      );

      if (subgroupForCategory && subgroupForCategory.id !== currentSubgroupId) {
        currentSubgroupId = subgroupForCategory.id;
      }

      const category = getSortedCategories.find((c) => c.id === categoryId);
      if (category) {
        // Check if category is visible (considering parent subgroup visibility)
        const parentSubgroupId = getSubgroupForCategory(
          subgroups,
          category.id
        )?.id;
        const isVisible = isCategoryVisible(
          category.id,
          parentSubgroupId,
          visibilityState
        );

        const categoryData = budgetData[String(category.id)];
        if (categoryData && isVisible) {
          // Calculate net spend: Efectivo - Ahorro Efectivo
          const efectivoAmount = parseFloat(categoryData.efectivo_amount) || 0;
          const ahorroEfectivo =
            parseFloat(categoryData.ahorro_efectivo_amount) || 0;
          const netSpend = efectivoAmount - ahorroEfectivo;

          // Decrease balance by net spend (actual amount after savings)
          runningBalance -= netSpend;

          // After processing a category, store the balance for its subgroup
          if (currentSubgroupId) {
            balances.set(currentSubgroupId, runningBalance);
          }
        }
      }
    });

    return balances;
  }, [
    budgetData,
    getSortedCategories,
    totalIncome,
    subgroups,
    subgroupOrder,
    visibilityState,
  ]);

  // Helper function to get uncategorized categories (not in any sub-group)
  const getUncategorizedCategories = useCallback((): Category[] => {
    const categorizedCategoryIds = new Set<string | number>();
    subgroups.forEach((sg) => {
      sg.categoryIds.forEach((cid) => {
        categorizedCategoryIds.add(cid);
      });
    });
    return getSortedCategories.filter((c) => !categorizedCategoryIds.has(c.id));
  }, [subgroups, getSortedCategories]);

  // Get balance color based on value
  const getBalanceColor = (balance: number): string => {
    if (balance < 0) return 'text-red-600';
    if (balance < totalIncome * 0.1) return 'text-orange-600'; // Warning if less than 10% remaining
    return 'text-green-600';
  };

  // Get comprehensive validation feedback
  const validationFeedback = useMemo(() => {
    const formValidation = validateBudgetFormData(budgetData);
    if (formValidation.isValid) return null;

    const errorMessages: string[] = [];
    Object.entries(formValidation.errors).forEach(
      ([categoryId, categoryErrors]: [string, any]) => {
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
        title: 'Error de validación',
        description: 'Corrige los errores antes de guardar',
        variant: 'destructive',
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
        title: 'Exportación exitosa',
        description: 'El archivo Excel se ha descargado correctamente',
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Error al exportar',
        description:
          (error as Error).message || 'No se pudo generar el archivo Excel',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle sort column click
  const handleSortClick = (field: 'tipo_gasto' | 'category_name') => {
    if (field === 'tipo_gasto') {
      // Custom 3-cycle behavior for tipo_gasto: 0 → 1 → 2 → 0
      if (sortField === 'tipo_gasto') {
        // Already sorting by tipo_gasto, cycle to next state
        if (tipoGastoSortState === 0) {
          setTipoGastoSortState(1);
          setSortField('tipo_gasto');
        } else if (tipoGastoSortState === 1) {
          setTipoGastoSortState(2);
          setSortField('tipo_gasto');
        } else {
          // State 2 → reset to state 0
          setTipoGastoSortState(0);
          setSortField(null);
        }
      } else {
        // Start sorting by tipo_gasto with state 1
        setSortField('tipo_gasto');
        setTipoGastoSortState(1);
      }
    } else if (field === 'category_name') {
      // Standard toggle behavior for category_name
      if (sortField === field) {
        // If clicking the same field, toggle direction
        if (sortDirection === 'asc') {
          setSortDirection('desc');
        } else {
          // If descending, clear the sort
          setSortField(null);
          setSortDirection('asc');
        }
      } else {
        // If clicking a different field, set it as sort field with ascending direction
        setSortField(field);
        setSortDirection('asc');
      }
    }
  };

  // Filter handlers
  const toggleCategoryExclusion = (categoryId: string | number) => {
    setExcludedCategoryIds((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const clearAllExclusions = () => {
    setExcludedCategoryIds([]);
  };

  const getExclusionFilterButtonText = () => {
    if (excludedCategoryIds.length === 0) {
      return 'Excluir categorías';
    } else if (excludedCategoryIds.length === 1) {
      const excluded = categories.find((c) => c.id === excludedCategoryIds[0]);
      return `Excluida: ${excluded?.name || 'Categoría'}`;
    } else {
      return `${excludedCategoryIds.length} excluidas`;
    }
  };

  // Get sorted categories for the exclusion filter dropdown
  const sortedCategoriesForFilter = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  // Calculate if all subgroups are expanded
  const allSubgroupsExpanded = useMemo(() => {
    if (subgroups.length === 0) return false;
    return subgroups.every((sg) => expandedSubgroups.has(sg.id));
  }, [subgroups, expandedSubgroups]);

  // Drag & Drop Event Handlers
  const handleDragStart = useCallback(
    (
      e: React.DragEvent,
      categoryId: string | number,
      tipoGasto?: TipoGasto
    ) => {
      setDraggedCategoryId(categoryId);
      setDraggedTipoGasto(tipoGasto);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', '');
    },
    []
  );

  const handleDragOver = useCallback(
    (
      e: React.DragEvent,
      targetCategoryId: string | number,
      targetTipoGasto?: TipoGasto
    ) => {
      e.preventDefault();

      // Check if drop target is in the same tipo_gasto group as dragged item
      const isValidTarget = draggedTipoGasto === targetTipoGasto;
      setIsValidDropTarget(isValidTarget);

      if (isValidTarget) {
        e.dataTransfer.dropEffect = 'move';
      } else {
        e.dataTransfer.dropEffect = 'none';
      }
    },
    [draggedTipoGasto]
  );

  const handleDrop = useCallback(
    (
      e: React.DragEvent,
      targetCategoryId: string | number,
      targetTipoGasto?: TipoGasto
    ) => {
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

  // Helper function to check if subgroup dragging is allowed
  const isSubgroupDraggingDisabled = useCallback(
    (subgroupId: string): boolean => {
      // Disable dragging if:
      // 1. In add mode for any subgroup
      // 2. Currently saving or loading
      // 3. Sub-group is being deleted
      // 4. Sub-group doesn't exist
      return (
        !!addingToSubgroupId ||
        isSaving ||
        isAutoSaving ||
        isSavingOnBlur ||
        !subgroups.some((sg) => sg.id === subgroupId)
      );
    },
    [addingToSubgroupId, isSaving, isAutoSaving, isSavingOnBlur, subgroups]
  );

  // Sub-group Drag & Drop Event Handlers
  const handleSubgroupDragStart = useCallback(
    (e: React.DragEvent, subgroupId: string) => {
      // Prevent drag if disabled
      if (isSubgroupDraggingDisabled(subgroupId)) {
        e.preventDefault();
        return;
      }

      setSubgroupDragState({
        draggedItemId: subgroupId,
        draggedItemType: 'subgroup',
        dropZoneIndex: null,
      });
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', '');
    },
    [isSubgroupDraggingDisabled]
  );

  const handleSubgroupDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      // Allow drop on any valid target
      if (subgroupDragState.draggedItemType === 'subgroup') {
        e.dataTransfer.dropEffect = 'move';
      } else {
        e.dataTransfer.dropEffect = 'none';
      }
    },
    [subgroupDragState.draggedItemType]
  );

  const handleSubgroupDrop = useCallback(
    (
      e: React.DragEvent,
      targetSubgroupId: string | null,
      position: 'before' | 'after'
    ) => {
      e.preventDefault();

      if (
        !subgroupDragState.draggedItemId ||
        subgroupDragState.draggedItemType !== 'subgroup'
      ) {
        return;
      }

      const draggedId = subgroupDragState.draggedItemId;
      const currentOrder =
        subgroupOrder.length > 0 ? subgroupOrder : subgroups.map((s) => s.id);
      const newOrder = [...currentOrder];

      // Find indices
      const draggedIndex = newOrder.indexOf(draggedId);
      if (draggedIndex === -1) return;

      // Remove dragged item
      const [draggedItem] = newOrder.splice(draggedIndex, 1);

      // Find target index based on position
      let targetIndex = newOrder.length;
      if (targetSubgroupId) {
        targetIndex = newOrder.indexOf(targetSubgroupId);
        if (targetIndex === -1) {
          newOrder.push(draggedItem);
        } else {
          if (position === 'after') {
            targetIndex += 1;
          }
          newOrder.splice(targetIndex, 0, draggedItem);
        }
      } else {
        // Drop at end
        newOrder.push(draggedItem);
      }

      setSubgroupOrder(newOrder);
      setSubgroupDragState({
        draggedItemId: null,
        draggedItemType: null,
        dropZoneIndex: null,
      });
    },
    [subgroupDragState, subgroupOrder, subgroups]
  );

  const handleSubgroupDragEnd = useCallback(() => {
    setSubgroupDragState({
      draggedItemId: null,
      draggedItemType: null,
      dropZoneIndex: null,
    });
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
        <div className="flex items-start justify-between">
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

        {/* Template Selection and Management */}
        <div className="flex items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
            <TemplateSelector
              simulationId={simulationId}
              currentTemplateId={currentTemplateId}
              currentTemplateName={currentTemplateName}
              onTemplateApplied={() => {
                // Reload subgroups after template application
                window.location.reload();
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTemplateManagerOpen(true)}
            >
              Manage Templates
            </Button>
          </div>
          <SaveAsTemplateDialog
            simulationId={simulationId}
            subgroupCount={subgroups.length}
            categoryCount={subgroups.reduce(
              (sum, sg) => sum + (sg.categoryIds?.length || 0),
              0
            )}
            onTemplateSaved={() => {
              toast({
                title: 'Success',
                description:
                  'Template saved successfully. You can now apply it to other simulations.',
              });
            }}
          />
        </div>

        {/* Template Manager Dialog */}
        <TemplateManager
          isOpen={isTemplateManagerOpen}
          onClose={() => setIsTemplateManagerOpen(false)}
        />

        {/* Validation Feedback */}
        {validationFeedback && validationFeedback.totalErrors > 0 && (
          <DataConsistencyAlert
            issues={validationFeedback.messages}
            severity="error"
            onResolve={() => {
              toast({
                title: 'Corrija los errores',
                description:
                  'Revise los campos marcados en rojo y corrija los valores',
                variant: 'destructive',
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
                Ahorro Efectivo
              </CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(totals.ahorroEfectivo)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Gasto neto efectivo:{' '}
                {formatCurrency(totals.efectivo - totals.ahorroEfectivo)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ahorro Crédito
              </CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(totals.ahorroCredito)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Gasto neto crédito:{' '}
                {formatCurrency(totals.credito - totals.ahorroCredito)}
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
              <p className="mt-1 text-xs text-muted-foreground">
                {
                  Object.keys(budgetData).filter(
                    (categoryId) => getCategoryTotal(categoryId) > 0
                  ).length
                }{' '}
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
            {/* Filter Controls */}
            <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center">
                {/* Hide Empty Categories Toggle */}
                <div className="flex items-center space-x-2 rounded-lg border bg-muted/30 px-3 py-2">
                  <Checkbox
                    id="hide-empty-categories"
                    checked={hideEmptyCategories}
                    onCheckedChange={(checked) =>
                      setHideEmptyCategories(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="hide-empty-categories"
                    className="cursor-pointer text-sm font-medium"
                  >
                    Ocultar sin presupuesto
                  </Label>
                </div>

                {/* Expand/Collapse All Subgroups Button */}
                {subgroups.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleExpandCollapseAll}
                    className="gap-2"
                    title={
                      allSubgroupsExpanded ? 'Colapsar Todos' : 'Expandir Todos'
                    }
                  >
                    {allSubgroupsExpanded ? (
                      <ChevronsUp className="h-4 w-4" />
                    ) : (
                      <ChevronsDown className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                      {allSubgroupsExpanded
                        ? 'Colapsar Todos'
                        : 'Expandir Todos'}
                    </span>
                  </Button>
                )}

                {/* Category Exclusion Filter Dropdown */}
                <Popover
                  open={filterDropdownOpen}
                  onOpenChange={setFilterDropdownOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant={
                        excludedCategoryIds.length > 0 ? 'default' : 'outline'
                      }
                      size="sm"
                      className={`gap-2 ${
                        excludedCategoryIds.length > 0
                          ? 'bg-orange-500 hover:bg-orange-600'
                          : ''
                      }`}
                    >
                      <Filter className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {getExclusionFilterButtonText()}
                      </span>
                      <span className="sm:hidden">
                        {excludedCategoryIds.length > 0
                          ? `${excludedCategoryIds.length} excluidas`
                          : 'Filtros'}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">
                          Excluir Categorías
                        </h4>
                        {excludedCategoryIds.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllExclusions}
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                          >
                            Limpiar
                          </Button>
                        )}
                      </div>

                      {/* Scrollable list of categories */}
                      <div className="max-h-[300px] space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                        {sortedCategoriesForFilter.length === 0 ? (
                          <p className="py-2 text-center text-xs text-muted-foreground">
                            No hay categorías disponibles
                          </p>
                        ) : (
                          sortedCategoriesForFilter.map((category) => (
                            <div
                              key={category.id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`exclude-${category.id}`}
                                checked={excludedCategoryIds.includes(
                                  category.id
                                )}
                                onCheckedChange={() =>
                                  toggleCategoryExclusion(category.id)
                                }
                              />
                              <Label
                                htmlFor={`exclude-${category.id}`}
                                className="flex-1 cursor-pointer text-sm"
                              >
                                {category.name}
                              </Label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filter status info */}
              {(hideEmptyCategories || excludedCategoryIds.length > 0) && (
                <div className="text-xs text-muted-foreground">
                  {getSortedCategories.length} de {categories.length} categorías
                  visibles
                </div>
              )}
            </div>

            {/* Sub-group creation controls */}
            <div className="mb-6 flex items-center gap-3">
              {isSubgroupCreationMode ? (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setIsSubgroupNameDialogOpen(true);
                    }}
                    disabled={
                      selectedCategoryIds.length === 0 || isCreatingSubgroup
                    }
                    className="gap-2"
                  >
                    {isCreatingSubgroup ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        Finalizar Crear Subgrupo
                        <span className="ml-2 rounded bg-red-900 px-2 py-1 text-xs">
                          {selectedCategoryIds.length} seleccionadas
                        </span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      resetSubgroupCreationMode();
                    }}
                    disabled={isCreatingSubgroup}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsSubgroupCreationMode(true);
                  }}
                  className="gap-2"
                >
                  Crear Subgrupo
                </Button>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 pl-2"></TableHead>
                  <TableHead className="w-1/5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSortClick('category_name')}
                    >
                      Categoría
                      {sortField === 'category_name' && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="w-24 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSortClick('tipo_gasto')}
                      title={
                        tipoGastoSortState === 0
                          ? 'Click para ordenar: Fijo → Semi-Fijo → Variable → Eventual'
                          : tipoGastoSortState === 1
                            ? 'Click para ordenar: Variable → Semi-Fijo → Fijo → Eventual'
                            : 'Click para resetear orden'
                      }
                    >
                      Tipo Gasto
                      {sortField === 'tipo_gasto' && (
                        <>
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                          <span className="ml-1 text-xs text-muted-foreground">
                            {tipoGastoSortState}
                          </span>
                        </>
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[140px] text-right">
                    Efectivo
                  </TableHead>
                  <TableHead className="min-w-[140px] text-right">
                    Crédito
                  </TableHead>
                  <TableHead className="min-w-[160px] text-right">
                    Ahorro Efectivo
                  </TableHead>
                  <TableHead className="min-w-[160px] text-right">
                    Ahorro Crédito
                  </TableHead>
                  <TableHead className="min-w-[140px] text-right">
                    Total
                  </TableHead>
                  <TableHead className="min-w-[140px] text-right">
                    Balance
                  </TableHead>
                  <TableHead className="w-[32px]"></TableHead>
                  <TableHead className="w-[32px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  // Organize table rows with subgroups and custom ordering
                  let tableRows = organizeTableRowsWithSubgroups(
                    subgroups,
                    getSortedCategories,
                    excludedCategoryIds
                  );

                  // Apply custom subgroup ordering if available
                  if (subgroupOrder.length > 0) {
                    tableRows = reorganizeTableRowsWithSubgroupOrder(
                      subgroups,
                      subgroupOrder,
                      getSortedCategories,
                      expandedSubgroups,
                      excludedCategoryIds
                    );
                  }

                  if (tableRows.length === 0) {
                    return (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="py-4 text-center text-muted-foreground"
                        >
                          No hay categorías disponibles
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return tableRows.map((row, index) => {
                    // Check if row should be visible (for expand/collapse)
                    if (!shouldShowRow(row, tableRows, expandedSubgroups)) {
                      return null;
                    }

                    // Render subgroup header
                    if (row.type === 'subgroup_header') {
                      const subgroup = subgroups.find(
                        (sg) => sg.id === row.subgroupId
                      );
                      if (!subgroup) return null;

                      const subtotals = calculateSubgroupSubtotals(
                        subgroup,
                        budgetData,
                        visibilityState
                      );

                      const uncategorizedCount =
                        getUncategorizedCategories().length;
                      const isDraggingThisSubgroup =
                        subgroupDragState.draggedItemId === row.subgroupId;
                      const isDragOverThisSubgroup = !!(
                        subgroupDragState.draggedItemId &&
                        subgroupDragState.draggedItemId !== row.subgroupId
                      );

                      return (
                        <SubgroupHeaderRow
                          key={`header-${row.subgroupId}`}
                          subgroupId={row.subgroupId!}
                          subgroupName={row.subgroupName!}
                          isExpanded={expandedSubgroups.has(row.subgroupId!)}
                          onToggleExpand={toggleSubgroupExpanded}
                          onDelete={handleDeleteSubgroup}
                          subtotals={subtotals}
                          categoryCount={
                            typeof row.categoryCount === 'number'
                              ? row.categoryCount
                              : 0
                          }
                          totalIncome={totalIncome}
                          isInAddMode={addingToSubgroupId === row.subgroupId}
                          onAddCategories={handleAddToSubgroupClick}
                          onDoneAddingCategories={handleDoneAddingToSubgroup}
                          onCancelAddingCategories={handleCancelAddToSubgroup}
                          canAddCategories={uncategorizedCount > 0}
                          isDragging={isDraggingThisSubgroup}
                          isDragOver={isDragOverThisSubgroup}
                          onDragStart={(e) =>
                            handleSubgroupDragStart(e, row.subgroupId!)
                          }
                          onDragOver={handleSubgroupDragOver}
                          onDragLeave={() => {
                            // Clear drag over state when leaving
                            setSubgroupDragState((prev) => ({
                              ...prev,
                              dropZoneIndex: null,
                            }));
                          }}
                          onDrop={(e, position) =>
                            handleSubgroupDrop(
                              e,
                              row.subgroupId || null,
                              position
                            )
                          }
                          onDragEnd={handleSubgroupDragEnd}
                          isVisible={isSubgroupVisible(
                            row.subgroupId!,
                            visibilityState
                          )}
                          onToggleVisibility={handleToggleVisibility}
                        />
                      );
                    }

                    // Render subgroup subtotal
                    if (row.type === 'subgroup_subtotal') {
                      const subgroup = subgroups.find(
                        (sg) => sg.id === row.subgroupId
                      );
                      if (!subgroup) return null;

                      const subtotals = calculateSubgroupSubtotals(
                        subgroup,
                        budgetData,
                        visibilityState
                      );

                      const subgroupBalance =
                        subgroupBalances.get(row.subgroupId!) ?? 0;

                      return (
                        <SubgroupSubtotalRow
                          key={`subtotal-${row.subgroupId}`}
                          subgroupId={row.subgroupId!}
                          subtotals={subtotals}
                          subgroupBalance={subgroupBalance}
                          isSubgroupVisible={isSubgroupVisible(
                            row.subgroupId!,
                            visibilityState
                          )}
                        />
                      );
                    }

                    // Render category row
                    if (row.type === 'category') {
                      const category = getSortedCategories.find(
                        (c) => String(c.id) === String(row.categoryId)
                      );
                      if (!category) return null;

                      const categoryData = budgetData[String(category.id)];
                      const categoryErrors = errors[String(category.id)];
                      const categoryTotal = getCategoryTotal(category.id);

                      const isBeingAddedToSubgroup =
                        categoriesToAddToSubgroup.includes(String(category.id));

                      const isCategoryHidden = !isCategoryVisible(
                        category.id,
                        getSubgroupForCategory(subgroups, category.id)?.id,
                        visibilityState
                      );

                      return (
                        <TableRow
                          key={`category-${category.id}`}
                          draggable
                          onDragStart={(e) =>
                            handleDragStart(e, category.id, category.tipo_gasto)
                          }
                          onDragOver={(e) =>
                            handleDragOver(e, category.id, category.tipo_gasto)
                          }
                          onDrop={(e) =>
                            handleDrop(e, category.id, category.tipo_gasto)
                          }
                          onDragEnd={handleDragEnd}
                          className={`group cursor-move ${
                            draggedCategoryId === category.id
                              ? 'bg-accent opacity-50'
                              : ''
                          } ${
                            draggedCategoryId &&
                            draggedTipoGasto === category.tipo_gasto &&
                            draggedCategoryId !== category.id
                              ? isValidDropTarget
                                ? 'bg-blue-50 dark:bg-blue-950'
                                : ''
                              : ''
                          } ${
                            isBeingAddedToSubgroup
                              ? 'bg-blue-50 dark:bg-blue-950'
                              : ''
                          } ${
                            isCategoryHidden ? 'line-through opacity-60' : ''
                          } ${
                            categoryData?.needs_adjustment === 'true'
                              ? 'bg-yellow-700/40 dark:bg-yellow-800/40'
                              : ''
                          }`}
                        >
                          <TableCell className="w-8 pl-2 font-medium">
                            {isSubgroupCreationMode ? (
                              <Checkbox
                                checked={selectedCategoryIds.includes(
                                  category.id
                                )}
                                onCheckedChange={() =>
                                  toggleCategorySelection(category.id)
                                }
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Select ${category.name} for subgroup`}
                              />
                            ) : addingToSubgroupId &&
                              getUncategorizedCategories().some(
                                (c) => String(c.id) === String(category.id)
                              ) ? (
                              // Show checkbox for uncategorized categories when in add mode
                              <Checkbox
                                checked={categoriesToAddToSubgroup.includes(
                                  String(category.id)
                                )}
                                onCheckedChange={() =>
                                  toggleCategoryForAddition(category.id)
                                }
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Select ${category.name} to add to sub-group`}
                              />
                            ) : getSubgroupForCategory(
                                subgroups,
                                category.id
                              ) ? (
                              // Show delete button for categorized items
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveCategoryFromSubgroup(category.id);
                                }}
                                disabled={isAddingCategoriesLoading}
                                aria-label={`Remove ${category.name} from sub-group`}
                                title="Remove from sub-group"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            ) : (
                              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {category.name}
                          </TableCell>
                          <TableCell>
                            {category.tipo_gasto ? (
                              <TipoGastoBadge tipoGasto={category.tipo_gasto} />
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="min-w-[140px] text-right">
                            <div className="space-y-1">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={categoryData?.efectivo_amount || '0'}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (category.id) {
                                    handleInputChange(
                                      category.id,
                                      'efectivo_amount',
                                      value
                                    );
                                  }
                                }}
                                onBlur={(e) => {
                                  const value = e.target.value;
                                  if (category.id) {
                                    handleInputBlur(
                                      category.id,
                                      'efectivo_amount',
                                      value
                                    );
                                  }
                                }}
                                className={`w-full text-right ${
                                  categoryErrors?.efectivo
                                    ? 'border-destructive'
                                    : ''
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
                          <TableCell className="min-w-[140px] text-right">
                            <div className="space-y-1">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={categoryData?.credito_amount || '0'}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (category.id) {
                                    handleInputChange(
                                      category.id,
                                      'credito_amount',
                                      value
                                    );
                                  }
                                }}
                                onBlur={(e) => {
                                  const value = e.target.value;
                                  if (category.id) {
                                    handleInputBlur(
                                      category.id,
                                      'credito_amount',
                                      value
                                    );
                                  }
                                }}
                                className={`w-full text-right ${
                                  categoryErrors?.credito
                                    ? 'border-destructive'
                                    : ''
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
                          <TableCell className="min-w-[160px] text-right">
                            <div className="space-y-1">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                max={parseFloat(
                                  categoryData?.efectivo_amount || '0'
                                )}
                                value={
                                  categoryData?.ahorro_efectivo_amount || '0'
                                }
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (category.id) {
                                    handleInputChange(
                                      category.id,
                                      'ahorro_efectivo_amount',
                                      value
                                    );
                                  }
                                }}
                                onBlur={(e) => {
                                  const value = e.target.value;
                                  if (category.id) {
                                    handleInputBlur(
                                      category.id,
                                      'ahorro_efectivo_amount',
                                      value
                                    );
                                  }
                                }}
                                className={`w-full text-right ${
                                  categoryErrors?.ahorro_efectivo
                                    ? 'border-destructive'
                                    : parseFloat(
                                          categoryData?.ahorro_efectivo_amount ||
                                            '0'
                                        ) > 0
                                      ? 'font-semibold text-purple-600'
                                      : ''
                                }`}
                                placeholder="0.00"
                              />
                              {categoryErrors?.ahorro_efectivo && (
                                <p className="text-xs text-destructive">
                                  {categoryErrors.ahorro_efectivo}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[160px] text-right">
                            <div className="space-y-1">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                max={parseFloat(
                                  categoryData?.credito_amount || '0'
                                )}
                                value={
                                  categoryData?.ahorro_credito_amount || '0'
                                }
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (category.id) {
                                    handleInputChange(
                                      category.id,
                                      'ahorro_credito_amount',
                                      value
                                    );
                                  }
                                }}
                                onBlur={(e) => {
                                  const value = e.target.value;
                                  if (category.id) {
                                    handleInputBlur(
                                      category.id,
                                      'ahorro_credito_amount',
                                      value
                                    );
                                  }
                                }}
                                className={`w-full text-right ${
                                  categoryErrors?.ahorro_credito
                                    ? 'border-destructive'
                                    : parseFloat(
                                          categoryData?.ahorro_credito_amount ||
                                            '0'
                                        ) > 0
                                      ? 'font-semibold text-purple-600'
                                      : ''
                                }`}
                                placeholder="0.00"
                              />
                              {categoryErrors?.ahorro_credito && (
                                <p className="text-xs text-destructive">
                                  {categoryErrors.ahorro_credito}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[140px] text-right font-medium">
                            <span
                              className={
                                categoryTotal > 0
                                  ? 'text-primary'
                                  : 'text-muted-foreground'
                              }
                            >
                              {formatCurrency(categoryTotal)}
                            </span>
                          </TableCell>
                          <TableCell className="min-w-[140px] text-right font-bold">
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
                          <TableCell className="w-[32px] px-0">
                            <div className="flex items-center justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 opacity-0 transition-opacity hover:bg-purple-100 hover:text-purple-600 group-hover:opacity-100 dark:hover:bg-purple-900/20 dark:hover:text-purple-400"
                                onClick={() =>
                                  handleToggleVisibility(category.id)
                                }
                                disabled={isSaving || isAutoSaving}
                                aria-label={
                                  isCategoryHidden
                                    ? `Show ${category.name}`
                                    : `Hide ${category.name}`
                                }
                                title={
                                  isCategoryHidden
                                    ? 'Show category'
                                    : 'Hide category'
                                }
                              >
                                {isCategoryHidden ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="w-[32px] px-0">
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={
                                  categoryData?.needs_adjustment === 'true'
                                }
                                onCheckedChange={() =>
                                  handleToggleNeedsAdjustment(category.id)
                                }
                                disabled={isSaving || isAutoSaving}
                                className={`${
                                  categoryData?.needs_adjustment === 'true'
                                    ? 'opacity-100'
                                    : 'opacity-0 group-hover:opacity-100'
                                } h-4 w-4 transition-opacity`}
                                aria-label={`Mark ${category.name} as needing adjustment`}
                                title="Mark as needing adjustment"
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return null;
                  });
                })()}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Sub-group Name Dialog */}
        <SubgroupNameDialog
          isOpen={isSubgroupNameDialogOpen}
          isLoading={isCreatingSubgroup}
          onClose={() => setIsSubgroupNameDialogOpen(false)}
          onConfirm={handleCreateSubgroup}
          existingNames={subgroups.map((sg) => sg.name)}
        />

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
        <div className="text-center text-xs text-muted-foreground">
          Los cambios se guardan automáticamente al terminar de editar cada
          campo
        </div>
      </div>
    </SimulationErrorWrapper>
  );
}
