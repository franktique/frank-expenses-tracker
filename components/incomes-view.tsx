'use client';

import { useState, useEffect } from 'react';
import { CalendarIcon, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { useBudget, Income, Period } from '@/context/budget-context';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DEFAULT_FUND_ID } from '@/types/funds';

export function IncomesView() {
  const {
    periods,
    incomes,
    activePeriod,
    addIncome,
    updateIncome,
    deleteIncome,
  } = useBudget();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [newIncomePeriod, setNewIncomePeriod] = useState(
    activePeriod?.id || ''
  );
  const [newIncomeDate, setNewIncomeDate] = useState<Date | undefined>(
    new Date()
  );
  const [newIncomeDescription, setNewIncomeDescription] = useState('');
  const [newIncomeAmount, setNewIncomeAmount] = useState('');
  const [newIncomeEvent, setNewIncomeEvent] = useState('');

  const [editIncome, setEditIncome] = useState<{
    id: string;
    periodId: string;
    date: Date | undefined;
    description: string;
    amount: string;
    event?: string;
  } | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update the selected period when active period changes
  useEffect(() => {
    if (activePeriod) {
      setNewIncomePeriod(activePeriod.id);
    }
  }, [activePeriod]);

  const handleAddIncome = async () => {
    if (!newIncomeDate || !newIncomeDescription.trim() || !newIncomeAmount) {
      toast({
        title: 'Error',
        description: 'Fecha, descripción y monto son obligatorios',
        variant: 'destructive',
      });
      return;
    }

    const amount = Number.parseFloat(newIncomeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'El monto debe ser un número positivo',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Usar el periodo activo si no se seleccionó uno
      const periodId = newIncomePeriod || (activePeriod ? activePeriod.id : '');

      await addIncome(
        periodId,
        newIncomeDate.toISOString(),
        newIncomeDescription,
        amount,
        newIncomeEvent.trim() || undefined,
        DEFAULT_FUND_ID // Always use default fund 'Cta Ahorros'
      );

      setNewIncomePeriod(activePeriod?.id || '');
      setNewIncomeDate(new Date());
      setNewIncomeDescription('');
      setNewIncomeAmount('');
      setNewIncomeEvent('');
      setIsAddOpen(false);

      toast({
        title: 'Ingreso agregado',
        description: 'El ingreso ha sido registrado exitosamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: `Error al agregar ingreso: ${(error as Error).message}`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditIncome = async () => {
    if (
      !editIncome ||
      !editIncome.date ||
      !editIncome.description.trim() ||
      !editIncome.amount
    ) {
      toast({
        title: 'Error',
        description: 'Fecha, descripción y monto son obligatorios',
        variant: 'destructive',
      });
      return;
    }

    const amount = Number.parseFloat(editIncome.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'El monto debe ser un número positivo',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Usar el periodo activo si no se seleccionó uno
      const periodId =
        editIncome.periodId || (activePeriod ? activePeriod.id : '');

      await updateIncome(
        editIncome.id,
        periodId,
        editIncome.date.toISOString(),
        editIncome.description,
        amount,
        editIncome.event?.trim() || undefined,
        DEFAULT_FUND_ID // Always use default fund 'Cta Ahorros'
      );

      setEditIncome(null);
      setIsEditOpen(false);

      toast({
        title: 'Ingreso actualizado',
        description: 'El ingreso ha sido actualizado exitosamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: `Error al actualizar ingreso: ${(error as Error).message}`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteIncome = async () => {
    if (deleteId) {
      setIsSubmitting(true);
      try {
        await deleteIncome(deleteId);
        setDeleteId(null);
        setIsDeleteOpen(false);

        toast({
          title: 'Ingreso eliminado',
          description: 'El ingreso ha sido eliminado exitosamente',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: `Error al eliminar ingreso: ${(error as Error).message}`,
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Filter incomes by active period if available
  const filteredIncomes = activePeriod
    ? (incomes || []).filter(
        (income: Income) => income.period_id === activePeriod.id
      )
    : incomes || [];

  // Sort incomes by date (newest first)
  const sortedIncomes = (filteredIncomes || [])
    .slice()
    .sort(
      (a: Income, b: Income) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

  // Check if we have periods
  const hasPeriods = periods && periods.length > 0;

  if (!hasPeriods) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Ingresos</h1>
        <Alert
          variant="warning"
          className="border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-200"
        >
          <AlertTitle>No hay periodos disponibles</AlertTitle>
          <AlertDescription>
            <p>
              Para registrar ingresos, primero debes crear un periodo en la
              sección de Periodos.
            </p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => (window.location.href = '/periodos')}
            >
              Ir a Periodos
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Ingresos</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button componentId="incomes-add-btn">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Ingreso
            </Button>
          </DialogTrigger>
          <DialogContent componentId="incomes-add-dialog">
            <DialogHeader>
              <DialogTitle>Registrar Ingreso</DialogTitle>
              <DialogDescription>
                Ingresa los detalles del nuevo ingreso
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="period">Periodo *</Label>
                <Select
                  value={newIncomePeriod}
                  onValueChange={setNewIncomePeriod}
                  disabled={!periods || !periods.length}
                >
                  <SelectTrigger
                    componentId="income-add-period-select"
                    id="period"
                  >
                    <SelectValue placeholder="Selecciona un periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((period: Period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name}{' '}
                        {period.is_open || period.isOpen ? '(Activo)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!newIncomePeriod && activePeriod && (
                  <p className="text-xs text-muted-foreground">
                    Se usará el periodo activo: {activePeriod.name}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Fecha *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !newIncomeDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newIncomeDate ? (
                        formatDate(newIncomeDate)
                      ) : (
                        <span>Selecciona una fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newIncomeDate}
                      onSelect={setNewIncomeDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descripción *</Label>
                <Input
                  componentId="income-add-description-input"
                  id="description"
                  value={newIncomeDescription}
                  onChange={(e) => setNewIncomeDescription(e.target.value)}
                  placeholder="Ej: Salario, Venta, etc."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Monto *</Label>
                <Input
                  componentId="income-add-amount-input"
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newIncomeAmount}
                  onChange={(e) => setNewIncomeAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event">Evento (opcional)</Label>
                <Input
                  id="event"
                  value={newIncomeEvent}
                  onChange={(e) => setNewIncomeEvent(e.target.value)}
                  placeholder="Ej: Venta especial, Bono, etc."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                componentId="income-add-cancel"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                componentId="income-add-submit"
                onClick={handleAddIncome}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro de Ingresos</CardTitle>
          <CardDescription>
            {activePeriod
              ? `Ingresos del periodo: ${activePeriod.name}`
              : 'Historial de todos los ingresos registrados'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedIncomes.map((income: Income) => {
                const period =
                  periods &&
                  periods.find((p: Period) => p.id === income.period_id);
                return (
                  <TableRow key={income.id}>
                    <TableCell>
                      {/* Forzar visualización correcta de fechas sin desplazamiento de zona horaria */}
                      {income.date && typeof income.date === 'string'
                        ? // Si es string, usar método manual para evitar conversiones automáticas de zona horaria
                          formatDate(
                            new Date(income.date.split('T')[0] + 'T12:00:00Z')
                          )
                        : formatDate(new Date(income.date))}
                    </TableCell>
                    <TableCell>{income.description}</TableCell>
                    <TableCell>{income.event || ''}</TableCell>
                    <TableCell>{period?.name || 'Desconocido'}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(income.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditIncome({
                            id: income.id,
                            periodId: income.period_id || '',
                            date: new Date(income.date),
                            description: income.description,
                            amount: income.amount.toString(),
                            event: income.event || '',
                          });
                          setIsEditOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          setDeleteId(income.id);
                          setIsDeleteOpen(true);
                        }}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!sortedIncomes || sortedIncomes.length === 0) && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-4 text-center text-muted-foreground"
                  >
                    No hay ingresos registrados. Agrega un nuevo ingreso para
                    comenzar.
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
            <DialogTitle>Editar Ingreso</DialogTitle>
            <DialogDescription>
              Actualiza los detalles del ingreso
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-period">Periodo *</Label>
              <Select
                value={editIncome?.periodId || ''}
                onValueChange={(value) =>
                  setEditIncome((prev) =>
                    prev ? { ...prev, periodId: value } : null
                  )
                }
                disabled={!periods || !periods.length}
              >
                <SelectTrigger id="edit-period">
                  <SelectValue placeholder="Selecciona un periodo" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.name}{' '}
                      {period.is_open || period.isOpen ? '(Activo)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!editIncome?.periodId && activePeriod && (
                <p className="text-xs text-muted-foreground">
                  Se usará el periodo activo: {activePeriod.name}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Fecha *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="edit-date"
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !editIncome?.date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editIncome?.date ? (
                      formatDate(editIncome.date)
                    ) : (
                      <span>Selecciona una fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editIncome?.date}
                    onSelect={(date) =>
                      setEditIncome((prev) => (prev ? { ...prev, date } : null))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descripción *</Label>
              <Input
                id="edit-description"
                value={editIncome?.description || ''}
                onChange={(e) =>
                  setEditIncome((prev) =>
                    prev ? { ...prev, description: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-amount">Monto *</Label>
              <Input
                id="edit-amount"
                type="number"
                min="0"
                step="0.01"
                value={editIncome?.amount || ''}
                onChange={(e) =>
                  setEditIncome((prev) =>
                    prev ? { ...prev, amount: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-event">Evento (opcional)</Label>
              <Input
                id="edit-event"
                value={editIncome?.event || ''}
                onChange={(e) =>
                  setEditIncome((prev) =>
                    prev ? { ...prev, event: e.target.value } : null
                  )
                }
                placeholder="Ej: Venta especial, Bono, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditIncome} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Ingreso</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este ingreso? Esta acción no
              se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteIncome}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
