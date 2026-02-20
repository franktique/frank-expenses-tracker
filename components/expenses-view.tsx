'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  CalendarIcon,
  FileUp,
  PlusCircle,
  Download,
} from 'lucide-react';
import { ExpenseFormDialog } from '@/components/expense-form-dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CSVImportDialog } from '@/components/csv-import-dialog';
import { CSVImportDialogEnhanced } from '@/components/csv-import-dialog-enhanced';
import { ExportExpensesButton } from '@/components/export-expenses-button';
import { ExportExpensesExcelButton } from '@/components/export-expenses-excel-button';
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
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { Badge } from '@/components/ui/badge';
import { useBudget, type PaymentMethod } from '@/context/budget-context';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { CreditCardSelector } from '@/components/credit-card-selector';
import { CreditCard, CREDIT_CARD_FRANCHISE_LABELS } from '@/types/credit-cards';
import { useRouter, useSearchParams } from 'next/navigation';

export function ExpensesView() {
  const {
    categories,
    periods,
    expenses,
    activePeriod,
    addExpense,
    updateExpense,
    deleteExpense,
    getCategoryById,
    getPeriodById,
    isLoading,
    dataLoaded,
    refreshData,
  } = useBudget();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>(
    searchParams.get('category') || ''
  );
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>(
    searchParams.get('paymentMethod') || ''
  );
  const [creditCardFilter, setCreditCardFilter] = useState<string>(
    searchParams.get('creditCard') || ''
  );

  const [categorySearch, setCategorySearch] = useState('');

  const [editExpense, setEditExpense] = useState<{
    id: string;
    categoryId: string;
    date: Date | undefined;
    event: string;
    paymentMethod: PaymentMethod;
    description: string;
    amount: string;
    creditCardId?: string;
    pending: boolean;
  } | null>(null);
  const [editExpenseCreditCard, setEditExpenseCreditCard] =
    useState<CreditCard | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Credit cards state for filtering
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [creditCardsLoading, setCreditCardsLoading] = useState(false);

  // Function to update URL parameters when filters change
  const updateUrlParams = (updates: Record<string, string>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });

    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`${window.location.pathname}${query}`);
  };

  // Refresh data when component mounts to ensure all data is loaded
  useEffect(() => {
    refreshData();
  }, []); // Empty dependency array - only run on mount

  // Fetch credit cards for filtering
  useEffect(() => {
    const fetchCreditCards = async () => {
      setCreditCardsLoading(true);
      try {
        const response = await fetch('/api/credit-cards');
        if (response.ok) {
          const data = await response.json();
          setCreditCards(data.credit_cards || []);
        }
      } catch (error) {
        console.error('Error fetching credit cards for filter:', error);
        setCreditCards([]);
      } finally {
        setCreditCardsLoading(false);
      }
    };

    fetchCreditCards();
  }, []);

  // All categories are available (no fund filter)
  const availableCategories = categories || [];

  const handleExpenseAdded = () => {
    // Refresh data after expense is added
    refreshData();
  };

  const handleEditExpense = () => {
    if (
      !editExpense ||
      !editExpense.categoryId ||
      !editExpense.date ||
      !editExpense.description.trim() ||
      !editExpense.amount
    ) {
      toast({
        title: 'Error',
        description:
          'Los campos obligatorios no pueden estar vacíos.',
        variant: 'destructive',
      });
      return;
    }

    const amount = Number.parseFloat(editExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'El monto debe ser un número positivo',
        variant: 'destructive',
      });
      return;
    }

    const expense = expenses && expenses.find((e) => e.id === editExpense.id);
    if (!expense) return;

    updateExpense(
      editExpense.id,
      editExpense.categoryId,
      editExpense.date.toISOString(),
      editExpense.event.trim() || undefined,
      editExpense.paymentMethod,
      editExpense.description,
      amount,
      DEFAULT_FUND_ID, // Always use default fund 'Cta Ahorros'
      undefined, // No destination fund
      editExpenseCreditCard?.id,
      editExpense.pending
    );

    setEditExpense(null);
    setEditExpenseCreditCard(null);
    setIsEditOpen(false);

    toast({
      title: 'Gasto actualizado',
      description: 'El gasto ha sido actualizado exitosamente',
    });
  };

  const handleDeleteExpense = () => {
    if (deleteId) {
      deleteExpense(deleteId);
      setDeleteId(null);
      setIsDeleteOpen(false);

      toast({
        title: 'Gasto eliminado',
        description: 'El gasto ha sido eliminado exitosamente',
      });
    }
  };

  // Sort expenses by date (oldest first)
  const sortedExpenses = (expenses || [])
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filter expenses by active period, selected category, payment method, and credit card
  const filteredExpenses = sortedExpenses.filter((expense) => {
    // Filter by period
    const periodMatch = activePeriod
      ? expense.period_id === activePeriod.id
      : true;
    // Filter by category
    const categoryMatch =
      categoryFilter === 'all' || !categoryFilter
        ? true
        : expense.category_id === categoryFilter;
    // Filter by payment method
    const paymentMethodMatch =
      paymentMethodFilter === 'all' || !paymentMethodFilter
        ? true
        : expense.payment_method === paymentMethodFilter;
    // Filter by credit card
    const creditCardMatch =
      creditCardFilter === 'all' || !creditCardFilter
        ? true
        : creditCardFilter === 'none'
          ? !expense.credit_card_id
          : expense.credit_card_id === creditCardFilter;

    return (
      periodMatch &&
      categoryMatch &&
      paymentMethodMatch &&
      creditCardMatch
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos</h1>
          <p className="mt-1 text-muted-foreground">
            {filteredExpenses ? filteredExpenses.length : 0}{' '}
            {filteredExpenses && filteredExpenses.length === 1
              ? 'registro'
              : 'registros'}
            {(categoryFilter !== 'all' && categoryFilter) ||
            (paymentMethodFilter !== 'all' && paymentMethodFilter) ||
            (creditCardFilter !== 'all' && creditCardFilter)
              ? ' con los filtros aplicados'
              : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportExpensesButton />
          <ExportExpensesExcelButton />
          <Button
            componentId="expenses-import-btn"
            variant="outline"
            onClick={() => setIsImportOpen(true)}
          >
            <FileUp className="mr-2 h-4 w-4" />
            Importar CSV
          </Button>
          <Button
            componentId="expenses-add-btn"
            disabled={!dataLoaded}
            onClick={() => setIsAddOpen(true)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Gasto
          </Button>

          <ExpenseFormDialog
            open={isAddOpen}
            onOpenChange={setIsAddOpen}
            onSuccess={handleExpenseAdded}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro de Gastos</CardTitle>
          <CardDescription>
            {activePeriod
              ? `Gastos del periodo: ${activePeriod.name}`
              : 'Historial de todos los gastos registrados'}
          </CardDescription>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="category-filter">Filtrar por categoría</Label>
              <Select
                value={categoryFilter}
                onValueChange={(value) => {
                  setCategoryFilter(value);
                  updateUrlParams({ category: value });
                }}
              >
                <SelectTrigger id="category-filter" className="mt-1">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {availableCategories
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payment-method-filter">
                Filtrar por medio de pago
              </Label>
              <Select
                value={paymentMethodFilter}
                onValueChange={(value) => {
                  setPaymentMethodFilter(value);
                  updateUrlParams({ paymentMethod: value });
                }}
              >
                <SelectTrigger id="payment-method-filter" className="mt-1">
                  <SelectValue placeholder="Todos los medios de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los medios de pago</SelectItem>
                  <SelectItem value="credit">Tarjeta de crédito</SelectItem>
                  <SelectItem value="debit">Tarjeta de débito</SelectItem>
                  <SelectItem value="cash">Efectivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="credit-card-filter">
                Filtrar por tarjeta de crédito
              </Label>
              <Select
                value={creditCardFilter}
                onValueChange={(value) => {
                  setCreditCardFilter(value);
                  updateUrlParams({ creditCard: value });
                }}
                disabled={creditCardsLoading}
              >
                <SelectTrigger id="credit-card-filter" className="mt-1">
                  <SelectValue placeholder="Todas las tarjetas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las tarjetas</SelectItem>
                  <SelectItem value="none">Sin tarjeta de crédito</SelectItem>
                  {creditCards
                    .slice()
                    .sort((a, b) => a.bank_name.localeCompare(b.bank_name))
                    .map((creditCard) => (
                      <SelectItem key={creditCard.id} value={creditCard.id}>
                        {creditCard.bank_name} -{' '}
                        {CREDIT_CARD_FRANCHISE_LABELS[creditCard.franchise]}{' '}
                        ****{creditCard.last_four_digits}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Medio</TableHead>
                <TableHead>Tarjeta</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => {
                const category = getCategoryById(expense.category_id);
                return (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {/* Forzar visualización correcta de fechas sin desplazamiento de zona horaria */}
                      {expense.date && typeof expense.date === 'string'
                        ? // Si es string, usar método manual para evitar conversiones automáticas de zona horaria
                          formatDate(
                            new Date(expense.date.split('T')[0] + 'T12:00:00Z')
                          )
                        : formatDate(new Date(expense.date))}
                    </TableCell>
                    <TableCell>{category?.name || 'Desconocida'}</TableCell>
                    <TableCell>
                      {expense.description}
                      {expense.event && (
                        <span className="block text-xs text-muted-foreground">
                          Evento: {expense.event}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {expense.payment_method === 'credit' && 'Crédito'}
                      {expense.payment_method === 'debit' && 'Débito'}
                      {expense.payment_method === 'cash' && 'Efectivo'}
                    </TableCell>
                    <TableCell>
                      {expense.credit_card_info ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                              expense.credit_card_info.is_active
                                ? 'bg-purple-50 text-purple-700 ring-purple-700/10'
                                : 'bg-gray-50 text-gray-600 ring-gray-600/10'
                            }`}
                          >
                            {expense.credit_card_info.bank_name} ****
                            {expense.credit_card_info.last_four_digits}
                          </span>
                          {!expense.credit_card_info.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Inactiva
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditExpense({
                            id: expense.id,
                            categoryId: expense.category_id,
                            date: new Date(expense.date),
                            event: expense.event || '',
                            paymentMethod: expense.payment_method,
                            description: expense.description,
                            amount: expense.amount.toString(),
                            creditCardId: expense.credit_card_id,
                            pending: expense.pending || false,
                          });
                          // Set the credit card for editing
                          // We'll need to fetch the credit card if it exists
                          if (expense.credit_card_info) {
                            // Create a CreditCard object from the expense credit_card_info
                            const creditCard: CreditCard = {
                              id: expense.credit_card_id!,
                              bank_name: expense.credit_card_info.bank_name,
                              franchise: expense.credit_card_info
                                .franchise as any,
                              last_four_digits:
                                expense.credit_card_info.last_four_digits,
                              is_active:
                                expense.credit_card_info.is_active ?? true,
                              created_at: '',
                              updated_at: '',
                            };
                            setEditExpenseCreditCard(creditCard);
                          } else {
                            setEditExpenseCreditCard(null);
                          }
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
                          setDeleteId(expense.id);
                          setIsDeleteOpen(true);
                        }}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!filteredExpenses || filteredExpenses.length === 0) && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-4 text-center text-muted-foreground"
                  >
                    {!dataLoaded
                      ? 'Cargando gastos...'
                      : 'No hay gastos registrados. Agrega un nuevo gasto para comenzar.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditExpense(null);
            setEditExpenseCreditCard(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Gasto</DialogTitle>
            <DialogDescription>
              Actualiza los detalles del gasto
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Categoría</Label>
              <Select
                value={editExpense?.categoryId || ''}
                onValueChange={(value) => {
                  setEditExpense((prev) =>
                    prev ? { ...prev, categoryId: value } : null
                  );
                  // The useEffect will handle fund selection automatically
                }}
              >
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Buscar categoría..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="mb-2"
                    />
                  </div>
                  {availableCategories
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .filter((category) =>
                      category.name
                        .toLowerCase()
                        .includes(categorySearch.toLowerCase())
                    )
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="edit-date"
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !editExpense?.date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editExpense?.date ? (
                      formatDate(editExpense.date)
                    ) : (
                      <span>Selecciona una fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editExpense?.date}
                    onSelect={(date) =>
                      setEditExpense((prev) =>
                        prev ? { ...prev, date } : null
                      )
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-event">Evento (opcional)</Label>
              <Input
                id="edit-event"
                value={editExpense?.event || ''}
                onChange={(e) =>
                  setEditExpense((prev) =>
                    prev ? { ...prev, event: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-payment-method">Medio de Pago</Label>
              <RadioGroup
                value={editExpense?.paymentMethod || 'credit'}
                onValueChange={(value) =>
                  setEditExpense((prev) =>
                    prev
                      ? { ...prev, paymentMethod: value as PaymentMethod }
                      : null
                  )
                }
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="credit" id="edit-credit" />
                  <Label htmlFor="edit-credit">Tarjeta de Crédito</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="debit" id="edit-debit" />
                  <Label htmlFor="edit-debit">Tarjeta de Débito</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="edit-cash" />
                  <Label htmlFor="edit-cash">Efectivo</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Input
                id="edit-description"
                value={editExpense?.description || ''}
                onChange={(e) =>
                  setEditExpense((prev) =>
                    prev ? { ...prev, description: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-amount">Monto</Label>
              <Input
                id="edit-amount"
                type="number"
                min="0"
                step="0.01"
                value={editExpense?.amount || ''}
                onChange={(e) =>
                  setEditExpense((prev) =>
                    prev ? { ...prev, amount: e.target.value } : null
                  )
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="edit-pending">Pendiente</Label>
                <p className="text-sm text-muted-foreground">
                  Marcar como gasto pendiente de confirmación
                </p>
              </div>
              <Switch
                id="edit-pending"
                checked={editExpense?.pending || false}
                onCheckedChange={(checked) =>
                  setEditExpense((prev) =>
                    prev ? { ...prev, pending: checked } : null
                  )
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-credit-card">
                Tarjeta de Crédito (opcional)
              </Label>
              <CreditCardSelector
                selectedCreditCard={editExpenseCreditCard}
                onCreditCardChange={setEditExpenseCreditCard}
                placeholder="Seleccionar tarjeta de crédito..."
                showNoCardOption={true}
                required={false}
                showOnlyActive={true}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setEditExpense(null);
                setEditExpenseCreditCard(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditExpense}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Gasto</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este gasto? Esta acción no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteExpense}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <CSVImportDialogEnhanced
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
      />
    </div>
  );
}
