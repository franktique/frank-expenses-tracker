'use client';

import { useState, useEffect } from 'react';
import { PlusCircle, Calculator, Trash2, Edit } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Fund, CreateFundSchema, UpdateFundSchema } from '@/types/funds';
import {
  FundErrorDisplay,
  FundValidationErrorDisplay,
  FundBalanceErrorDisplay,
} from '@/components/fund-error-display';
import {
  classifyError,
  validateFundForm,
  retryOperation,
  logFundError,
} from '@/lib/fund-error-handling';
import {
  FundsEmptyState,
  FundsTableSkeleton,
  LoadingButton,
} from '@/components/fund-empty-states';

export function FundsView() {
  const {
    funds,
    addFund,
    updateFund,
    deleteFund,
    recalculateFundBalance,
    isLoading,
    dataLoaded,
    refreshData,
  } = useBudget();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isRecalculateOpen, setIsRecalculateOpen] = useState(false);

  const [newFund, setNewFund] = useState({
    name: '',
    description: '',
    initialBalance: 0,
    startDate: new Date().toISOString().split('T')[0],
  });

  const [editFund, setEditFund] = useState<Fund | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [recalculateId, setRecalculateId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Error handling state
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Array<{ field: string; message: string }>
  >([]);
  const [balanceErrors, setBalanceErrors] = useState<Record<string, string>>(
    {}
  );

  // Refresh data when component mounts to ensure all data is loaded
  useEffect(() => {
    refreshData();
  }, []); // Empty dependency array - only run on mount

  const resetNewFund = () => {
    setNewFund({
      name: '',
      description: '',
      initialBalance: 0,
      startDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleAddFund = async () => {
    // Clear previous errors
    setValidationErrors([]);
    setGeneralError(null);

    // Validate form data
    const validation = validateFundForm(
      {
        name: newFund.name,
        description: newFund.description || undefined,
        initial_balance: newFund.initialBalance,
        start_date: newFund.startDate,
      },
      CreateFundSchema
    );

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await retryOperation(async () => {
        await addFund(
          newFund.name,
          newFund.description || undefined,
          newFund.initialBalance,
          newFund.startDate
        );
      });

      resetNewFund();
      setIsAddOpen(false);
      toast({
        title: 'Fondo creado',
        description: 'El fondo ha sido creado exitosamente',
      });
    } catch (error) {
      logFundError('add_fund', error, { fundData: newFund });
      const errorDetails = classifyError(error);
      setGeneralError(errorDetails.message);

      toast({
        title: 'Error',
        description: errorDetails.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditFund = async () => {
    if (!editFund) return;

    // Clear previous errors
    setValidationErrors([]);
    setGeneralError(null);

    // Validate form data
    const validation = validateFundForm(
      {
        name: editFund.name,
        description: editFund.description || undefined,
        initial_balance: editFund.initial_balance,
      },
      UpdateFundSchema
    );

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await retryOperation(async () => {
        await updateFund(
          editFund.id,
          editFund.name,
          editFund.description,
          editFund.initial_balance
        );
      });

      setEditFund(null);
      setIsEditOpen(false);
      toast({
        title: 'Fondo actualizado',
        description: 'El fondo ha sido actualizado exitosamente',
      });
    } catch (error) {
      logFundError('update_fund', error, { fundId: editFund.id });
      const errorDetails = classifyError(error);
      setGeneralError(errorDetails.message);

      toast({
        title: 'Error',
        description: errorDetails.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFund = async () => {
    if (!deleteId) return;

    setIsSubmitting(true);
    try {
      await retryOperation(async () => {
        await deleteFund(deleteId);
      });

      setDeleteId(null);
      setIsDeleteOpen(false);
      toast({
        title: 'Fondo eliminado',
        description: 'El fondo ha sido eliminado exitosamente',
      });
    } catch (error) {
      logFundError('delete_fund', error, { fundId: deleteId });
      const errorDetails = classifyError(error);

      toast({
        title: 'Error',
        description: errorDetails.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecalculateBalance = async () => {
    if (!recalculateId) return;

    setIsSubmitting(true);
    try {
      const result = await recalculateFundBalance(recalculateId);

      if (result.success) {
        toast({
          title: 'Balance recalculado',
          description: `Balance actualizado de $${result.old_balance.toLocaleString()} a $${result.new_balance.toLocaleString()}`,
        });
      } else {
        throw new Error(result.error?.message || 'Error al recalcular balance');
      }

      setRecalculateId(null);
      setIsRecalculateOpen(false);
    } catch (error) {
      logFundError('recalculate_balance', error, { fundId: recalculateId });
      const errorDetails = classifyError(error);

      // Store balance error for this specific fund
      setBalanceErrors((prev) => ({
        ...prev,
        [recalculateId]: errorDetails.message,
      }));

      toast({
        title: 'Error',
        description: errorDetails.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryRecalculate = (fundId: string) => {
    setRecalculateId(fundId);
    handleRecalculateBalance();
  };

  const dismissBalanceError = (fundId: string) => {
    setBalanceErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fundId];
      return newErrors;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Fondos</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button componentId="funds-add-btn">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Fondo
            </Button>
          </DialogTrigger>
          <DialogContent
            componentId="funds-add-dialog"
            className="sm:max-w-[425px]"
          >
            <DialogHeader>
              <DialogTitle>Crear Nuevo Fondo</DialogTitle>
              <DialogDescription>
                Crea un nuevo fondo para organizar tus finanzas
              </DialogDescription>
            </DialogHeader>

            {/* Error displays for add dialog */}
            {validationErrors.length > 0 && (
              <div className="px-6">
                <FundValidationErrorDisplay
                  errors={validationErrors}
                  onDismiss={() => setValidationErrors([])}
                />
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={newFund.name}
                  onChange={(e) =>
                    setNewFund({ ...newFund, name: e.target.value })
                  }
                  placeholder="Ej: Ahorros, Emergencias, Vacaciones"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={newFund.description}
                  onChange={(e) =>
                    setNewFund({ ...newFund, description: e.target.value })
                  }
                  placeholder="Descripción opcional del fondo"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="initialBalance">Balance Inicial</Label>
                <Input
                  id="initialBalance"
                  type="number"
                  min="0"
                  step="1000"
                  value={newFund.initialBalance}
                  onChange={(e) =>
                    setNewFund({
                      ...newFund,
                      initialBalance: Number(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startDate">Fecha de Inicio *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newFund.startDate}
                  onChange={(e) =>
                    setNewFund({ ...newFund, startDate: e.target.value })
                  }
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  resetNewFund();
                }}
              >
                Cancelar
              </Button>
              <LoadingButton
                onClick={handleAddFund}
                isLoading={isSubmitting}
                loadingText="Creando..."
              >
                Crear Fondo
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error displays */}
      {generalError && (
        <FundErrorDisplay
          error={generalError}
          onDismiss={() => setGeneralError(null)}
        />
      )}

      {validationErrors.length > 0 && (
        <FundValidationErrorDisplay
          errors={validationErrors}
          onDismiss={() => setValidationErrors([])}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Gestión de Fondos</CardTitle>
          <CardDescription>
            Administra tus fondos financieros y sus balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Balance Inicial</TableHead>
                <TableHead className="text-right">Balance Actual</TableHead>
                <TableHead>Fecha de Inicio</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!dataLoaded ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <FundsTableSkeleton />
                  </TableCell>
                </TableRow>
              ) : !funds || funds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <FundsEmptyState onCreateFund={() => setIsAddOpen(true)} />
                  </TableCell>
                </TableRow>
              ) : (
                [...funds]
                  .sort((a, b) =>
                    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
                  )
                  .map((fund) => (
                    <>
                      <TableRow key={fund.id}>
                        <TableCell className="font-medium">
                          {fund.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {fund.description || 'Sin descripción'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(fund.initial_balance)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(fund.current_balance)}
                        </TableCell>
                        <TableCell>{formatDate(fund.start_date)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRecalculateId(fund.id);
                                setIsRecalculateOpen(true);
                              }}
                              title="Recalcular balance"
                            >
                              <Calculator className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditFund(fund);
                                setIsEditOpen(true);
                              }}
                              title="Editar fondo"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setDeleteId(fund.id);
                                setIsDeleteOpen(true);
                              }}
                              title="Eliminar fondo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {balanceErrors[fund.id] && (
                        <TableRow key={`${fund.id}-error`}>
                          <TableCell colSpan={6} className="p-2">
                            <FundBalanceErrorDisplay
                              fundName={fund.name}
                              error={balanceErrors[fund.id]}
                              onRecalculate={() =>
                                handleRetryRecalculate(fund.id)
                              }
                              onDismiss={() => dismissBalanceError(fund.id)}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Fondo</DialogTitle>
            <DialogDescription>
              Actualiza la información del fondo
            </DialogDescription>
          </DialogHeader>

          {/* Error displays for edit dialog */}
          {validationErrors.length > 0 && (
            <div className="px-6">
              <FundValidationErrorDisplay
                errors={validationErrors}
                onDismiss={() => setValidationErrors([])}
              />
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nombre *</Label>
              <Input
                id="edit-name"
                value={editFund?.name || ''}
                onChange={(e) =>
                  setEditFund((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={editFund?.description || ''}
                onChange={(e) =>
                  setEditFund((prev) =>
                    prev ? { ...prev, description: e.target.value } : null
                  )
                }
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-initialBalance">Balance Inicial</Label>
              <Input
                id="edit-initialBalance"
                type="number"
                min="0"
                step="1000"
                value={editFund?.initial_balance || 0}
                onChange={(e) =>
                  setEditFund((prev) =>
                    prev
                      ? {
                          ...prev,
                          initial_balance: Number(e.target.value) || 0,
                        }
                      : null
                  )
                }
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Nota: La fecha de inicio no se puede modificar después de la
              creación.
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setEditFund(null);
              }}
            >
              Cancelar
            </Button>
            <LoadingButton
              onClick={handleEditFund}
              isLoading={isSubmitting}
              loadingText="Actualizando..."
            >
              Actualizar
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Fondo</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este fondo? Esta acción no se
              puede deshacer.
              <br />
              <br />
              <strong>Advertencia:</strong> No podrás eliminar el fondo si tiene
              categorías o transacciones asociadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteOpen(false);
                setDeleteId(null);
              }}
            >
              Cancelar
            </Button>
            <LoadingButton
              variant="destructive"
              onClick={handleDeleteFund}
              isLoading={isSubmitting}
              loadingText="Eliminando..."
            >
              Eliminar
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recalculate Dialog */}
      <Dialog open={isRecalculateOpen} onOpenChange={setIsRecalculateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recalcular Balance</DialogTitle>
            <DialogDescription>
              ¿Deseas recalcular el balance de este fondo? Esto actualizará el
              balance basado en:
              <br />• Balance inicial del fondo
              <br />• Ingresos asignados al fondo
              <br />• Gastos de categorías del fondo
              <br />• Transferencias hacia y desde el fondo
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRecalculateOpen(false);
                setRecalculateId(null);
              }}
            >
              Cancelar
            </Button>
            <LoadingButton
              onClick={handleRecalculateBalance}
              isLoading={isSubmitting}
              loadingText="Recalculando..."
            >
              Recalcular
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
