"use client";

import { useState, useMemo } from "react";
import { PlusCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useBudget } from "@/context/budget-context";
import { FundFilter } from "@/components/fund-filter";
import { MultiFundSelector } from "@/components/multi-fund-selector";
import {
  CategoryFundErrorDialog,
  useCategoryFundErrorDialog,
} from "@/components/category-fund-error-dialog";
import {
  CategoryFundLoadingButton,
  useCategoryFundLoadingState,
} from "@/components/category-fund-loading-states";
import { FundCategoryRelationshipIndicator } from "@/components/fund-category-relationship-indicator";
import {
  CategoryFundInfoPanel,
  CategoryFundInfoCompact,
} from "@/components/category-fund-info-panel";
import { Fund, Category } from "@/types/funds";
import { RecurringDateInput } from "@/components/recurring-date-input";

export function CategoriesView() {
  const { categories, addCategory, updateCategory, deleteCategory, funds } =
    useBudget();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryFunds, setNewCategoryFunds] = useState<Fund[]>([]);
  const [newCategoryRecurringDate, setNewCategoryRecurringDate] = useState<number | null>(null);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editCategoryFunds, setEditCategoryFunds] = useState<Fund[]>([]);
  const [editCategoryRecurringDate, setEditCategoryRecurringDate] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteValidation, setDeleteValidation] = useState<{
    hasExpenses: boolean;
    expenseCount: number;
    affectedFunds: string[];
  } | null>(null);
  const [fundFilter, setFundFilter] = useState<Fund | null>(null);

  // Enhanced error handling and loading states
  const { dialogState, showError, hideError } = useCategoryFundErrorDialog();
  const loadingState = useCategoryFundLoadingState();

  // Filter categories based on selected fund
  const filteredCategories = useMemo(() => {
    if (!categories) {
      return [];
    }
    if (!fundFilter) {
      return categories;
    }
    return categories.filter((category) => {
      // Check both old fund_id and new associated_funds
      if (category.fund_id === fundFilter.id) {
        return true;
      }
      if (category.associated_funds) {
        return category.associated_funds.some(
          (fund) => fund.id === fundFilter.id
        );
      }
      return false;
    });
  }, [categories, fundFilter]);

  // Helper function to get category funds for API calls
  const getCategoryFunds = async (categoryId: string): Promise<Fund[]> => {
    try {
      const response = await fetch(`/api/categories/${categoryId}/funds`);
      if (!response.ok) {
        throw new Error("Failed to fetch category funds");
      }
      const data = await response.json();
      return data.funds || [];
    } catch (error) {
      console.error("Error fetching category funds:", error);
      return [];
    }
  };

  // Helper function to update category funds with enhanced error handling
  const updateCategoryFunds = async (
    categoryId: string,
    fundIds: string[],
    forceUpdate: boolean = false
  ): Promise<void> => {
    try {
      const url = forceUpdate
        ? `/api/categories/${categoryId}/funds?force=true`
        : `/api/categories/${categoryId}/funds`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fund_ids: fundIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle validation conflicts (409 status)
        if (response.status === 409) {
          // Show error dialog and wait for user confirmation
          await showError(
            errorData,
            "Confirmar actualización de fondos",
            async () => {
              await updateCategoryFunds(categoryId, fundIds, true);
            }
          );
          return;
        }

        throw new Error(errorData.error || "Failed to update category funds");
      }
    } catch (error) {
      console.error("Error updating category funds:", error);
      throw error;
    }
  };

  // Helper function to validate category deletion
  const validateCategoryDeletion = async (categoryId: string) => {
    try {
      // Check if category has expenses
      const expensesResponse = await fetch(
        `/api/expenses?category_id=${categoryId}`
      );
      if (expensesResponse.ok) {
        const expenses = await expensesResponse.json();
        const expenseCount = expenses.length;

        if (expenseCount > 0) {
          // Get affected funds
          const categoryFunds = await getCategoryFunds(categoryId);
          const affectedFunds = categoryFunds.map((fund) => fund.name);

          return {
            hasExpenses: true,
            expenseCount,
            affectedFunds,
          };
        }
      }

      return {
        hasExpenses: false,
        expenseCount: 0,
        affectedFunds: [],
      };
    } catch (error) {
      console.error("Error validating category deletion:", error);
      return {
        hasExpenses: false,
        expenseCount: 0,
        affectedFunds: [],
      };
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la categoría no puede estar vacío",
        variant: "destructive",
      });
      return;
    }

    loadingState.setLoading("addCategory", true, "Agregando categoría...");

    try {
      // Create category with fund_ids array if funds are selected
      const fundIds = newCategoryFunds.map((fund) => fund.id);

      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCategoryName,
          fund_ids: fundIds.length > 0 ? fundIds : undefined,
          recurring_date: newCategoryRecurringDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Show enhanced error dialog for validation errors
        if (response.status === 400 || response.status === 409) {
          showError(errorData, "Error al agregar categoría");
          return;
        }

        throw new Error(errorData.error || "Failed to add category");
      }

      // Refresh categories to get updated data
      window.location.reload(); // Simple refresh for now

      setNewCategoryName("");
      setNewCategoryFunds([]);
      setNewCategoryRecurringDate(null);
      setIsAddOpen(false);

      const fundNames = newCategoryFunds.map((f) => f.name).join(", ");
      toast({
        title: "Categoría agregada",
        description: `La categoría ha sido agregada exitosamente${
          fundNames ? ` con fondos: ${fundNames}` : ""
        }`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          (error as Error).message || "No se pudo agregar la categoría",
        variant: "destructive",
      });
    } finally {
      loadingState.setLoading("addCategory", false);
    }
  };

  const handleEditCategory = async () => {
    if (!editCategory || !editCategory.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la categoría no puede estar vacío",
        variant: "destructive",
      });
      return;
    }

    loadingState.setLoading("editCategory", true, "Actualizando categoría...");

    try {
      // Update category name using existing method
      await updateCategory(editCategory.id, editCategory.name, editCategoryRecurringDate);

      // Update fund relationships separately with enhanced error handling
      const fundIds = editCategoryFunds.map((fund) => fund.id);
      await updateCategoryFunds(editCategory.id, fundIds);

      // Refresh categories to get updated data
      window.location.reload(); // Simple refresh for now

      setEditCategory(null);
      setEditCategoryFunds([]);
      setEditCategoryRecurringDate(null);
      setIsEditOpen(false);

      toast({
        title: "Categoría actualizada",
        description: "La categoría ha sido actualizada exitosamente",
      });
    } catch (error) {
      // Only show error toast for actual errors, not for user cancellations
      const errorMessage = (error as Error).message;
      if (errorMessage !== "User cancelled operation") {
        toast({
          title: "Error",
          description: errorMessage || "No se pudo actualizar la categoría",
          variant: "destructive",
        });
      }
    } finally {
      loadingState.setLoading("editCategory", false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteId) return;

    try {
      // Validate deletion first
      const validation = await validateCategoryDeletion(deleteId);
      setDeleteValidation(validation);

      if (validation.hasExpenses) {
        // Show confirmation dialog for categories with expenses
        setIsDeleteOpen(false);
        setIsDeleteConfirmOpen(true);
        return;
      }

      // Proceed with deletion if no expenses
      await deleteCategory(deleteId);
      setDeleteId(null);
      setIsDeleteOpen(false);
      toast({
        title: "Categoría eliminada",
        description: "La categoría ha sido eliminada exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          (error as Error).message || "No se pudo eliminar la categoría",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteCategory(deleteId);
      setDeleteId(null);
      setIsDeleteConfirmOpen(false);
      setDeleteValidation(null);
      toast({
        title: "Categoría eliminada",
        description: "La categoría y sus gastos asociados han sido eliminados",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          (error as Error).message || "No se pudo eliminar la categoría",
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (category: Category) => {
    setEditCategory(category);
    // Set associated funds or fallback to single fund
    if (category.associated_funds && category.associated_funds.length > 0) {
      setEditCategoryFunds(category.associated_funds);
    } else if (category.fund_id && funds) {
      const categoryFund = funds.find((f) => f.id === category.fund_id);
      setEditCategoryFunds(categoryFund ? [categoryFund] : []);
    } else {
      setEditCategoryFunds([]);
    }
    // Set recurring date
    setEditCategoryRecurringDate(category.recurring_date || null);
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="fund-filter">Filtrar por fondo:</Label>
            <FundFilter
              selectedFund={fundFilter}
              onFundChange={setFundFilter}
              placeholder="Todos los fondos"
              includeAllFunds={true}
              allFundsLabel="Todos los fondos"
              className="w-[200px]"
            />
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Categoría</DialogTitle>
                <DialogDescription>
                  Ingresa el nombre de la nueva categoría de presupuesto y
                  asígnala a un fondo
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ej: Alimentación, Transporte, etc."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="funds">Fondos asociados (opcional)</Label>
                  <MultiFundSelector
                    selectedFunds={newCategoryFunds}
                    onFundsChange={setNewCategoryFunds}
                    placeholder="Seleccionar fondos..."
                    className="w-full"
                  />
                  <CategoryFundInfoCompact className="mt-2" />
                </div>
                <RecurringDateInput
                  value={newCategoryRecurringDate}
                  onChange={setNewCategoryRecurringDate}
                  label="Día recurrente (opcional)"
                  placeholder="Selecciona un día del mes"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddOpen(false);
                    setNewCategoryName("");
                    setNewCategoryFunds([]);
                    setNewCategoryRecurringDate(null);
                  }}
                  disabled={loadingState.isLoading("addCategory")}
                >
                  Cancelar
                </Button>
                <CategoryFundLoadingButton
                  isLoading={loadingState.isLoading("addCategory")}
                  loadingText="Guardando..."
                  onClick={handleAddCategory}
                >
                  Guardar
                </CategoryFundLoadingButton>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Panel */}
      <CategoryFundInfoPanel
        showTips={true}
        showStats={false}
        className="mb-6"
      />

      <Card>
        <CardHeader>
          <CardTitle>Categorías de Presupuesto</CardTitle>
          <CardDescription>
            Administra las categorías para clasificar tus gastos
            {fundFilter &&
              ` - Mostrando categorías del fondo "${fundFilter.name}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Fondo</TableHead>
                <TableHead>Día Recurrente</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(filteredCategories || [])
                .slice()
                .sort((a, b) =>
                  a.name.localeCompare(b.name, "es", { sensitivity: "base" })
                )
                .map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell>
                      <FundCategoryRelationshipIndicator
                        associatedFunds={category.associated_funds || []}
                        fallbackFundName={category.fund_name}
                        showCount={true}
                        showTooltip={true}
                        variant="default"
                      />
                    </TableCell>
                    <TableCell>
                      {category.recurring_date ? (
                        <span className="text-sm">Día {category.recurring_date}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">No configurado</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(category)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          setDeleteId(category.id);
                          setIsDeleteOpen(true);
                        }}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              {(!filteredCategories || filteredCategories.length === 0) && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-4 text-muted-foreground"
                  >
                    {fundFilter
                      ? `No hay categorías en el fondo "${fundFilter.name}". Agrega una nueva categoría para comenzar.`
                      : "No hay categorías. Agrega una nueva categoría para comenzar."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoría</DialogTitle>
            <DialogDescription>
              Actualiza el nombre de la categoría, su asignación de fondo y día recurrente
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={editCategory?.name || ""}
                onChange={(e) =>
                  setEditCategory((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-funds">Fondos asociados (opcional)</Label>
              <MultiFundSelector
                selectedFunds={editCategoryFunds}
                onFundsChange={setEditCategoryFunds}
                placeholder="Seleccionar fondos..."
                className="w-full"
              />
              <CategoryFundInfoCompact className="mt-2" />
            </div>
            <RecurringDateInput
              value={editCategoryRecurringDate}
              onChange={setEditCategoryRecurringDate}
              label="Día recurrente (opcional)"
              placeholder="Selecciona un día del mes"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setEditCategory(null);
                setEditCategoryFunds([]);
                setEditCategoryRecurringDate(null);
              }}
              disabled={loadingState.isLoading("editCategory")}
            >
              Cancelar
            </Button>
            <CategoryFundLoadingButton
              isLoading={loadingState.isLoading("editCategory")}
              loadingText="Guardando..."
              onClick={handleEditCategory}
            >
              Guardar
            </CategoryFundLoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Categoría</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta categoría? Esta acción
              no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog for categories with expenses */}
      <AlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar eliminación
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Esta categoría tiene{" "}
                  <strong>{deleteValidation?.expenseCount}</strong> gastos
                  registrados.
                </p>
                {deleteValidation?.affectedFunds &&
                  deleteValidation.affectedFunds.length > 0 && (
                    <p>
                      Fondos afectados:{" "}
                      <strong>
                        {deleteValidation.affectedFunds.join(", ")}
                      </strong>
                    </p>
                  )}
                <p className="text-destructive font-medium">
                  Al eliminar la categoría, también se eliminarán todos los
                  gastos asociados. Esta acción no se puede deshacer.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                setDeleteValidation(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar categoría y gastos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enhanced Error Dialog */}
      <CategoryFundErrorDialog
        open={dialogState.open}
        onOpenChange={hideError}
        {...dialogState.props}
      />
    </div>
  );
}
