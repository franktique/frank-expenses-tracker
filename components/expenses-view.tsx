"use client";

import { useState, useMemo, useEffect } from "react";
import {
  CalendarIcon,
  FileUp,
  PlusCircle,
  Download,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Settings,
} from "lucide-react";
import { ExpenseFormDialog } from "@/components/expense-form-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CSVImportDialog } from "@/components/csv-import-dialog";
import { CSVImportDialogEnhanced } from "@/components/csv-import-dialog-enhanced";
import { ExportExpensesButton } from "@/components/export-expenses-button";
import { ExportExpensesExcelButton } from "@/components/export-expenses-excel-button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { useBudget, type PaymentMethod } from "@/context/budget-context";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { FundFilter } from "@/components/fund-filter";
import { FundSelectionConstraintIndicator } from "@/components/fund-category-relationship-indicator";
import { SourceFundSelector } from "@/components/source-fund-selector";
import { CreditCardSelector } from "@/components/credit-card-selector";
import { Fund } from "@/types/funds";
import { CreditCard, CREDIT_CARD_FRANCHISE_LABELS } from "@/types/credit-cards";
import { useRouter, useSearchParams } from "next/navigation";

// Helper function to get available funds for a category
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

// Helper function to get default fund for a category based on priority logic
const getDefaultFundForCategory = (
  categoryId: string,
  categories: any[],
  funds: Fund[],
  currentFilterFund: Fund | null
): Fund | null => {
  const availableFunds = getAvailableFundsForCategory(
    categoryId,
    categories,
    funds
  );

  if (availableFunds.length === 0) {
    return null;
  }

  // Priority 1: If current filter fund is available for this category, use it
  if (
    currentFilterFund &&
    availableFunds.some((fund) => fund.id === currentFilterFund.id)
  ) {
    return currentFilterFund;
  }

  // Priority 2: Use first available fund for the category
  return availableFunds[0] || null;
};

// Helper function to validate if a fund is valid for a category
const isFundValidForCategory = (
  fundId: string,
  categoryId: string,
  categories: any[],
  funds: Fund[]
): boolean => {
  const availableFunds = getAvailableFundsForCategory(
    categoryId,
    categories,
    funds
  );
  return availableFunds.some((fund) => fund.id === fundId);
};

export function ExpensesView() {
  const {
    categories,
    periods,
    expenses,
    funds,
    activePeriod,
    addExpense,
    updateExpense,
    deleteExpense,
    getCategoryById,
    getPeriodById,
    getFundById,
    getDefaultFund,
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
  const [isFundSectionOpenEdit, setIsFundSectionOpenEdit] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>(
    searchParams.get("category") || ""
  );
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>(
    searchParams.get("paymentMethod") || ""
  );
  const [creditCardFilter, setCreditCardFilter] = useState<string>(
    searchParams.get("creditCard") || ""
  );

  // Fund filter state - mandatory for expenses
  const [fundFilter, setFundFilter] = useState<Fund | null>(null);

  const [categorySearch, setCategorySearch] = useState("");

  // State for dynamic fund filtering (for edit form only)
  const [availableFundsForEditExpense, setAvailableFundsForEditExpense] =
    useState<Fund[]>([]);

  const [editExpense, setEditExpense] = useState<{
    id: string;
    categoryId: string;
    date: Date | undefined;
    event: string;
    paymentMethod: PaymentMethod;
    description: string;
    amount: string;
    sourceFundId?: string;
    destinationFundId?: string;
    creditCardId?: string;
  } | null>(null);
  const [editExpenseDestinationFund, setEditExpenseDestinationFund] =
    useState<Fund | null>(null);
  const [editExpenseSourceFund, setEditExpenseSourceFund] =
    useState<Fund | null>(null);
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
      if (value && value !== "" && value !== "all") {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });

    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${window.location.pathname}${query}`);
  };

  // Refresh data when component mounts to ensure all data is loaded
  useEffect(() => {
    refreshData();
  }, []); // Empty dependency array - only run on mount

  // Set default fund filter using configured default fund when data is fully loaded
  useEffect(() => {
    if (dataLoaded && funds && funds.length > 0 && !fundFilter) {
      // Get the configured default fund from settings
      const defaultFund = getDefaultFund();
      if (defaultFund) {
        setFundFilter(defaultFund);
        console.log(`Expenses: Fund filter set to default fund: ${defaultFund.name}`);
      } else {
        // Fallback to "Disponible" fund if no default is configured
        const disponibleFund = funds.find((fund) => fund.name === "Disponible");
        if (disponibleFund) {
          setFundFilter(disponibleFund);
          console.log(`Expenses: Fund filter set to fallback 'Disponible' fund`);
        }
      }
    }
  }, [funds, fundFilter, dataLoaded]);

  // Fetch credit cards for filtering
  useEffect(() => {
    const fetchCreditCards = async () => {
      setCreditCardsLoading(true);
      try {
        const response = await fetch("/api/credit-cards");
        if (response.ok) {
          const data = await response.json();
          setCreditCards(data.credit_cards || []);
        }
      } catch (error) {
        console.error("Error fetching credit cards for filter:", error);
        setCreditCards([]);
      } finally {
        setCreditCardsLoading(false);
      }
    };

    fetchCreditCards();
  }, []);

  // Update available funds for edit expense when category changes
  useEffect(() => {
    if (editExpense?.categoryId && categories && funds) {
      const availableFunds = getAvailableFundsForCategory(
        editExpense.categoryId,
        categories,
        funds
      );
      setAvailableFundsForEditExpense(availableFunds);

      // Note: Destination fund is independent of category restrictions
      // Users can select any available fund as destination
    } else {
      setAvailableFundsForEditExpense(funds || []);
      // Reset destination fund if no category selected
      if (editExpenseDestinationFund !== null) {
        setEditExpenseDestinationFund(null);
      }
    }
  }, [
    editExpense?.categoryId,
    categories,
    funds,
    fundFilter,
    editExpenseDestinationFund,
  ]);

  // Filter categories based on selected fund
  const availableCategories = useMemo(() => {
    if (!categories) {
      return [];
    }
    if (!fundFilter) {
      return categories;
    }
    return categories.filter((category) => {
      // Check if the fund is in the category's associated_funds
      if (category.associated_funds && category.associated_funds.length > 0) {
        return category.associated_funds.some(
          (fund: Fund) => fund.id === fundFilter.id
        );
      }
      // Fallback to old fund_id for backward compatibility
      return category.fund_id === fundFilter.id;
    });
  }, [categories, fundFilter]);

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
      !editExpense.amount ||
      !editExpenseSourceFund
    ) {
      toast({
        title: "Error",
        description:
          "Los campos obligatorios no pueden estar vacíos. Debe seleccionar un fondo origen.",
        variant: "destructive",
      });
      return;
    }

    const amount = Number.parseFloat(editExpense.amount);
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
      editExpenseDestinationFund &&
      editExpenseSourceFund.id === editExpenseDestinationFund.id
    ) {
      toast({
        title: "Error",
        description: "El fondo origen y destino no pueden ser el mismo",
        variant: "destructive",
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
      editExpenseSourceFund?.id,
      editExpenseDestinationFund?.id,
      editExpenseCreditCard?.id
    );

    setEditExpense(null);
    setEditExpenseSourceFund(null);
    setEditExpenseDestinationFund(null);
    setEditExpenseCreditCard(null);
    setIsEditOpen(false);

    toast({
      title: "Gasto actualizado",
      description: "El gasto ha sido actualizado exitosamente",
    });
  };

  const handleDeleteExpense = () => {
    if (deleteId) {
      deleteExpense(deleteId);
      setDeleteId(null);
      setIsDeleteOpen(false);

      toast({
        title: "Gasto eliminado",
        description: "El gasto ha sido eliminado exitosamente",
      });
    }
  };

  // Sort expenses by date (oldest first)
  const sortedExpenses = (expenses || [])
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filter expenses by active period, selected category, payment method, and credit card if available
  // Also filter by fund - only show expenses from categories that belong to the selected fund
  const filteredExpenses = sortedExpenses.filter((expense) => {
    // Filter by period
    const periodMatch = activePeriod
      ? expense.period_id === activePeriod.id
      : true;
    // Filter by category
    const categoryMatch =
      categoryFilter === "all" || !categoryFilter
        ? true
        : expense.category_id === categoryFilter;
    // Filter by payment method
    const paymentMethodMatch =
      paymentMethodFilter === "all" || !paymentMethodFilter
        ? true
        : expense.payment_method === paymentMethodFilter;
    // Filter by credit card
    const creditCardMatch =
      creditCardFilter === "all" || !creditCardFilter
        ? true
        : creditCardFilter === "none"
        ? !expense.credit_card_id
        : expense.credit_card_id === creditCardFilter;
    // Filter by fund - only show expenses from categories that belong to the selected fund
    const fundMatch = !fundFilter
      ? true
      : (() => {
          const category = getCategoryById(expense.category_id);
          if (!category) return false;

          // Check if the fund is in the category's associated_funds
          if (
            category.associated_funds &&
            category.associated_funds.length > 0
          ) {
            return category.associated_funds.some(
              (fund: Fund) => fund.id === fundFilter.id
            );
          }
          // Fallback to old fund_id for backward compatibility
          return category.fund_id === fundFilter.id;
        })();

    return (
      periodMatch &&
      categoryMatch &&
      paymentMethodMatch &&
      creditCardMatch &&
      fundMatch
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos</h1>
          <p className="text-muted-foreground mt-1">
            {filteredExpenses ? filteredExpenses.length : 0}{" "}
            {filteredExpenses && filteredExpenses.length === 1
              ? "registro"
              : "registros"}
            {(categoryFilter !== "all" && categoryFilter) ||
            (paymentMethodFilter !== "all" && paymentMethodFilter) ||
            (creditCardFilter !== "all" && creditCardFilter)
              ? " con los filtros aplicados"
              : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportExpensesButton />
          <ExportExpensesExcelButton />
          <Button componentId="expenses-import-btn" variant="outline" onClick={() => setIsImportOpen(true)}>
            <FileUp className="mr-2 h-4 w-4" />
            Importar CSV
          </Button>
          <Button
            componentId="expenses-add-btn"
            disabled={!dataLoaded || !fundFilter}
            onClick={() => setIsAddOpen(true)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Gasto
          </Button>

          <ExpenseFormDialog
            open={isAddOpen}
            onOpenChange={setIsAddOpen}
            onSuccess={handleExpenseAdded}
            currentFundFilter={fundFilter}
          />
        </div>
      </div>

      {/* Mandatory Fund Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filtro de Fondo</CardTitle>
          <CardDescription>
            Selecciona un fondo para filtrar las categorías y gastos disponibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="fund-filter">Fondo:</Label>
            {!dataLoaded ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-blue-50 border border-blue-200">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-blue-700">
                  Cargando fondos disponibles...
                </p>
              </div>
            ) : (
              <>
                <FundFilter
                  selectedFund={fundFilter}
                  onFundChange={setFundFilter}
                  placeholder="Seleccionar fondo..."
                  includeAllFunds={false}
                  className="w-[300px]"
                  required
                />
                {!fundFilter && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <p className="text-sm text-destructive">
                      Debe seleccionar un fondo para registrar gastos
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registro de Gastos</CardTitle>
          <CardDescription>
            {activePeriod
              ? `Gastos del periodo: ${activePeriod.name}`
              : "Historial de todos los gastos registrados"}
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
                        {creditCard.bank_name} -{" "}
                        {CREDIT_CARD_FRANCHISE_LABELS[creditCard.franchise]}{" "}
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
                <TableHead>Fondo Origen</TableHead>
                <TableHead>Fondo Destino</TableHead>
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
                      {expense.date && typeof expense.date === "string"
                        ? // Si es string, usar método manual para evitar conversiones automáticas de zona horaria
                          formatDate(
                            new Date(expense.date.split("T")[0] + "T12:00:00Z")
                          )
                        : formatDate(new Date(expense.date))}
                    </TableCell>
                    <TableCell>{category?.name || "Desconocida"}</TableCell>
                    <TableCell>
                      {expense.description}
                      {expense.event && (
                        <span className="block text-xs text-muted-foreground">
                          Evento: {expense.event}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {expense.payment_method === "credit" && "Crédito"}
                      {expense.payment_method === "debit" && "Débito"}
                      {expense.payment_method === "cash" && "Efectivo"}
                    </TableCell>
                    <TableCell>
                      {expense.credit_card_info ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                              expense.credit_card_info.is_active
                                ? "bg-purple-50 text-purple-700 ring-purple-700/10"
                                : "bg-gray-50 text-gray-600 ring-gray-600/10"
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
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {expense.source_fund_name ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {expense.source_fund_name}
                          </span>
                          {/* Transfer indicator when source and destination are different */}
                          {expense.destination_fund_name &&
                            expense.source_fund_name !==
                              expense.destination_fund_name && (
                              <span
                                className="inline-flex items-center rounded-md bg-orange-50 px-1.5 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-700/10"
                                title="Transferencia entre fondos"
                              >
                                <ArrowRight className="h-3 w-3" />
                              </span>
                            )}
                          {/* Same fund indicator */}
                          {expense.destination_fund_name &&
                            expense.source_fund_name ===
                              expense.destination_fund_name && (
                              <span
                                className="inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-700/10"
                                title="Mismo fondo origen y destino"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </span>
                            )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {expense.destination_fund_name ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-700/10">
                            {expense.destination_fund_name}
                          </span>
                          {/* Transfer type indicator */}
                          {expense.source_fund_name &&
                            expense.source_fund_name !==
                              expense.destination_fund_name && (
                              <span className="inline-flex items-center rounded-md bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800 ring-1 ring-inset ring-orange-600/20">
                                Transferencia
                              </span>
                            )}
                          {/* Same fund indicator */}
                          {expense.source_fund_name &&
                            expense.source_fund_name ===
                              expense.destination_fund_name && (
                              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 ring-1 ring-inset ring-gray-600/20">
                                Interno
                              </span>
                            )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
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
                            event: expense.event || "",
                            paymentMethod: expense.payment_method,
                            description: expense.description,
                            amount: expense.amount.toString(),
                            sourceFundId: expense.source_fund_id,
                            destinationFundId: expense.destination_fund_id,
                            creditCardId: expense.credit_card_id,
                          });
                          // Set the source fund for editing
                          const sourceFund = expense.source_fund_id
                            ? getFundById(expense.source_fund_id)
                            : null;
                          setEditExpenseSourceFund(sourceFund || null);
                          // Set the destination fund for editing
                          const destinationFund = expense.destination_fund_id
                            ? getFundById(expense.destination_fund_id)
                            : null;
                          setEditExpenseDestinationFund(
                            destinationFund || null
                          );
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
                              is_active: expense.credit_card_info.is_active,
                              created_at: "",
                              updated_at: "",
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
                    className="text-center py-4 text-muted-foreground"
                  >
                    {!dataLoaded
                      ? "Cargando gastos..."
                      : !fundFilter
                      ? "Selecciona un fondo para ver los gastos disponibles."
                      : `No hay gastos registrados para el fondo "${fundFilter.name}". Agrega un nuevo gasto para comenzar.`}
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
            setEditExpenseSourceFund(null);
            setEditExpenseDestinationFund(null);
            setEditExpenseCreditCard(null);
            setIsFundSectionOpenEdit(false);
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
                value={editExpense?.categoryId || ""}
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
            {/* Collapsible Fund Configuration Section with Orange Border */}
            <div className="border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 rounded-lg p-3">
              <Collapsible
                open={isFundSectionOpenEdit}
                onOpenChange={setIsFundSectionOpenEdit}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-orange-800 dark:text-orange-200 hover:text-orange-900 dark:hover:text-orange-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Configuración de Fondos</span>
                  </div>
                  {isFundSectionOpenEdit ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  {editExpense?.categoryId && (
                    <FundSelectionConstraintIndicator
                      categoryId={editExpense.categoryId}
                      availableFunds={availableFundsForEditExpense}
                      selectedFund={editExpenseDestinationFund}
                      currentFilterFund={fundFilter}
                      className=""
                    />
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="edit-source-fund">Fondo Origen *</Label>
                    <SourceFundSelector
                      selectedCategoryId={editExpense?.categoryId || null}
                      selectedSourceFund={editExpenseSourceFund}
                      onSourceFundChange={setEditExpenseSourceFund}
                      placeholder="Seleccionar fondo origen..."
                      currentFundFilter={fundFilter}
                      defaultFund={getDefaultFund()}
                      required={true}
                      className="w-full"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-destination-fund">
                      Fondo Destino (opcional)
                    </Label>
                    <FundFilter
                      selectedFund={editExpenseDestinationFund}
                      onFundChange={setEditExpenseDestinationFund}
                      placeholder="Seleccionar fondo destino..."
                      includeAllFunds={false}
                      className="w-full"
                      availableFunds={funds}
                    />
                    <p className="text-sm text-muted-foreground">
                      Opcional: Transfiere dinero a otro fondo. Puedes
                      seleccionar cualquier fondo disponible como destino.
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="edit-date"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editExpense?.date && "text-muted-foreground"
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
                value={editExpense?.event || ""}
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
                value={editExpense?.paymentMethod || "credit"}
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
                value={editExpense?.description || ""}
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
                value={editExpense?.amount || ""}
                onChange={(e) =>
                  setEditExpense((prev) =>
                    prev ? { ...prev, amount: e.target.value } : null
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
                setEditExpenseSourceFund(null);
                setEditExpenseDestinationFund(null);
                setEditExpenseCreditCard(null);
                setIsFundSectionOpenEdit(false);
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
