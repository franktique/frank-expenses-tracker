'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useToast } from '@/components/ui/use-toast';
import { useBudget, type PaymentMethod } from '@/context/budget-context';
import { cn, formatDate } from '@/lib/utils';
import { CreditCardSelector } from '@/components/credit-card-selector';
import { CreditCard } from '@/types/credit-cards';
import { Event } from '@/types/funds';
import { EventSelector } from '@/components/event-selector';

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
  const [categorySearchValue, setCategorySearchValue] = useState('');
  const [categoryDebouncedSearch, setCategoryDebouncedSearch] = useState('');
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const categoryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [newExpensePeriod, setNewExpensePeriod] = useState(
    activePeriod?.id || ''
  );
  const [newExpenseDate, setNewExpenseDate] = useState<Date | undefined>(
    new Date()
  );
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [newExpensePaymentMethod, setNewExpensePaymentMethod] =
    useState<PaymentMethod>('credit');
  const [newExpenseDescription, setNewExpenseDescription] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCreditCard, setNewExpenseCreditCard] =
    useState<CreditCard | null>(null);
  const [newExpensePending, setNewExpensePending] = useState(false);

  // Categories (all categories, no fund filter)
  const availableCategories = categories;

  const filteredCategories = useMemo(() => {
    const query = categoryDebouncedSearch.trim().toLowerCase();
    const sorted = availableCategories
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return sorted;
    return sorted.filter((c) => c.name.toLowerCase().includes(query));
  }, [availableCategories, categoryDebouncedSearch]);

  const handleCategorySearchChange = (value: string) => {
    setCategorySearchValue(value);
    if (categoryDebounceRef.current) clearTimeout(categoryDebounceRef.current);
    categoryDebounceRef.current = setTimeout(
      () => setCategoryDebouncedSearch(value),
      300
    );
  };

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
      setSelectedEvent(null);
      setNewExpensePaymentMethod('credit');
      setNewExpenseDescription('');
      setNewExpenseAmount('');
      setNewExpenseCreditCard(null);
      setNewExpensePending(false);
      setCategorySearchValue('');
      setCategoryDebouncedSearch('');
      if (categoryDebounceRef.current) clearTimeout(categoryDebounceRef.current);
    }
  }, [open, preSelectedCategoryId, activePeriod]);

  const resetForm = () => {
    setNewExpenseCategory('');
    setNewExpensePeriod(activePeriod?.id || '');
    setNewExpenseDate(new Date());
    setSelectedEvent(null);
    setNewExpensePaymentMethod('credit');
    setNewExpenseDescription('');
    setNewExpenseAmount('');
    setNewExpenseCreditCard(null);
    setNewExpensePending(false);
    setCategorySearchValue('');
    setCategoryDebouncedSearch('');
    if (categoryDebounceRef.current) clearTimeout(categoryDebounceRef.current);
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
        selectedEvent?.name, // backward compat: keep event string
        newExpensePaymentMethod,
        newExpenseDescription,
        amount,
        undefined, // No source fund (fondos functionality removed)
        undefined, // No destination fund
        newExpenseCreditCard?.id,
        newExpensePending,
        selectedEvent?.id // event_id
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
            <Label>Categoría *</Label>
            {preSelectedCategoryId ? (
              <Input
                value={
                  availableCategories.find(
                    (c) => c.id === newExpenseCategory
                  )?.name || ''
                }
                disabled
                className="bg-muted"
              />
            ) : (
              <Popover
                open={categoryPopoverOpen}
                onOpenChange={(nextOpen) => {
                  setCategoryPopoverOpen(nextOpen);
                  if (!nextOpen) {
                    setCategorySearchValue('');
                    setCategoryDebouncedSearch('');
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryPopoverOpen}
                    className="w-full justify-between"
                  >
                    <span className="truncate">
                      {newExpenseCategory
                        ? availableCategories.find(
                            (c) => c.id === newExpenseCategory
                          )?.name || 'Selecciona una categoría'
                        : 'Selecciona una categoría'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar categoría..."
                      value={categorySearchValue}
                      onValueChange={handleCategorySearchChange}
                    />
                    <CommandList>
                      <CommandEmpty>
                        No se encontraron categorías.
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredCategories.map((category) => (
                          <CommandItem
                            key={category.id}
                            value={category.id}
                            onSelect={() => {
                              setNewExpenseCategory(category.id);
                              setCategoryPopoverOpen(false);
                              setCategorySearchValue('');
                              setCategoryDebouncedSearch('');
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                newExpenseCategory === category.id
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            {category.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
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
            <EventSelector
              selectedEvent={selectedEvent}
              onEventChange={setSelectedEvent}
              placeholder="Seleccionar evento..."
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
