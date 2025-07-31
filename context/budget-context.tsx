"use client";

import type React from "react";

import { createContext, useContext, useEffect, useState } from "react";
import {
  Fund,
  Category,
  Period,
  Budget,
  Income,
  Expense,
  PaymentMethod,
  FundBalance,
  FundOperationResult,
  FundBalanceRecalculationResult,
} from "@/types/funds";

type BudgetContextType = {
  categories: Category[];
  periods: Period[];
  budgets: Budget[];
  incomes: Income[];
  expenses: Expense[];
  funds: Fund[];
  activePeriod: Period | null;
  selectedFund: Fund | null;
  fundFilter: string | null; // 'all' for all funds, fund_id for specific fund, null for no filter
  isLoading: boolean;
  error: string | null;
  isDbInitialized: boolean;
  dbConnectionError: boolean;
  connectionErrorDetails: string | null;
  setupDatabase: () => Promise<void>;
  addCategory: (name: string, fundId?: string) => Promise<void>;
  updateCategory: (id: string, name: string, fundId?: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addPeriod: (name: string, month: number, year: number) => Promise<void>;
  updatePeriod: (
    id: string,
    name: string,
    month: number,
    year: number
  ) => Promise<void>;
  deletePeriod: (id: string) => Promise<void>;
  openPeriod: (id: string) => Promise<void>;
  closePeriod: (id: string) => Promise<void>;
  addBudget: (
    categoryId: string,
    periodId: string,
    expectedAmount: number,
    paymentMethod: PaymentMethod
  ) => Promise<void>;
  updateBudget: (
    id: string,
    expectedAmount: number,
    paymentMethod?: PaymentMethod
  ) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addIncome: (
    periodId: string,
    date: string,
    description: string,
    amount: number,
    event?: string,
    fundId?: string
  ) => Promise<void>;
  updateIncome: (
    id: string,
    periodId: string,
    date: string,
    description: string,
    amount: number,
    event?: string,
    fundId?: string
  ) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  addExpense: (
    categoryId: string,
    periodId: string,
    date: string,
    event: string | undefined,
    paymentMethod: PaymentMethod,
    description: string,
    amount: number,
    destinationFundId?: string
  ) => Promise<void>;
  updateExpense: (
    id: string,
    categoryId: string,
    date: string,
    event: string | undefined,
    paymentMethod: PaymentMethod,
    description: string,
    amount: number,
    destinationFundId?: string
  ) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addFund: (
    name: string,
    description: string | undefined,
    initialBalance: number,
    startDate: string
  ) => Promise<Fund>;
  updateFund: (
    id: string,
    name?: string,
    description?: string,
    initialBalance?: number
  ) => Promise<Fund>;
  deleteFund: (id: string) => Promise<void>;
  recalculateFundBalance: (
    id: string
  ) => Promise<FundBalanceRecalculationResult>;
  setSelectedFund: (fund: Fund | null) => void;
  setFundFilter: (filter: string | null) => void;
  getFilteredCategories: (fundId?: string) => Category[];
  getFilteredIncomes: (fundId?: string) => Income[];
  getFilteredExpenses: (fundId?: string) => Expense[];
  getDashboardData: (fundId?: string) => Promise<any>;
  getCategoryById: (id: string) => Category | undefined;
  getPeriodById: (id: string) => Period | undefined;
  getFundById: (id: string) => Fund | undefined;
  getDefaultFund: () => Fund | undefined;
  refreshData: () => Promise<void>;
  refreshFunds: () => Promise<void>;
};

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [activePeriod, setActivePeriod] = useState<Period | null>(null);
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [fundFilter, setFundFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [dbConnectionError, setDbConnectionError] = useState(false);
  const [connectionErrorDetails, setConnectionErrorDetails] = useState<
    string | null
  >(null);

  // Initialize fund filter with default fund when funds are loaded
  useEffect(() => {
    if (funds.length > 0 && !fundFilter) {
      const defaultFund = getDefaultFund();
      if (defaultFund) {
        setFundFilter(defaultFund.id);
      }
    }
  }, [funds, fundFilter]);

  // Check if database is initialized
  useEffect(() => {
    const checkDbStatus = async () => {
      try {
        const response = await fetch("/api/check-db-status");

        // Handle non-OK responses
        if (!response.ok) {
          let errorMessage = `HTTP error ${response.status}`;

          try {
            // Try to parse as JSON first
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            // If JSON parsing fails, try to get text
            try {
              const errorText = await response.text();
              errorMessage = errorText || errorMessage;
            } catch (textError) {
              // If all else fails, use the status code
              console.error("Failed to parse error response:", textError);
            }
          }

          console.error("Database status check failed:", errorMessage);
          setDbConnectionError(true);
          setConnectionErrorDetails(errorMessage);
          setIsLoading(false);
          return;
        }

        let data;
        try {
          data = await response.json();
        } catch (err) {
          console.error("Error parsing JSON response:", err);
          setDbConnectionError(true);
          setConnectionErrorDetails("Invalid JSON response from server");
          setIsLoading(false);
          return;
        }

        if (!data.connected) {
          setDbConnectionError(true);
          setConnectionErrorDetails(
            data.error || "Could not connect to database"
          );
          setIsLoading(false);
          return;
        }

        setIsDbInitialized(data.initialized);
        setDbConnectionError(false);
        setConnectionErrorDetails(null);

        if (data.initialized) {
          refreshData();
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error checking database status:", err);
        setDbConnectionError(true);
        setConnectionErrorDetails((err as Error).message);
        setIsLoading(false);
      }
    };

    checkDbStatus();
  }, []);

  // Setup database
  const setupDatabase = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/setup-db");

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setIsDbInitialized(true);
        setDbConnectionError(false);
        setConnectionErrorDetails(null);
        await refreshData();
      } else {
        throw new Error(data.message || "Unknown error setting up database");
      }
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
      throw err;
    }
  };

  const refreshData = async () => {
    if (!isDbInitialized) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch categories
      const categoriesResponse = await fetch("/api/categories");
      if (!categoriesResponse.ok) {
        const errorText = await categoriesResponse.text();
        throw new Error(`Failed to fetch categories: ${errorText}`);
      }
      const categoriesData = await categoriesResponse.json();
      setCategories(categoriesData);

      // Fetch periods
      const periodsResponse = await fetch("/api/periods");
      if (!periodsResponse.ok) {
        const errorText = await periodsResponse.text();
        throw new Error(`Failed to fetch periods: ${errorText}`);
      }
      const periodsData = await periodsResponse.json();

      // Normalize period data to ensure consistent property names
      const normalizedPeriods = periodsData.map((period: any) => ({
        ...period,
        // Ensure both properties exist for compatibility
        is_open: period.is_open || period.isOpen || false,
        isOpen: period.is_open || period.isOpen || false,
      }));

      setPeriods(normalizedPeriods);

      // Set active period
      const active = normalizedPeriods.find(
        (p: Period) => p.is_open || p.isOpen
      );
      if (active) setActivePeriod(active);

      // Fetch budgets
      const budgetsResponse = await fetch("/api/budgets");
      if (!budgetsResponse.ok) {
        const errorText = await budgetsResponse.text();
        throw new Error(`Failed to fetch budgets: ${errorText}`);
      }
      const budgetsData = await budgetsResponse.json();
      setBudgets(budgetsData);

      // Fetch incomes
      const incomesResponse = await fetch("/api/incomes");
      if (!incomesResponse.ok) {
        const errorText = await incomesResponse.text();
        throw new Error(`Failed to fetch incomes: ${errorText}`);
      }
      const incomesData = await incomesResponse.json();
      setIncomes(incomesData);

      // Fetch expenses
      const expensesResponse = await fetch("/api/expenses");
      if (!expensesResponse.ok) {
        const errorText = await expensesResponse.text();
        throw new Error(`Failed to fetch expenses: ${errorText}`);
      }
      const expensesData = await expensesResponse.json();
      setExpenses(expensesData);

      // Fetch funds
      const fundsResponse = await fetch("/api/funds");
      if (!fundsResponse.ok) {
        // If funds fetch fails, it might be because the funds table doesn't exist
        // Try to run the migration first
        try {
          const migrationResponse = await fetch("/api/migrate-fondos", {
            method: "POST",
          });

          if (migrationResponse.ok) {
            // Migration successful, try fetching funds again
            const retryResponse = await fetch("/api/funds");
            if (!retryResponse.ok) {
              const errorText = await retryResponse.text();
              throw new Error(
                `Failed to fetch funds after migration: ${errorText}`
              );
            }
            const fundsData = await retryResponse.json();
            setFunds(fundsData);
          } else {
            const errorText = await fundsResponse.text();
            throw new Error(`Failed to fetch funds: ${errorText}`);
          }
        } catch (migrationError) {
          const errorText = await fundsResponse.text();
          throw new Error(`Failed to fetch funds: ${errorText}`);
        }
      } else {
        const fundsData = await fundsResponse.json();
        setFunds(fundsData);
      }
    } catch (err) {
      console.error("Error refreshing data:", err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Category functions
  const addCategory = async (name: string, fundId?: string) => {
    try {
      // If no fund is specified, assign to default fund
      const defaultFund = getDefaultFund();
      const finalFundId = fundId || defaultFund?.id;

      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, fund_id: finalFundId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add category: ${errorText}`);
      }

      const newCategory = await response.json();
      setCategories([...categories, newCategory]);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const updateCategory = async (id: string, name: string, fundId?: string) => {
    try {
      // If no fund is specified, assign to default fund
      const defaultFund = getDefaultFund();
      const finalFundId = fundId || defaultFund?.id;

      const response = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, fund_id: finalFundId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update category: ${errorText}`);
      }

      const updatedCategory = await response.json();
      setCategories(
        categories.map((cat) => (cat.id === id ? updatedCategory : cat))
      );

      // Refresh funds to update balances if fund assignment changed
      await refreshFunds();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete category: ${errorText}`);
      }

      setCategories((categories || []).filter((cat) => cat.id !== id));
      // Budgets and expenses will be deleted by cascade in the database
      setBudgets((budgets || []).filter((budget) => budget.category_id !== id));
      setExpenses(
        (expenses || []).filter((expense) => expense.category_id !== id)
      );
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  // Period functions
  const addPeriod = async (name: string, month: number, year: number) => {
    try {
      const response = await fetch("/api/periods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, month, year }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add period: ${errorText}`);
      }

      const newPeriod = await response.json();
      setPeriods([...periods, newPeriod]);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const updatePeriod = async (
    id: string,
    name: string,
    month: number,
    year: number
  ) => {
    try {
      const response = await fetch(`/api/periods/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, month, year }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update period: ${errorText}`);
      }

      const updatedPeriod = await response.json();
      setPeriods(
        periods.map((period) => (period.id === id ? updatedPeriod : period))
      );

      // Update active period if needed
      if (activePeriod && activePeriod.id === id) {
        setActivePeriod(updatedPeriod);
      }
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const deletePeriod = async (id: string) => {
    try {
      const response = await fetch(`/api/periods/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete period: ${errorText}`);
      }

      setPeriods((periods || []).filter((period) => period.id !== id));

      // Clear active period if it was deleted
      if (activePeriod && activePeriod.id === id) {
        setActivePeriod(null);
      }

      // Budgets and expenses will be deleted by cascade in the database
      setBudgets((budgets || []).filter((budget) => budget.period_id !== id));
      setExpenses(
        (expenses || []).filter((expense) => expense.period_id !== id)
      );
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const openPeriod = async (id: string) => {
    try {
      // Optimistic update - update UI immediately
      const periodToOpen = periods.find((p) => p.id === id);
      if (periodToOpen) {
        // Update all periods in state immediately
        const updatedPeriods = periods.map((period) => ({
          ...period,
          is_open: period.id === id,
          isOpen: period.id === id,
        }));

        setPeriods(updatedPeriods);
        setActivePeriod({ ...periodToOpen, is_open: true, isOpen: true });
      }

      // Then send request to server
      const response = await fetch(`/api/periods/open/${id}`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to open period: ${errorText}`);
      }

      const openedPeriod = await response.json();

      // Update with server response to ensure consistency
      const finalUpdatedPeriods = periods.map((period) => ({
        ...period,
        is_open: period.id === id,
        isOpen: period.id === id,
      }));

      setPeriods(finalUpdatedPeriods);
      setActivePeriod(openedPeriod);

      return openedPeriod;
    } catch (err) {
      setError((err as Error).message);
      // Revert optimistic update if there was an error
      refreshData();
      throw err;
    }
  };

  const closePeriod = async (id: string) => {
    // Store previous state for rollback
    const previousPeriods = [...periods];
    const previousActivePeriod = activePeriod;

    try {
      // Optimistic update - update UI immediately
      const periodToClose = periods.find((p) => p.id === id);
      if (!periodToClose) {
        throw new Error("Period not found in local state");
      }

      // Check if period is already inactive
      if (!periodToClose.is_open && !periodToClose.isOpen) {
        throw new Error("Period is already inactive");
      }

      // Update the specific period to be closed
      const updatedPeriods = periods.map((period) =>
        period.id === id ? { ...period, is_open: false, isOpen: false } : period
      );

      setPeriods(updatedPeriods);

      // Set activePeriod to null when a period is deactivated
      if (activePeriod && activePeriod.id === id) {
        setActivePeriod(null);
      }

      // Then send request to server
      const response = await fetch(`/api/periods/close/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        throw new Error("Invalid response from server");
      }

      if (!response.ok) {
        // Handle specific error codes from the API
        const errorCode = responseData.code;
        let errorMessage = responseData.error || "Failed to close period";

        switch (errorCode) {
          case "PERIOD_NOT_FOUND":
            errorMessage = "El periodo no existe o fue eliminado";
            break;
          case "PERIOD_ALREADY_INACTIVE":
            errorMessage = "El periodo ya está inactivo";
            break;
          case "CONCURRENT_MODIFICATION":
            errorMessage =
              "El periodo fue modificado por otra operación. Actualizando datos...";
            // Trigger data refresh for concurrent modifications
            setTimeout(() => refreshData(), 1000);
            break;
          case "DATABASE_CONNECTION_ERROR":
            errorMessage =
              "Error de conexión a la base de datos. Intenta nuevamente.";
            break;
          case "DATABASE_TIMEOUT":
            errorMessage = "La operación tardó demasiado. Intenta nuevamente.";
            break;
          case "DATABASE_CONSTRAINT_ERROR":
            errorMessage =
              "Error de integridad de datos. Actualizando información...";
            setTimeout(() => refreshData(), 1000);
            break;
          default:
            errorMessage = responseData.details || errorMessage;
        }

        const error = new Error(errorMessage);
        (error as any).code = errorCode;
        (error as any).status = response.status;
        throw error;
      }

      // Successful response - update with server data
      const closedPeriod = responseData.period || responseData;

      // Update with server response to ensure consistency
      const finalUpdatedPeriods = periods.map((period) =>
        period.id === id
          ? { ...closedPeriod, is_open: false, isOpen: false }
          : period
      );

      setPeriods(finalUpdatedPeriods);

      // Ensure activePeriod is null if this was the active period
      if (activePeriod && activePeriod.id === id) {
        setActivePeriod(null);
      }

      return closedPeriod;
    } catch (err) {
      console.error("Error in closePeriod:", err);

      // Set error for global error handling
      setError((err as Error).message);

      // Revert optimistic update by refreshing data
      try {
        await refreshData();
      } catch (refreshError) {
        console.error("Failed to refresh data after error:", refreshError);
        // If refresh fails, at least restore the previous state
        setPeriods(previousPeriods);
        setActivePeriod(previousActivePeriod);
      }

      throw err;
    }
  };

  // Budget functions
  const addBudget = async (
    categoryId: string,
    periodId: string,
    expectedAmount: number,
    paymentMethod: PaymentMethod
  ) => {
    try {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId,
          periodId,
          expectedAmount,
          paymentMethod,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add budget: ${errorText}`);
      }

      const newBudget = await response.json();

      // Check if this is an update or a new budget
      const existingIndex = budgets.findIndex(
        (b) => b.category_id === categoryId && b.period_id === periodId
      );

      if (existingIndex >= 0) {
        // Update existing budget
        setBudgets(
          budgets.map((b, i) => (i === existingIndex ? newBudget : b))
        );
      } else {
        // Add new budget
        setBudgets([...budgets, newBudget]);
      }
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const updateBudget = async (
    id: string,
    expectedAmount: number,
    paymentMethod?: PaymentMethod
  ) => {
    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expectedAmount,
          ...(paymentMethod ? { paymentMethod } : {}),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update budget: ${errorText}`);
      }

      const updatedBudget = await response.json();
      setBudgets(
        budgets.map((budget) => (budget.id === id ? updatedBudget : budget))
      );
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete budget: ${errorText}`);
      }

      setBudgets((budgets || []).filter((budget) => budget.id !== id));
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  // Income functions
  const addIncome = async (
    periodId: string,
    date: string,
    description: string,
    amount: number,
    event?: string,
    fundId?: string
  ) => {
    try {
      // If no fund is specified, assign to default fund
      const defaultFund = getDefaultFund();
      const finalFundId = fundId || defaultFund?.id;

      const response = await fetch("/api/incomes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          period_id: periodId,
          date,
          description,
          amount,
          event,
          fund_id: finalFundId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add income: ${errorText}`);
      }

      const newIncome = await response.json();
      setIncomes([...incomes, newIncome]);

      // Refresh funds to update balances
      await refreshFunds();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const updateIncome = async (
    id: string,
    periodId: string,
    date: string,
    description: string,
    amount: number,
    event?: string,
    fundId?: string
  ) => {
    try {
      // If no fund is specified, assign to default fund
      const defaultFund = getDefaultFund();
      const finalFundId = fundId || defaultFund?.id;

      const response = await fetch(`/api/incomes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          period_id: periodId,
          date,
          description,
          amount,
          event,
          fund_id: finalFundId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update income: ${errorText}`);
      }

      const updatedIncome = await response.json();
      setIncomes(
        incomes.map((income) => (income.id === id ? updatedIncome : income))
      );

      // Refresh funds to update balances
      await refreshFunds();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const deleteIncome = async (id: string) => {
    try {
      const response = await fetch(`/api/incomes/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete income: ${errorText}`);
      }

      setIncomes((incomes || []).filter((income) => income.id !== id));

      // Refresh funds to update balances
      await refreshFunds();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  // Expense functions
  const addExpense = async (
    categoryId: string,
    periodId: string,
    date: string,
    event: string | undefined,
    paymentMethod: PaymentMethod,
    description: string,
    amount: number,
    destinationFundId?: string
  ) => {
    try {
      // Validate fund transfer - prevent same fund transfers
      if (destinationFundId) {
        const category = getCategoryById(categoryId);
        if (category && category.fund_id === destinationFundId) {
          throw new Error("No se puede transferir dinero al mismo fondo");
        }
      }

      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category_id: categoryId,
          period_id: periodId,
          date,
          event,
          payment_method: paymentMethod,
          description,
          amount,
          destination_fund_id: destinationFundId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add expense: ${errorText}`);
      }

      const newExpense = await response.json();
      setExpenses([...expenses, newExpense]);

      // Refresh funds to update balances (both source and destination funds affected)
      await refreshFunds();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const updateExpense = async (
    id: string,
    categoryId: string,
    date: string,
    event: string | undefined,
    paymentMethod: PaymentMethod,
    description: string,
    amount: number,
    destinationFundId?: string
  ) => {
    try {
      // Validate fund transfer - prevent same fund transfers
      if (destinationFundId) {
        const category = getCategoryById(categoryId);
        if (category && category.fund_id === destinationFundId) {
          throw new Error("No se puede transferir dinero al mismo fondo");
        }
      }

      const response = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category_id: categoryId,
          date,
          event,
          payment_method: paymentMethod,
          description,
          amount,
          destination_fund_id: destinationFundId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update expense: ${errorText}`);
      }

      const updatedExpense = await response.json();
      setExpenses(
        expenses.map((expense) =>
          expense.id === id ? updatedExpense : expense
        )
      );

      // Refresh funds to update balances (both source and destination funds affected)
      await refreshFunds();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete expense: ${errorText}`);
      }

      setExpenses((expenses || []).filter((expense) => expense.id !== id));

      // Refresh funds to update balances
      await refreshFunds();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  // Fund functions
  const addFund = async (
    name: string,
    description: string | undefined,
    initialBalance: number,
    startDate: string
  ): Promise<Fund> => {
    try {
      const response = await fetch("/api/funds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          initial_balance: initialBalance,
          start_date: startDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to add fund: ${response.status}`
        );
      }

      const newFund = await response.json();
      setFunds([...(funds || []), newFund]);
      return newFund;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const updateFund = async (
    id: string,
    name?: string,
    description?: string,
    initialBalance?: number
  ): Promise<Fund> => {
    try {
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (initialBalance !== undefined)
        updateData.initial_balance = initialBalance;

      const response = await fetch(`/api/funds/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to update fund: ${response.status}`
        );
      }

      const updatedFund = await response.json();
      setFunds(
        (funds || []).map((fund) => (fund.id === id ? updatedFund : fund))
      );
      return updatedFund;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const deleteFund = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/funds/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to delete fund: ${response.status}`
        );
      }

      setFunds((funds || []).filter((fund) => fund.id !== id));

      // Clear selected fund if it was deleted
      if (selectedFund && selectedFund.id === id) {
        setSelectedFund(null);
      }
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const recalculateFundBalance = async (
    id: string
  ): Promise<FundBalanceRecalculationResult> => {
    try {
      const response = await fetch(`/api/funds/${id}/recalculate`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to recalculate fund balance: ${response.status}`
        );
      }

      const result = await response.json();

      // Update the fund in the local state with the new balance
      if (result.success && result.fund_id) {
        setFunds(
          funds.map((fund) =>
            fund.id === result.fund_id
              ? { ...fund, current_balance: result.new_balance }
              : fund
          )
        );
      }

      return result;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  // Fund filtering and data methods
  const getFilteredCategories = (fundId?: string): Category[] => {
    if (!categories) {
      return [];
    }
    if (!fundId || fundId === "all") {
      return categories;
    }
    return categories.filter((cat) => cat.fund_id === fundId);
  };

  const getFilteredIncomes = (fundId?: string): Income[] => {
    if (!incomes) {
      return [];
    }
    if (!fundId || fundId === "all") {
      return incomes;
    }
    return incomes.filter((income) => income.fund_id === fundId);
  };

  const getFilteredExpenses = (fundId?: string): Expense[] => {
    if (!expenses || !categories) {
      return [];
    }
    if (!fundId || fundId === "all") {
      return expenses;
    }
    // Filter expenses by categories that belong to the fund
    const fundCategoryIds = categories
      .filter((cat) => cat.fund_id === fundId)
      .map((cat) => cat.id);
    return expenses.filter((expense) =>
      fundCategoryIds.includes(expense.category_id)
    );
  };

  const getDashboardData = async (fundId?: string): Promise<any> => {
    try {
      const params = new URLSearchParams();
      if (fundId && fundId !== "all") {
        params.append("fund_id", fundId);
      }

      const response = await fetch(`/api/dashboard?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError((err as Error).message);
      throw err;
    }
  };

  const refreshFunds = async (): Promise<void> => {
    try {
      const fundsResponse = await fetch("/api/funds");
      if (!fundsResponse.ok) {
        // If funds fetch fails, it might be because the funds table doesn't exist
        // Try to run the migration first
        try {
          const migrationResponse = await fetch("/api/migrate-fondos", {
            method: "POST",
          });

          if (migrationResponse.ok) {
            // Migration successful, try fetching funds again
            const retryResponse = await fetch("/api/funds");
            if (!retryResponse.ok) {
              const errorText = await retryResponse.text();
              throw new Error(
                `Failed to fetch funds after migration: ${errorText}`
              );
            }
            const fundsData = await retryResponse.json();
            setFunds(fundsData);
          } else {
            const errorText = await fundsResponse.text();
            throw new Error(`Failed to fetch funds: ${errorText}`);
          }
        } catch (migrationError) {
          const errorText = await fundsResponse.text();
          throw new Error(`Failed to fetch funds: ${errorText}`);
        }
      } else {
        const fundsData = await fundsResponse.json();
        setFunds(fundsData);
      }
    } catch (err) {
      console.error("Error refreshing funds:", err);
      setError((err as Error).message);
      throw err;
    }
  };

  // Helper functions
  const getCategoryById = (id: string) => {
    return categories.find((cat) => cat.id === id);
  };

  const getPeriodById = (id: string) => {
    return periods.find((period) => period.id === id);
  };

  const getFundById = (id: string) => {
    return funds.find((fund) => fund.id === id);
  };

  const getDefaultFund = (): Fund | undefined => {
    return funds.find((fund) => fund.name === "Disponible");
  };

  return (
    <BudgetContext.Provider
      value={{
        categories,
        periods,
        budgets,
        incomes,
        expenses,
        funds,
        activePeriod,
        selectedFund,
        fundFilter,
        isLoading,
        error,
        isDbInitialized,
        dbConnectionError,
        connectionErrorDetails,
        setupDatabase,
        addCategory,
        updateCategory,
        deleteCategory,
        addPeriod,
        updatePeriod,
        deletePeriod,
        openPeriod,
        closePeriod,
        addBudget,
        updateBudget,
        deleteBudget,
        addIncome,
        updateIncome,
        deleteIncome,
        addExpense,
        updateExpense,
        deleteExpense,
        addFund,
        updateFund,
        deleteFund,
        recalculateFundBalance,
        setSelectedFund,
        setFundFilter,
        getFilteredCategories,
        getFilteredIncomes,
        getFilteredExpenses,
        getDashboardData,
        getCategoryById,
        getPeriodById,
        getFundById,
        getDefaultFund,
        refreshData,
        refreshFunds,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error("useBudget must be used within a BudgetProvider");
  }
  return context;
}
