'use client';

import { useState } from 'react';
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useBudget, PaymentMethod } from '@/context/budget-context';
import { formatCurrency } from '@/lib/utils';

export function BudgetsView() {
  const {
    categories,
    periods,
    budgets,
    activePeriod,
    addBudget,
    updateBudget,
  } = useBudget();
  const { toast } = useToast();

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    activePeriod?.id || ''
  );
  const [comparisonPeriodId, setComparisonPeriodId] = useState<string>('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<{
    id: string;
    name: string;
    budgetId?: string;
    amount: string;
    paymentMethod: PaymentMethod;
  } | null>(null);

  // Get the selected period object
  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  // Get the comparison period object
  const comparisonPeriod = comparisonPeriodId
    ? periods.find((p) => p.id === comparisonPeriodId)
    : null;

  // Filter budgets for the selected period
  const periodBudgets = selectedPeriod
    ? budgets.filter((budget) => budget.period_id === selectedPeriod.id)
    : [];

  // Filter budgets for the comparison period
  const comparisonBudgets = comparisonPeriod
    ? budgets.filter((budget) => budget.period_id === comparisonPeriod.id)
    : [];

  // Get inactive periods for comparison dropdown (exclude active period)
  const inactivePeriods = periods.filter((p) => !p.isOpen);

  const handleEditBudget = () => {
    if (!editCategory || !selectedPeriod) return;

    const amount = Number.parseFloat(editCategory.amount);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: 'Error',
        description: 'El monto debe ser un número positivo',
        variant: 'destructive',
      });
      return;
    }

    if (editCategory.budgetId) {
      // Update existing budget
      updateBudget(editCategory.budgetId, amount, editCategory.paymentMethod);
    } else {
      // Create new budget
      addBudget(
        editCategory.id,
        selectedPeriod.id,
        amount,
        editCategory.paymentMethod
      );
    }

    setEditCategory(null);
    setIsEditOpen(false);

    toast({
      title: 'Presupuesto actualizado',
      description: 'El presupuesto ha sido actualizado exitosamente',
    });
  };

  if (!periods || periods.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Presupuestos</h1>
        <Card>
          <CardHeader>
            <CardTitle>No hay periodos disponibles</CardTitle>
            <CardDescription>
              Para configurar presupuestos, primero debes crear un periodo
              presupuestario en la sección de Periodos.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Presupuestos</h1>
        <p className="text-muted-foreground">
          Configura los montos presupuestados para cada categoría en el periodo
          seleccionado
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Presupuestos por Categoría</CardTitle>
                <CardDescription>
                  Establece el monto esperado para cada categoría
                </CardDescription>
              </div>
              <div className="w-full sm:w-64">
                <Select
                  value={selectedPeriodId}
                  onValueChange={setSelectedPeriodId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name} {period.isOpen ? '(Activo)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="comparison-period"
                className="text-sm font-medium"
              >
                Periodo de Referencia (Opcional)
              </Label>
              <div className="w-full sm:w-64">
                <Select
                  value={comparisonPeriodId || undefined}
                  onValueChange={(value) =>
                    setComparisonPeriodId(value === 'none' ? '' : value)
                  }
                >
                  <SelectTrigger
                    id="comparison-period"
                    componentId="budgets-comparison-period-select"
                  >
                    <SelectValue placeholder="Selecciona un periodo para comparar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {inactivePeriods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedPeriod && (
            <div className="mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Presupuestado
                    {comparisonPeriod && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (Comparando con: {comparisonPeriod.name})
                      </span>
                    )}
                  </CardTitle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="h-4 w-4 text-muted-foreground"
                  >
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      periodBudgets.reduce(
                        (sum, budget) => sum + Number(budget.expected_amount),
                        0
                      )
                    )}
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">Efectivo:</span>{' '}
                      {formatCurrency(
                        periodBudgets
                          .filter((b) => b.payment_method === 'cash')
                          .reduce(
                            (sum, budget) =>
                              sum + Number(budget.expected_amount),
                            0
                          )
                      )}
                    </div>
                    <div>
                      <span className="font-medium">Crédito:</span>{' '}
                      {formatCurrency(
                        periodBudgets
                          .filter((b) => b.payment_method === 'credit')
                          .reduce(
                            (sum, budget) =>
                              sum + Number(budget.expected_amount),
                            0
                          )
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {periodBudgets.filter((b) => b.expected_amount > 0).length}{' '}
                    categorías con presupuesto
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          {!selectedPeriod ? (
            <div className="py-4 text-center text-muted-foreground">
              Selecciona un periodo para ver y configurar los presupuestos
            </div>
          ) : (
            <Table stickyHeader>
              <TableHeader sticky>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  {comparisonPeriod && (
                    <>
                      <TableHead className="bg-muted/50 text-right text-muted-foreground">
                        Efectivo (Ref)
                      </TableHead>
                      <TableHead className="bg-muted/50 text-right text-muted-foreground">
                        Crédito (Ref)
                      </TableHead>
                      <TableHead className="bg-muted/50 text-right text-muted-foreground">
                        Total (Ref)
                      </TableHead>
                    </>
                  )}
                  <TableHead className="text-center">
                    Fecha por Defecto
                  </TableHead>
                  <TableHead className="text-right">Efectivo</TableHead>
                  <TableHead className="text-right">Crédito</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories
                  .slice() // Create a copy of the array to avoid mutating the original
                  .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically by name
                  .map((category) => {
                    // Find budgets for this category in selected period for different payment methods
                    const cashBudget = periodBudgets.find(
                      (b) =>
                        b.category_id === category.id &&
                        b.payment_method === 'cash'
                    );
                    const creditBudget = periodBudgets.find(
                      (b) =>
                        b.category_id === category.id &&
                        b.payment_method === 'credit'
                    );

                    const totalAmount =
                      (cashBudget ? Number(cashBudget.expected_amount) : 0) +
                      (creditBudget ? Number(creditBudget.expected_amount) : 0);

                    // Find comparison budgets for this category
                    const comparisonCashBudget = comparisonBudgets.find(
                      (b) =>
                        b.category_id === category.id &&
                        b.payment_method === 'cash'
                    );
                    const comparisonCreditBudget = comparisonBudgets.find(
                      (b) =>
                        b.category_id === category.id &&
                        b.payment_method === 'credit'
                    );

                    const comparisonTotalAmount =
                      (comparisonCashBudget
                        ? Number(comparisonCashBudget.expected_amount)
                        : 0) +
                      (comparisonCreditBudget
                        ? Number(comparisonCreditBudget.expected_amount)
                        : 0);

                    return (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">
                          {category.name}
                        </TableCell>
                        {comparisonPeriod && (
                          <>
                            <TableCell className="bg-muted/30 text-right text-muted-foreground">
                              {formatCurrency(
                                comparisonCashBudget?.expected_amount || 0
                              )}
                            </TableCell>
                            <TableCell className="bg-muted/30 text-right text-muted-foreground">
                              {formatCurrency(
                                comparisonCreditBudget?.expected_amount || 0
                              )}
                            </TableCell>
                            <TableCell className="bg-muted/30 text-right font-medium text-muted-foreground">
                              {formatCurrency(comparisonTotalAmount)}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-center text-sm">
                          {cashBudget?.default_date
                            ? new Date(
                                cashBudget.default_date
                              ).toLocaleDateString('es-MX', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {cashBudget
                            ? formatCurrency(cashBudget.expected_amount)
                            : formatCurrency(0)}
                          <Button
                            componentId={`budgets-edit-btn-cash-${category.id}`}
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-6 w-6 p-0"
                            onClick={() => {
                              setEditCategory({
                                id: category.id,
                                name: category.name,
                                budgetId: cashBudget?.id,
                                amount: cashBudget
                                  ? cashBudget.expected_amount.toString()
                                  : '0',
                                paymentMethod: 'cash',
                              });
                              setIsEditOpen(true);
                            }}
                          >
                            <span className="sr-only">Editar efectivo</span>
                            ✏️
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          {creditBudget
                            ? formatCurrency(creditBudget.expected_amount)
                            : formatCurrency(0)}
                          <Button
                            componentId={`budgets-edit-btn-credit-${category.id}`}
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-6 w-6 p-0"
                            onClick={() => {
                              setEditCategory({
                                id: category.id,
                                name: category.name,
                                budgetId: creditBudget?.id,
                                amount: creditBudget
                                  ? creditBudget.expected_amount.toString()
                                  : '0',
                                paymentMethod: 'credit',
                              });
                              setIsEditOpen(true);
                            }}
                          >
                            <span className="sr-only">Editar crédito</span>
                            ✏️
                          </Button>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(totalAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditCategory({
                                id: category.id,
                                name: category.name,
                                amount: '0',
                                paymentMethod: 'cash',
                              });
                              setIsEditOpen(true);
                            }}
                          >
                            Agregar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {(!categories || categories.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-4 text-center text-muted-foreground"
                    >
                      No hay categorías. Agrega categorías en la sección de
                      Categorías.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Budget Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Establecer Presupuesto</DialogTitle>
            <DialogDescription>
              Define el monto presupuestado para {editCategory?.name} en el
              periodo {selectedPeriod?.name} (
              {editCategory?.paymentMethod === 'cash' ? 'Efectivo' : 'Crédito'})
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Monto Presupuestado</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={editCategory?.amount || '0'}
                onChange={(e) =>
                  setEditCategory((prev) =>
                    prev ? { ...prev, amount: e.target.value } : null
                  )
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="payment-method">Método de Pago</Label>
              <RadioGroup
                id="payment-method"
                value={editCategory?.paymentMethod || 'cash'}
                onValueChange={(value: PaymentMethod) =>
                  setEditCategory((prev) =>
                    prev ? { ...prev, paymentMethod: value } : null
                  )
                }
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash">Efectivo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="credit" id="credit" />
                  <Label htmlFor="credit">Crédito</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditBudget}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
