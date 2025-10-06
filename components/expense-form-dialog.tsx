"use client";

import { useState, useEffect } from "react";
import {
  CalendarIcon,
  ChevronDown,
  ChevronUp,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useBudget, type PaymentMethod } from "@/context/budget-context";
import { cn, formatDate } from "@/lib/utils";
import { FundFilter } from "@/components/fund-filter";
import { FundSelectionConstraintIndicator } from "@/components/fund-category-relationship-indicator";
import { SourceFundSelector } from "@/components/source-fund-selector";
import { CreditCardSelector } from "@/components/credit-card-selector";
import { Fund } from "@/types/funds";
import { CreditCard } from "@/types/credit-cards";

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
  /** Optional current fund filter from parent component */
  currentFundFilter?: Fund | null;
}

/**
 * Helper function to get available funds for a category
 */
const getAvailableFundsForCategory = (
  categoryId: string,
  categories: any[],
  funds: Fund[]
): Fund[] => {
  if (!categoryId || !categories || !funds) {
    return funds || [];
  }

  const category = categories.find((cat) => cat.id === categoryId);
  if (!category) {
    return funds || [];
  }

  // If category has associated_funds, use those
  if (category.associated_funds && category.associated_funds.length > 0) {
    return category.associated_funds;
  }

  // Fallback: if no specific funds associated, show all funds
  return funds || [];
};

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
  currentFundFilter,
}: ExpenseFormDialogProps) {
  const {
    categories,
    periods,
    funds,
    activePeriod,
    addExpense,
    getDefaultFund,
    dataLoaded,
  } = useBudget();
  const { toast } = useToast();

  // Form state
  const [newExpenseCategory, setNewExpenseCategory] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [newExpensePeriod, setNewExpensePeriod] = useState(
    activePeriod?.id || ""
  );
  const [newExpenseDate, setNewExpenseDate] = useState<Date | undefined>(
    new Date()
  );
  const [newExpenseEvent, setNewExpenseEvent] = useState("");
  const [newExpensePaymentMethod, setNewExpensePaymentMethod] =
    useState<PaymentMethod>("credit");
  const [newExpenseDescription, setNewExpenseDescription] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [newExpenseDestinationFund, setNewExpenseDestinationFund] =
    useState<Fund | null>(null);
  const [newExpenseSourceFund, setNewExpenseSourceFund] = useState<Fund | null>(
    null
  );
  const [newExpenseCreditCard, setNewExpenseCreditCard] =
    useState<CreditCard | null>(null);

  // State for dynamic fund filtering
  const [availableFundsForNewExpense, setAvailableFundsForNewExpense] =
    useState<Fund[]>([]);

  // UI state
  const [isFundSectionOpen, setIsFundSectionOpen] = useState(false);

  // Filter categories based on current fund filter
  const availableCategories = currentFundFilter
    ? categories.filter((category) => {
        // Check if the fund is in the category's associated_funds
        if (category.associated_funds && category.associated_funds.length > 0) {
          return category.associated_funds.some(
            (fund: Fund) => fund.id === currentFundFilter.id
          );
        }
        // Fallback to old fund_id for backward compatibility
        return category.fund_id === currentFundFilter.id;
      })
    : categories;

  // Update available funds when category changes
  useEffect(() => {
    if (newExpenseCategory && categories && funds) {
      const availableFunds = getAvailableFundsForCategory(
        newExpenseCategory,
        categories,
        funds
      );
      setAvailableFundsForNewExpense(availableFunds);
    } else {
      setAvailableFundsForNewExpense(funds || []);
      if (newExpenseDestinationFund !== null) {
        setNewExpenseDestinationFund(null);
      }
    }
  }, [newExpenseCategory, categories, funds, newExpenseDestinationFund]);

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
        setNewExpenseCategory("");
      }
      setNewExpensePeriod(activePeriod?.id || "");
      setNewExpenseDate(new Date());
      setNewExpenseEvent("");
      setNewExpensePaymentMethod("credit");
      setNewExpenseDescription("");
      setNewExpenseAmount("");
      setNewExpenseSourceFund(null);
      setNewExpenseDestinationFund(null);
      setNewExpenseCreditCard(null);
      setCategorySearch("");
      setAvailableFundsForNewExpense(funds || []);
      setIsFundSectionOpen(false);
    }
  }, [open, preSelectedCategoryId, activePeriod, funds]);

  const resetForm = () => {
    setNewExpenseCategory("");
    setNewExpensePeriod(activePeriod?.id || "");
    setNewExpenseDate(new Date());
    setNewExpenseEvent("");
    setNewExpensePaymentMethod("credit");
    setNewExpenseDescription("");
    setNewExpenseAmount("");
    setNewExpenseSourceFund(null);
    setNewExpenseDestinationFund(null);
    setNewExpenseCreditCard(null);
    setCategorySearch("");
    setAvailableFundsForNewExpense(funds || []);
    setIsFundSectionOpen(false);
  };

  const handleAddExpense = async () => {
    if (
      !newExpenseCategory ||
      !newExpensePeriod ||
      !newExpenseDate ||
      !newExpenseDescription.trim() ||
      !newExpenseAmount ||
      !newExpenseSourceFund
    ) {
      toast({
        title: "Error",
        description:
          "Los campos obligatorios no pueden estar vacíos. Debe seleccionar un fondo origen.",
        variant: "destructive",
      });
      return;
    }

    const amount = Number.parseFloat(newExpenseAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "El monto debe ser un número positivo",
        variant: "destructive",
      });
      return;
    }

    // Validate that source and destination funds are different if destination is selected
    if (
      newExpenseDestinationFund &&
      newExpenseSourceFund.id === newExpenseDestinationFund.id
    ) {
      toast({
        title: "Error",
        description: "El fondo origen y destino no pueden ser el mismo",
        variant: "destructive",
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
        newExpenseSourceFund.id,
        newExpenseDestinationFund?.id,
        newExpenseCreditCard?.id
      );

      resetForm();
      onOpenChange(false);

      toast({
        title: "Gasto agregado",
        description: "El gasto ha sido registrado exitosamente",
      });

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar el gasto. Por favor intenta de nuevo.",
        variant: "destructive",
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
                      {category.fund_name && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({category.fund_name})
                        </span>
                      )}
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

          {/* Collapsible Fund Configuration Section with Orange Border */}
          <div className="border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 rounded-lg p-3">
            <Collapsible
              open={isFundSectionOpen}
              onOpenChange={setIsFundSectionOpen}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-orange-800 dark:text-orange-200 hover:text-orange-900 dark:hover:text-orange-100 transition-colors">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Configuración de Fondos</span>
                </div>
                {isFundSectionOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                {newExpenseCategory && (
                  <FundSelectionConstraintIndicator
                    categoryId={newExpenseCategory}
                    availableFunds={availableFundsForNewExpense}
                    selectedFund={newExpenseDestinationFund}
                    currentFilterFund={currentFundFilter}
                    className=""
                  />
                )}
                <div className="grid gap-2">
                  <Label htmlFor="source-fund">Fondo Origen *</Label>
                  <SourceFundSelector
                    selectedCategoryId={newExpenseCategory}
                    selectedSourceFund={newExpenseSourceFund}
                    onSourceFundChange={setNewExpenseSourceFund}
                    placeholder="Seleccionar fondo origen..."
                    currentFundFilter={currentFundFilter}
                    defaultFund={getDefaultFund()}
                    required={true}
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="destination-fund">
                    Fondo Destino (opcional)
                  </Label>
                  <FundFilter
                    selectedFund={newExpenseDestinationFund}
                    onFundChange={setNewExpenseDestinationFund}
                    placeholder="Seleccionar fondo destino..."
                    includeAllFunds={false}
                    className="w-full"
                    availableFunds={funds}
                  />
                  <p className="text-sm text-muted-foreground">
                    Opcional: Transfiere dinero a otro fondo. Puedes seleccionar
                    cualquier fondo disponible como destino.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
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
                    {period.name} {period.isOpen ? "(Activo)" : ""}
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
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !newExpenseDate && "text-muted-foreground"
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
