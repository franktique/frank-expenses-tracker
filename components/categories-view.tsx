'use client';

import { useState, useMemo } from 'react';
import { PlusCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useBudget } from '@/context/budget-context';
import {
  Category,
  TipoGasto,
  RecurrenceFrequency,
  RECURRENCE_LABELS,
} from '@/types/funds';
import { TipoGastoBadge } from '@/components/tipo-gasto-badge';
import { TipoGastoSelect } from '@/components/tipo-gasto-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function CategoriesView() {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    refreshData,
  } = useBudget();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryTipoGasto, setNewCategoryTipoGasto] = useState<TipoGasto>();
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editCategoryTipoGasto, setEditCategoryTipoGasto] =
    useState<TipoGasto>();
  const [editCategoryDefaultDay, setEditCategoryDefaultDay] = useState<
    number | null
  >(null);
  const [editCategoryRecurrenceFrequency, setEditCategoryRecurrenceFrequency] =
    useState<RecurrenceFrequency>(null);
  const [newCategoryDefaultDay, setNewCategoryDefaultDay] = useState<
    number | null
  >(null);
  const [newCategoryRecurrenceFrequency, setNewCategoryRecurrenceFrequency] =
    useState<RecurrenceFrequency>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteValidation, setDeleteValidation] = useState<{
    hasExpenses: boolean;
    expenseCount: number;
  } | null>(null);

  // All categories (no fund filter)
  const filteredCategories = categories || [];

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
          return {
            hasExpenses: true,
            expenseCount,
          };
        }
      }

      return {
        hasExpenses: false,
        expenseCount: 0,
      };
    } catch (error) {
      console.error('Error validating category deletion:', error);
      return {
        hasExpenses: false,
        expenseCount: 0,
      };
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la categoría no puede estar vacío',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryName,
          tipo_gasto: newCategoryTipoGasto || undefined,
          default_day: newCategoryDefaultDay || undefined,
          recurrence_frequency: newCategoryRecurrenceFrequency || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add category');
      }

      // Reset form immediately
      setNewCategoryName('');
      setNewCategoryTipoGasto(undefined);
      setNewCategoryDefaultDay(null);
      setNewCategoryRecurrenceFrequency(null);
      setIsAddOpen(false);

      // Show success toast
      toast({
        title: 'Categoría agregada',
        description: 'La categoría ha sido agregada exitosamente',
      });

      // Refresh the context data to show the new category
      await refreshData();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          (error as Error).message || 'No se pudo agregar la categoría',
        variant: 'destructive',
      });
    }
  };

  const handleEditCategory = async () => {
    if (!editCategory || !editCategory.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la categoría no puede estar vacío',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Build update payload with all fields including tipo_gasto, default_day, and recurrence
      const updatePayload: any = {
        name: editCategory.name,
      };

      if (editCategoryTipoGasto !== undefined) {
        updatePayload.tipo_gasto = editCategoryTipoGasto;
      }

      if (editCategoryDefaultDay !== undefined) {
        updatePayload.default_day = editCategoryDefaultDay;
      }

      if (editCategoryRecurrenceFrequency !== undefined) {
        updatePayload.recurrence_frequency = editCategoryRecurrenceFrequency;
      }

      // Update category using API call
      const response = await fetch(`/api/categories/${editCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update category');
      }

      // Close dialog and reset state immediately
      setEditCategory(null);
      setEditCategoryTipoGasto(undefined);
      setEditCategoryDefaultDay(null);
      setEditCategoryRecurrenceFrequency(null);
      setIsEditOpen(false);

      // Show success toast
      toast({
        title: 'Categoría actualizada',
        description: 'La categoría ha sido actualizada exitosamente',
      });

      // Refresh the context data to show updated categories
      await refreshData();
    } catch (error) {
      // Only show error toast for actual errors, not for user cancellations
      const errorMessage = (error as Error).message;
      if (errorMessage !== 'User cancelled operation') {
        toast({
          title: 'Error',
          description: errorMessage || 'No se pudo actualizar la categoría',
          variant: 'destructive',
        });
      }
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
        title: 'Categoría eliminada',
        description: 'La categoría ha sido eliminada exitosamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          (error as Error).message || 'No se pudo eliminar la categoría',
        variant: 'destructive',
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
        title: 'Categoría eliminada',
        description: 'La categoría y sus gastos asociados han sido eliminados',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          (error as Error).message || 'No se pudo eliminar la categoría',
        variant: 'destructive',
      });
    }
  };

  const handleEditClick = (category: Category) => {
    setEditCategory(category);
    // Set tipo_gasto
    setEditCategoryTipoGasto(category.tipo_gasto);
    // Set default_day
    setEditCategoryDefaultDay(category.default_day || null);
    // Set recurrence frequency
    setEditCategoryRecurrenceFrequency(category.recurrence_frequency || null);
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
        <div className="flex items-center gap-4">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button componentId="categories-add-btn">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent componentId="categories-add-dialog">
              <DialogHeader>
                <DialogTitle>Agregar Categoría</DialogTitle>
                <DialogDescription>
                  Ingresa el nombre de la nueva categoría de presupuesto
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    componentId="category-add-name-input"
                    id="name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ej: Alimentación, Transporte, etc."
                  />
                </div>
                <div className="grid gap-2">
                  <TipoGastoSelect
                    value={newCategoryTipoGasto}
                    onValueChange={setNewCategoryTipoGasto}
                    label="Tipo de Gasto (opcional)"
                    placeholder="Selecciona el tipo de gasto"
                  />
                </div>
                {/* Recurrence Frequency */}
                <div className="grid gap-2">
                  <Label htmlFor="new-recurrence-frequency">
                    Frecuencia de Pago (opcional)
                  </Label>
                  <Select
                    value={newCategoryRecurrenceFrequency || 'none'}
                    onValueChange={(value) => {
                      if (value === 'none') {
                        setNewCategoryRecurrenceFrequency(null);
                      } else {
                        setNewCategoryRecurrenceFrequency(
                          value as RecurrenceFrequency
                        );
                      }
                    }}
                  >
                    <SelectTrigger id="new-recurrence-frequency">
                      <SelectValue placeholder="Selecciona frecuencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        Un solo pago (predeterminado)
                      </SelectItem>
                      <SelectItem value="weekly">
                        Semanal (cada 7 días)
                      </SelectItem>
                      <SelectItem value="bi-weekly">
                        Quincenal (cada 14 días)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Define si esta categoría se paga múltiples veces al mes
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="new-default-day">
                    {newCategoryRecurrenceFrequency
                      ? 'Día del Primer Pago'
                      : 'Día por Defecto (opcional)'}
                  </Label>
                  <Input
                    id="new-default-day"
                    type="number"
                    min="1"
                    max="31"
                    placeholder={
                      newCategoryRecurrenceFrequency ? 'Ej: 5' : 'Ej: 15'
                    }
                    value={newCategoryDefaultDay || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setNewCategoryDefaultDay(null);
                      } else {
                        const numValue = parseInt(value, 10);
                        if (
                          !isNaN(numValue) &&
                          numValue >= 1 &&
                          numValue <= 31
                        ) {
                          setNewCategoryDefaultDay(numValue);
                        }
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {newCategoryRecurrenceFrequency
                      ? 'Los pagos subsecuentes se calcularán automáticamente según la frecuencia'
                      : 'Día preferido del mes para gastos de esta categoría'}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddOpen(false);
                    setNewCategoryName('');
                    setNewCategoryTipoGasto(undefined);
                    setNewCategoryDefaultDay(null);
                    setNewCategoryRecurrenceFrequency(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddCategory}>
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categorías de Presupuesto</CardTitle>
          <CardDescription>
            Administra las categorías para clasificar tus gastos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo Gasto</TableHead>
                <TableHead>Día por Defecto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(filteredCategories || [])
                .slice()
                .sort((a, b) =>
                  a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
                )
                .map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell>
                      <TipoGastoBadge tipoGasto={category.tipo_gasto} />
                    </TableCell>
                    <TableCell>
                      {category.default_day ? (
                        <span className="text-sm font-medium">
                          {category.default_day}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
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
                    className="py-4 text-center text-muted-foreground"
                  >
                    No hay categorías. Agrega una nueva categoría para comenzar.
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
              Actualiza el nombre de la categoría y su asignación de fondo
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={editCategory?.name || ''}
                onChange={(e) =>
                  setEditCategory((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <TipoGastoSelect
                value={editCategoryTipoGasto}
                onValueChange={setEditCategoryTipoGasto}
                label="Tipo de Gasto (opcional)"
                placeholder="Selecciona el tipo de gasto"
              />
            </div>
            {/* Recurrence Frequency */}
            <div className="grid gap-2">
              <Label htmlFor="edit-recurrence-frequency">
                Frecuencia de Pago (opcional)
              </Label>
              <Select
                value={editCategoryRecurrenceFrequency || 'none'}
                onValueChange={(value) => {
                  if (value === 'none') {
                    setEditCategoryRecurrenceFrequency(null);
                  } else {
                    setEditCategoryRecurrenceFrequency(
                      value as RecurrenceFrequency
                    );
                  }
                }}
              >
                <SelectTrigger id="edit-recurrence-frequency">
                  <SelectValue placeholder="Selecciona frecuencia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    Un solo pago (predeterminado)
                  </SelectItem>
                  <SelectItem value="weekly">Semanal (cada 7 días)</SelectItem>
                  <SelectItem value="bi-weekly">
                    Quincenal (cada 14 días)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define si esta categoría se paga múltiples veces al mes
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-default-day">
                {editCategoryRecurrenceFrequency
                  ? 'Día del Primer Pago'
                  : 'Día por Defecto (opcional)'}
              </Label>
              <Input
                id="edit-default-day"
                type="number"
                min="1"
                max="31"
                placeholder={
                  editCategoryRecurrenceFrequency ? 'Ej: 5' : 'Ej: 15'
                }
                value={editCategoryDefaultDay || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setEditCategoryDefaultDay(null);
                  } else {
                    const numValue = parseInt(value, 10);
                    if (!isNaN(numValue) && numValue >= 1 && numValue <= 31) {
                      setEditCategoryDefaultDay(numValue);
                    }
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                {editCategoryRecurrenceFrequency
                  ? 'Los pagos subsecuentes se calcularán automáticamente según la frecuencia'
                  : 'Especifica el día preferido del mes (1-31) para los gastos de esta categoría'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setEditCategory(null);
                setEditCategoryTipoGasto(undefined);
                setEditCategoryDefaultDay(null);
                setEditCategoryRecurrenceFrequency(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditCategory}>
              Guardar
            </Button>
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
                  Esta categoría tiene{' '}
                  <strong>{deleteValidation?.expenseCount}</strong> gastos
                  registrados.
                </p>
                <p className="font-medium text-destructive">
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
    </div>
  );
}
