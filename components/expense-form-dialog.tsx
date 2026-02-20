'use client';

import { useState, useEffect } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { useToast } from '@/components/ui/use-toast';
import { useBudget, type PaymentMethod } from '@/context/budget-context';
import { cn, formatDate } from '@/lib/utils';
import { CreditCardSelector } from '@/components/credit-card-selector';
import { CreditCard } from '@/types/credit-cards';

/**
 * Props for ExpenseFormDialog component
 */
interface ExpenseFormDialogProps {
  /** Controls whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Optional pre-selected category ID to populate the form */
  preSelectedCategoryId?: string;
  /** Callback invoked after successful expense submission */
  onSuccess?: () => void;
}

/**
 * ExpenseFormDialog - Reusable dialog for adding expenses
 *
 * This component provides a complete form for creating new expenses with support for:
 * - Category selection (can be pre-selected)
 * - Fund relationship management (source and optional destination)
 * - Payment method selection
 * - Credit card association
 * - Date and event tracking
 *
 * @example
 * ```tsx
 * <ExpenseFormDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   preSelectedCategoryId="category-123"
 *   onSuccess={() => console.log("Expense added!")}
 * />
 * ```
 */
export function ExpenseFormDialog({
  open,
  onOpenChange,
  preSelectedCategoryId,
  onSuccess,
}: ExpenseFormDialogProps) {
  const {
    categories,
    periods,
    activePeriod,
    addExpense,
    dataLoaded,
  } = useBudget();
  const { toast } = useToast();

  // Form state
  const [newExpenseCategory, setNewExpenseCategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [newExpensePeriod, setNewExpensePeriod] = useState(
    activePeriod?.id || ''
  );
  const [newExpenseDate, setNewExpenseDate] = useState<Date | undefined>(
    new Date()
  );
  const [newExpenseEvent, setNewExpenseEvent] = useState('');
  const [newExpensePaymentMethod, setNewExpensePaymentMethod] =
    useState<PaymentMethod>('credit');
  const [newExpenseDescription, setNewExpenseDescription] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCreditCard, setNewExpenseCreditCard] =
    useState<CreditCard | null>(null);
  const [newExpensePending, setNewExpensePending] = useState(false);

  // Categories (all categories, no fund filter)
  const availableCategories = categories;

  // Pre-populate category when preSelectedCategoryId is provided
  useEffect(() => {
    if (open && preSelectedCategoryId) {
      setNewExpenseCategory(preSelectedCategoryId);
    }
  }, [open, preSelectedCategoryId]);

  // Update period when active period changes
  useEffect(() => {
    if (activePeriod?.id) {
      setNewExpensePeriod(activePeriod.id);
    }
  }, [activePeriod]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      // Initialize form with defaults
      if (!preSelectedCategoryId) {
        setNewExpenseCategory('');
      }
      setNewExpensePeriod(activePeriod?.id || '');
      setNewExpenseDate(new Date());
      setNewExpenseEvent('');
      setNewExpensePaymentMethod('credit');
      setNewExpenseDescription('');
      setNewExpenseAmount('');
      setNewExpenseCreditCard(null);
      setNewExpensePending(false);
      setCategorySearch('');
    }
  }, [open, preSelectedCategoryId, activePeriod]);

  const resetForm = () => {
    setNewExpenseCategory('');
    setNewExpensePeriod(activePeriod?.id || '');
    setNewExpenseDate(new Date());
    setNewExpenseEvent('');
    setNewExpensePaymentMethod('credit');
    setNewExpenseDescription('');
    setNewExpenseAmount('');
    setNewExpenseCreditCard(null);
    setNewExpensePending(false);
    setCategorySearch('');
  };

  const handleAddExpense = async () => {
    if (
      !newExpenseCategory ||
      !newExpensePeriod ||
      !newExpenseDate ||
      !newExpenseDescription.trim() ||
      !newExpenseAmount
    ) {
      toast({
        title: 'Error',
        description:
          'Los campos obligatorios no pueden estar vacíos.',
        variant: 'destructive',
      });
      return;
    }

    const amount = Number.parseFloat(newExpenseAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'El monto debe ser un número positivo',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addExpense(
        newExpenseCategory,
        newExpensePeriod,
        newExpenseDate.toISOString(),
        newExpenseEvent.trim() || undefined,
        newExpensePaymentMethod,
        newExpenseDescription,
        amount,
        undefined, // No source fund (fondos functionality removed)
        undefined, // No destination fund
        newExpenseCreditCard?.id,
        newExpensePending
      );

      resetForm();
      onOpenChange(false);

      toast({
        title: 'Gasto agregado',
        description: 'El gasto ha sido registrado exitosamente',
      });

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo agregar el gasto. Por favor intenta de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent componentId="expense-form-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Gasto</DialogTitle>
          <DialogDescription>
            Ingresa los detalles del nuevo gasto
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="category">Categoría *</Label>
            <Select
              value={newExpenseCategory}
              onValueChange={setNewExpenseCategory}
              disabled={!!preSelectedCategoryId}
            >
              <SelectTrigger
                componentId="expense-form-category-select"
                id="category"
              >
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {!preSelectedCategoryId && (
                  <div className="p-2">
                    <Input
                      placeholder="Buscar categoría..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="mb-2"
                    />
                  </div>
                )}
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
            {preSelectedCategoryId && (
              <p className="text-xs text-muted-foreground">
                Categoría preseleccionada desde el dashboard
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="period">Periodo *</Label>
            <Select
              value={newExpensePeriod}
              onValueChange={setNewExpensePeriod}
              disabled={!periods || !periods.length}
            >
              <SelectTrigger
                componentId="expense-form-period-select"
                id="period"
              >
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

          <div className="grid gap-2">
            <Label htmlFor="date">Fecha *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !newExpenseDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newExpenseDate ? (
                    formatDate(newExpenseDate)
                  ) : (
                    <span>Selecciona una fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={newExpenseDate}
                  onSelect={setNewExpenseDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event">Evento (opcional)</Label>
            <Input
              componentId="expense-form-event-input"
              id="event"
              value={newExpenseEvent}
              onChange={(e) => setNewExpenseEvent(e.target.value)}
              placeholder="Ej: Cumpleaños, Viaje, etc."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="payment-method">Medio de Pago *</Label>
            <RadioGroup
              value={newExpensePaymentMethod}
              onValueChange={(value) =>
                setNewExpensePaymentMethod(value as PaymentMethod)
              }
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="credit" id="credit" />
                <Label htmlFor="credit">Tarjeta de Crédito</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="debit" id="debit" />
                <Label htmlFor="debit">Tarjeta de Débito</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash">Efectivo</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descripción *</Label>
            <Input
              componentId="expense-form-description-input"
              id="description"
              value={newExpenseDescription}
              onChange={(e) => setNewExpenseDescription(e.target.value)}
              placeholder="Ej: Compra de alimentos, Pago de servicios, etc."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">Monto *</Label>
            <Input
              componentId="expense-form-amount-input"
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={newExpenseAmount}
              onChange={(e) => setNewExpenseAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="pending">Pendiente</Label>
              <p className="text-sm text-muted-foreground">
                Marcar como gasto pendiente de confirmación
              </p>
            </div>
            <Switch
              id="pending"
              checked={newExpensePending}
              onCheckedChange={setNewExpensePending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="credit-card">Tarjeta de Crédito (opcional)</Label>
            <CreditCardSelector
              selectedCreditCard={newExpenseCreditCard}
              onCreditCardChange={setNewExpenseCreditCard}
              placeholder="Seleccionar tarjeta de crédito..."
              showNoCardOption={true}
              required={false}
              showOnlyActive={true}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            componentId="expense-form-cancel"
            variant="outline"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          <Button
            componentId="expense-form-submit"
            onClick={handleAddExpense}
            disabled={!dataLoaded}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
