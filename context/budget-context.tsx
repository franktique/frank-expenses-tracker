'use client';

import type React from 'react';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  Category,
  Period,
  Budget,
  Income,
  Expense,
  PaymentMethod,
} from '@/types/funds';
import { CreditCard, CreditCardOperationResult } from '@/types/credit-cards';
import { AppSettings } from '@/types/settings';
import { ActivePeriodStorage } from '@/lib/active-period-storage';
import { loadActivePeriod } from '@/lib/active-period-service';

export type BudgetContextType = {
  categories: Category[];
  periods: Period[];
  budgets: Budget[];
  incomes: Income[];
  expenses: Expense[];
  creditCards: CreditCard[];
  settings: AppSettings | null;
  activePeriod: Period | null;
  isLoading: boolean;
  dataLoaded: boolean; // true when all initial data has been loaded
  error: string | null;
  isDbInitialized: boolean;
  dbConnectionError: boolean;
  connectionErrorDetails: string | null;
  setupDatabase: () => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  updateCategory: (
    id: string,
    name: string
  ) => Promise<void>;
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
    event?: string
  ) => Promise<void>;
  updateIncome: (
    id: string,
    periodId: string,
    date: string,
    description: string,
    amount: number,
    event?: string
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
    sourceFundId?: string,
    destinationFundId?: string,
    creditCardId?: string,
    pending?: boolean
  ) => Promise<void>;
  updateExpense: (
    id: string,
    categoryId: string,
    date: string,
    event: string | undefined,
    paymentMethod: PaymentMethod,
    description: string,
    amount: number,
    sourceFundId?: string,
    destinationFundId?: string,
    creditCardId?: string,
    pending?: boolean
  ) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addCreditCard: (
    bankName: string,
    franchise: string,
    lastFourDigits: string
  ) => Promise<CreditCard>;
  updateCreditCard: (
    id: string,
    bankName?: string,
    franchise?: string,
    lastFourDigits?: string
  ) => Promise<CreditCard>;
  deleteCreditCard: (id: string) => Promise<void>;
  getCreditCardById: (id: string) => CreditCard | undefined;
  refreshCreditCards: () => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  getPeriodById: (id: string) => Period | undefined;
  refreshData: () => Promise<void>;
  validateActivePeriodCache: () => Promise<boolean>;
};

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activePeriod, setActivePeriod] = useState<Period | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [dbConnectionError, setDbConnectionError] = useState(false);
  const [connectionErrorDetails, setConnectionErrorDetails] = useState<
    string | null
  >(null);
  const [isActivePeriodFromCache, setIsActivePeriodFromCache] = useState(false);

  // Helper function to safely update session storage with active period
  const updateActivePeriodCache = (
    period: Period | null,
    operation: 'save' | 'clear'
  ) => {
    try {
      if (operation === 'save' && period) {
        ActivePeriodStorage.saveActivePeriod(period);
        console.log(`Saved active period to cache: ${period.name}`);
      } else if (operation === 'clear') {
        ActivePeriodStorage.clearActivePeriod();
        console.log('Cleared active period from cache');
      }
    } catch (storageError) {
      console.warn(`Failed to ${operation} active period cache:`, storageError);
      // Session storage failure is not critical - the server state is the source of truth
      // The cache will be synchronized on next page load or background sync
    }
  };

  // Check session storage for cached active period on startup
  useEffect(() => {
    const loadCachedActivePeriod = () => {
      try {
        const cachedPeriod = ActivePeriodStorage.loadActivePeriod();
        if (cachedPeriod) {
          setActivePeriod(cachedPeriod);
          setIsActivePeriodFromCache(true);
          console.log('Loaded active period from cache:', cachedPeriod.name);
        }
      } catch (error) {
        console.warn('Failed to load cached active period:', error);
        // Clear corrupted cache
        updateActivePeriodCache(null, 'clear');
      }
    };

    loadCachedActivePeriod();
  }, []);

  // Background synchronization effect
  useEffect(() => {
    if (!isDbInitialized || dbConnectionError) {
      return;
    }

    // Set up periodic background sync every 5 minutes
    const syncInterval = setInterval(
      () => {
        syncActivePeriodWithServer();
      },
      5 * 60 * 1000
    ); // 5 minutes

    // Also sync when the component mounts (after initial data load)
    if (!isLoading && activePeriod) {
      const timeoutId = setTimeout(() => {
        syncActivePeriodWithServer();
      }, 2000); // Wait 2 seconds after initial load

      return () => {
        clearInterval(syncInterval);
        clearTimeout(timeoutId);
      };
    }

    return () => {
      clearInterval(syncInterval);
    };
  }, [isDbInitialized, dbConnectionError, isLoading, activePeriod]);

  // Check if database is initialized
  useEffect(() => {
    const checkDbStatus = async () => {
      try {
        const response = await fetch('/api/check-db-status');

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
              console.error('Failed to parse error response:', textError);
            }
          }

          console.error('Database status check failed:', errorMessage);
          setDbConnectionError(true);
          setConnectionErrorDetails(errorMessage);
          setIsLoading(false);
          return;
        }

        let data;
        try {
          data = await response.json();
        } catch (err) {
          console.error('Error parsing JSON response:', err);
          setDbConnectionError(true);
          setConnectionErrorDetails('Invalid JSON response from server');
          setIsLoading(false);
          return;
        }

        if (!data.connected) {
          setDbConnectionError(true);
          setConnectionErrorDetails(
            data.error || 'Could not connect to database'
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
        console.error('Error checking database status:', err);
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

      const response = await fetch('/api/setup-db');

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
        throw new Error(data.message || 'Unknown error setting up database');
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
      setDataLoaded(false);
      return;
    }

    setIsLoading(true);
    setDataLoaded(false);
    setError(null);

    try {
      // Fetch categories
      const categoriesResponse = await fetch('/api/categories');
      if (!categoriesResponse.ok) {
        const errorText = await categoriesResponse.text();
        throw new Error(`Failed to fetch categories: ${errorText}`);
      }
      const categoriesData = await categoriesResponse.json();
      setCategories(categoriesData);

      // Fetch periods
      const periodsResponse = await fetch('/api/periods');
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

      // Set active period with session storage synchronization
      const serverActivePeriod = normalizedPeriods.find(
        (p: Period) => p.is_open || p.isOpen
      );

      // Synchronize with session storage
      if (serverActivePeriod) {
        // Check if cached period matches server state
        if (isActivePeriodFromCache && activePeriod) {
          if (activePeriod.id !== serverActivePeriod.id) {
            console.log('Active period changed on server, updating cache');
            updateActivePeriodCache(serverActivePeriod, 'save');
          } else {
            // Update cached period with latest server data
            updateActivePeriodCache(serverActivePeriod, 'save');
          }
        } else {
          // No cached period or first load, save to cache
          updateActivePeriodCache(serverActivePeriod, 'save');
        }

        setActivePeriod(serverActivePeriod);
        setIsActivePeriodFromCache(false);
      } else {
        // No active period on server, clear cache
        if (isActivePeriodFromCache || activePeriod) {
          console.log('No active period on server, clearing cache');
          updateActivePeriodCache(null, 'clear');
          setActivePeriod(null);
          setIsActivePeriodFromCache(false);
        }
      }

      // Fetch budgets
      const budgetsResponse = await fetch('/api/budgets');
      if (!budgetsResponse.ok) {
        const errorText = await budgetsResponse.text();
        throw new Error(`Failed to fetch budgets: ${errorText}`);
      }
      const budgetsData = await budgetsResponse.json();
      setBudgets(budgetsData);

      // Fetch incomes
      const incomesResponse = await fetch('/api/incomes');
      if (!incomesResponse.ok) {
        const errorText = await incomesResponse.text();
        throw new Error(`Failed to fetch incomes: ${errorText}`);
      }
      const incomesData = await incomesResponse.json();
      setIncomes(incomesData);

      // Fetch expenses
      const expensesResponse = await fetch('/api/expenses');
      if (!expensesResponse.ok) {
        const errorText = await expensesResponse.text();
        throw new Error(`Failed to fetch expenses: ${errorText}`);
      }
      const expensesData = await expensesResponse.json();
      setExpenses(expensesData);

      // Fetch credit cards
      try {
        const creditCardsResponse = await fetch('/api/credit-cards');
        if (creditCardsResponse.ok) {
          const creditCardsData = await creditCardsResponse.json();
          setCreditCards(creditCardsData);
        } else {
          // Credit cards might not be migrated yet, try migration
          try {
            const migrationResponse = await fetch('/api/migrate-credit-cards', {
              method: 'POST',
            });

            if (migrationResponse.ok) {
              // Migration successful, try fetching credit cards again
              const retryResponse = await fetch('/api/credit-cards');
              if (retryResponse.ok) {
                const creditCardsData = await retryResponse.json();
                setCreditCards(creditCardsData);
              } else {
                // If still fails, set empty array (credit cards are optional)
                setCreditCards([]);
              }
            } else {
              // Migration failed, set empty array (credit cards are optional)
              setCreditCards([]);
            }
          } catch (migrationError) {
            // Migration error, set empty array (credit cards are optional)
            setCreditCards([]);
          }
        }
      } catch (creditCardError) {
        // Credit card fetch error, set empty array (credit cards are optional)
        console.warn('Failed to fetch credit cards:', creditCardError);
        setCreditCards([]);
      }

      // Fetch settings
      try {
        const settingsResponse = await fetch('/api/settings');
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          if (settingsData.success && settingsData.settings) {
            setSettings(settingsData.settings);
          }
        } else {
          // Settings might not be initialized yet, try to set up the table
          try {
            const setupResponse = await fetch('/api/setup-settings', {
              method: 'POST',
            });
            if (setupResponse.ok) {
              // Table setup successful, try fetching settings again
              const retryResponse = await fetch('/api/settings');
              if (retryResponse.ok) {
                const settingsData = await retryResponse.json();
                if (settingsData.success && settingsData.settings) {
                  setSettings(settingsData.settings);
                }
              }
            }
          } catch (setupError) {
            console.warn('Failed to set up settings table:', setupError);
          }
        }
      } catch (settingsError) {
        console.warn('Failed to fetch settings:', settingsError);
      }

      // Mark data as loaded only when ALL data has been successfully fetched
      setDataLoaded(true);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError((err as Error).message);
      setDataLoaded(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Category functions
  const addCategory = async (name: string) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
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

  const updateCategory = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update category: ${errorText}`);
      }

      const updatedCategory = await response.json();
      setCategories(
        categories.map((cat) => (cat.id === id ? updatedCategory : cat))
      );
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
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
      const response = await fetch('/api/periods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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
        method: 'DELETE',
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
        method: 'POST',
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

      // Save new active period to session storage atomically with server state
      updateActivePeriodCache(openedPeriod, 'save');

      return openedPeriod;
    } catch (err) {
      setError((err as Error).message);
      // Revert optimistic update if there was an error
      try {
        await refreshData();
      } catch (refreshError) {
        console.error(
          'Failed to refresh data after openPeriod error:',
          refreshError
        );
        // If refresh fails, ensure session storage is consistent with the previous state
        // Since the server operation failed, we should restore the previous active period
        const previousActivePeriod = periods.find((p) => p.is_open || p.isOpen);
        if (previousActivePeriod) {
          updateActivePeriodCache(previousActivePeriod, 'save');
        } else {
          updateActivePeriodCache(null, 'clear');
        }
      }
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
        throw new Error('Period not found in local state');
      }

      // Check if period is already inactive
      if (!periodToClose.is_open && !periodToClose.isOpen) {
        throw new Error('Period is already inactive');
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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        // Handle specific error codes from the API
        const errorCode = responseData.code;
        let errorMessage = responseData.error || 'Failed to close period';

        switch (errorCode) {
          case 'PERIOD_NOT_FOUND':
            errorMessage = 'El periodo no existe o fue eliminado';
            break;
          case 'PERIOD_ALREADY_INACTIVE':
            errorMessage = 'El periodo ya está inactivo';
            break;
          case 'CONCURRENT_MODIFICATION':
            errorMessage =
              'El periodo fue modificado por otra operación. Actualizando datos...';
            // Trigger data refresh for concurrent modifications
            setTimeout(() => refreshData(), 1000);
            break;
          case 'DATABASE_CONNECTION_ERROR':
            errorMessage =
              'Error de conexión a la base de datos. Intenta nuevamente.';
            break;
          case 'DATABASE_TIMEOUT':
            errorMessage = 'La operación tardó demasiado. Intenta nuevamente.';
            break;
          case 'DATABASE_CONSTRAINT_ERROR':
            errorMessage =
              'Error de integridad de datos. Actualizando información...';
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

        // Clear active period from session storage atomically with server state
        updateActivePeriodCache(null, 'clear');
      }

      return closedPeriod;
    } catch (err) {
      console.error('Error in closePeriod:', err);

      // Set error for global error handling
      setError((err as Error).message);

      // Revert optimistic update by refreshing data
      try {
        await refreshData();
      } catch (refreshError) {
        console.error('Failed to refresh data after error:', refreshError);
        // If refresh fails, at least restore the previous state
        setPeriods(previousPeriods);
        setActivePeriod(previousActivePeriod);

        // Restore cache state atomically with rollback
        if (previousActivePeriod) {
          updateActivePeriodCache(previousActivePeriod, 'save');
        } else {
          // Ensure cache is cleared if there was no previous active period
          updateActivePeriodCache(null, 'clear');
        }
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
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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
        method: 'DELETE',
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
    event?: string
  ) => {
    try {
      const response = await fetch('/api/incomes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period_id: periodId,
          date,
          description,
          amount,
          event,
          fund_id: undefined, // Fund functionality removed
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add income: ${errorText}`);
      }

      const newIncome = await response.json();
      setIncomes([...incomes, newIncome]);
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
    event?: string
  ) => {
    try {
      const response = await fetch(`/api/incomes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period_id: periodId,
          date,
          description,
          amount,
          event,
          fund_id: undefined, // Fund functionality removed
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
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const deleteIncome = async (id: string) => {
    try {
      const response = await fetch(`/api/incomes/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete income: ${errorText}`);
      }

      setIncomes((incomes || []).filter((income) => income.id !== id));
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
    sourceFundId?: string,
    destinationFundId?: string,
    creditCardId?: string,
    pending?: boolean
  ) => {
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: categoryId,
          period_id: periodId,
          date,
          event,
          payment_method: paymentMethod,
          description,
          amount,
          source_fund_id: sourceFundId,
          destination_fund_id: destinationFundId,
          credit_card_id: creditCardId,
          pending,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add expense: ${errorText}`);
      }

      const newExpense = await response.json();
      setExpenses([...expenses, newExpense]);
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
    sourceFundId?: string,
    destinationFundId?: string,
    creditCardId?: string,
    pending?: boolean
  ) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: categoryId,
          date,
          event,
          payment_method: paymentMethod,
          description,
          amount,
          source_fund_id: sourceFundId,
          destination_fund_id: destinationFundId,
          credit_card_id: creditCardId,
          pending,
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
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete expense: ${errorText}`);
      }

      setExpenses((expenses || []).filter((expense) => expense.id !== id));
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  // Validate cached active period against server
  const validateActivePeriodCache = async (): Promise<boolean> => {
    try {
      if (!ActivePeriodStorage.isActivePeriodCached()) {
        return false;
      }

      const result = await loadActivePeriod(1, 1000);

      if (result.success) {
        const serverPeriod = result.period;
        const cachedPeriod = ActivePeriodStorage.loadActivePeriod();

        if (!cachedPeriod || cachedPeriod.id !== serverPeriod.id) {
          // Cache is invalid, update it
          updateActivePeriodCache(serverPeriod, 'save');
          setActivePeriod(serverPeriod);
          return false;
        }

        // Cache is valid, but update with latest server data
        updateActivePeriodCache(serverPeriod, 'save');
        return true;
      } else {
        // No active period on server, clear cache
        updateActivePeriodCache(null, 'clear');
        setActivePeriod(null);
        return false;
      }
    } catch (error) {
      console.warn('Cache validation failed:', error);
      return false;
    }
  };

  // Helper functions
  const getCategoryById = (id: string) => {
    return categories.find((cat) => cat.id === id);
  };

  const getPeriodById = (id: string) => {
    return periods.find((period) => period.id === id);
  };

  // Credit Card functions
  const addCreditCard = async (
    bankName: string,
    franchise: string,
    lastFourDigits: string
  ): Promise<CreditCard> => {
    try {
      const response = await fetch('/api/credit-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bank_name: bankName,
          franchise,
          last_four_digits: lastFourDigits,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add credit card: ${errorText}`);
      }

      const newCreditCard = await response.json();
      setCreditCards([...creditCards, newCreditCard]);
      return newCreditCard;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const updateCreditCard = async (
    id: string,
    bankName?: string,
    franchise?: string,
    lastFourDigits?: string
  ): Promise<CreditCard> => {
    try {
      const updateData: any = {};
      if (bankName !== undefined) updateData.bank_name = bankName;
      if (franchise !== undefined) updateData.franchise = franchise;
      if (lastFourDigits !== undefined)
        updateData.last_four_digits = lastFourDigits;

      const response = await fetch(`/api/credit-cards/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update credit card: ${errorText}`);
      }

      const updatedCreditCard = await response.json();
      setCreditCards(
        creditCards.map((card) => (card.id === id ? updatedCreditCard : card))
      );
      return updatedCreditCard;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const deleteCreditCard = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/credit-cards/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete credit card: ${errorText}`);
      }

      setCreditCards(creditCards.filter((card) => card.id !== id));
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const getCreditCardById = (id: string): CreditCard | undefined => {
    return creditCards.find((card) => card.id === id);
  };

  const refreshCreditCards = async (): Promise<void> => {
    try {
      const response = await fetch('/api/credit-cards');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to refresh credit cards: ${errorText}`);
      }

      const creditCardsData = await response.json();
      setCreditCards(creditCardsData);
    } catch (err) {
      console.error('Error refreshing credit cards:', err);
      setError((err as Error).message);
      throw err;
    }
  };

  // Background synchronization for active period
  const syncActivePeriodWithServer = async () => {
    try {
      const result = await loadActivePeriod(1, 500); // Single retry with short delay for background sync

      if (result.success) {
        const serverPeriod = result.period;

        // Check if current active period matches server
        if (!activePeriod || activePeriod.id !== serverPeriod.id) {
          console.log('Background sync: Active period changed on server');
          setActivePeriod(serverPeriod);
          updateActivePeriodCache(serverPeriod, 'save');
        } else {
          // Update cache with latest server data
          updateActivePeriodCache(serverPeriod, 'save');
        }
      } else if (result.error.type === 'no_active_period') {
        // No active period on server, clear local state
        if (activePeriod) {
          console.log(
            'Background sync: No active period on server, clearing local state'
          );
          setActivePeriod(null);
          updateActivePeriodCache(null, 'clear');
        }
      }
    } catch (error) {
      console.warn('Background sync failed:', error);
    }
  };

  return (
    <BudgetContext.Provider
      value={{
        categories,
        periods,
        budgets,
        incomes,
        expenses,
        creditCards,
        settings,
        activePeriod,
        isLoading,
        dataLoaded,
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
        addCreditCard,
        updateCreditCard,
        deleteCreditCard,
        getCreditCardById,
        refreshCreditCards,
        getCategoryById,
        getPeriodById,
        refreshData,
        validateActivePeriodCache,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}

// Re-export types for convenience
export type { PaymentMethod, Income, Period, Budget } from '@/types/funds';
