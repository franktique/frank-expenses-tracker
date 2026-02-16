import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import {
  getMockDataWithRelationships,
  ACTIVE_PERIOD,
} from '../fixtures/test-data';

// Define the BudgetContextType based on the actual context
export type BudgetContextType = {
  categories: any[];
  periods: any[];
  budgets: any[];
  incomes: any[];
  expenses: any[];
  funds: any[];
  activePeriod: any | null;
  selectedFund: any | null;
  fundFilter: string | null;
  isLoading: boolean;
  error: string | null;
  isDbInitialized: boolean;
  dbConnectionError: boolean;
  connectionErrorDetails: string | null;
  setupDatabase: () => Promise<void>;
  addCategory: (...args: any[]) => Promise<void>;
  updateCategory: (...args: any[]) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getCategoryFunds: (categoryId: string) => Promise<any[]>;
  updateCategoryFunds: (categoryId: string, fundIds: string[]) => Promise<void>;
  deleteCategoryFundRelationship: (
    categoryId: string,
    fundId: string
  ) => Promise<void>;
  getAvailableFundsForCategory: (categoryId: string) => any[];
  getDefaultFundForCategory: (
    categoryId: string,
    currentFilterFund?: any | null
  ) => any | null;
  refreshCategoryFundRelationships: () => Promise<void>;
  batchUpdateCategoryFunds: (
    updates: Array<{ categoryId: string; fundIds: string[] }>
  ) => Promise<void>;
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
    paymentMethod: any
  ) => Promise<void>;
  updateBudget: (
    id: string,
    expectedAmount: number,
    paymentMethod?: any
  ) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addIncome: (...args: any[]) => Promise<void>;
  updateIncome: (...args: any[]) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  addExpense: (...args: any[]) => Promise<void>;
  updateExpense: (...args: any[]) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addFund: (...args: any[]) => Promise<any>;
  updateFund: (...args: any[]) => Promise<any>;
  deleteFund: (id: string) => Promise<void>;
  recalculateFundBalance: (id: string) => Promise<any>;
  setSelectedFund: (fund: any | null) => void;
  setFundFilter: (filter: string | null) => void;
  getFilteredCategories: (fundId?: string) => any[];
  getFilteredIncomes: (fundId?: string) => any[];
  getFilteredExpenses: (fundId?: string) => any[];
  getDashboardData: (fundId?: string) => Promise<any>;
  getCategoryById: (id: string) => any | undefined;
  getPeriodById: (id: string) => any | undefined;
  getFundById: (id: string) => any | undefined;
  getDefaultFund: () => any | undefined;
  refreshData: () => Promise<void>;
  refreshFunds: () => Promise<void>;
  validateActivePeriodCache: () => Promise<boolean>;
};

// Create mock contexts
const BudgetContext = React.createContext<BudgetContextType | undefined>(
  undefined
);
const AuthContext = React.createContext<any>(undefined);

// Mock providers
const MockBudgetProvider: React.FC<{
  children: React.ReactNode;
  value: BudgetContextType;
}> = ({ children, value }) => (
  <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
);

const MockAuthProvider: React.FC<{ children: React.ReactNode; value: any }> = ({
  children,
  value,
}) => <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;

// Mock budget context values
export const createMockBudgetContext = (
  overrides?: Partial<BudgetContextType>
): BudgetContextType => {
  const mockData = getMockDataWithRelationships();

  return {
    // Data
    funds: mockData.funds,
    categories: mockData.categories,
    periods: mockData.periods,
    expenses: mockData.expenses,
    incomes: mockData.incomes,
    budgets: mockData.budgets,

    // Active period and filtering
    activePeriod: ACTIVE_PERIOD,
    selectedFund: null,
    fundFilter: null,

    // Loading states
    isLoading: false,
    error: null,
    isDbInitialized: true,
    dbConnectionError: false,
    connectionErrorDetails: null,

    // Database operations
    setupDatabase: jest.fn(),

    // Category operations
    addCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
    getCategoryFunds: jest.fn(),
    updateCategoryFunds: jest.fn(),
    deleteCategoryFundRelationship: jest.fn(),
    getAvailableFundsForCategory: jest.fn(() => []),
    getDefaultFundForCategory: jest.fn(() => null),
    refreshCategoryFundRelationships: jest.fn(),
    batchUpdateCategoryFunds: jest.fn(),

    // Period operations
    addPeriod: jest.fn(),
    updatePeriod: jest.fn(),
    deletePeriod: jest.fn(),
    openPeriod: jest.fn(),
    closePeriod: jest.fn(),

    // Budget operations
    addBudget: jest.fn(),
    updateBudget: jest.fn(),
    deleteBudget: jest.fn(),

    // Income operations
    addIncome: jest.fn(),
    updateIncome: jest.fn(),
    deleteIncome: jest.fn(),

    // Expense operations
    addExpense: jest.fn(),
    updateExpense: jest.fn(),
    deleteExpense: jest.fn(),

    // Fund operations
    addFund: jest.fn(),
    updateFund: jest.fn(),
    deleteFund: jest.fn(),
    recalculateFundBalance: jest.fn(),

    // Fund filtering and selection
    setSelectedFund: jest.fn(),
    setFundFilter: jest.fn(),
    getFilteredCategories: jest.fn(() => []),
    getFilteredIncomes: jest.fn(() => []),
    getFilteredExpenses: jest.fn(() => []),
    getDashboardData: jest.fn(),

    // Helper functions
    getCategoryById: jest.fn(),
    getPeriodById: jest.fn(),
    getFundById: jest.fn(),
    getDefaultFund: jest.fn(),

    // Data refresh
    refreshData: jest.fn(),
    refreshFunds: jest.fn(),
    validateActivePeriodCache: jest.fn(),

    // Override with any custom values
    ...overrides,
  };
};

// Mock auth context values
export const createMockAuthContext = (overrides?: any) => ({
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  },
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  isLoading: false,
  ...overrides,
});

// Custom render with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  budgetContextValue?: Partial<BudgetContextType>;
  authContextValue?: any;
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { budgetContextValue, authContextValue, ...renderOptions } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <MockAuthProvider value={createMockAuthContext(authContextValue)}>
      <MockBudgetProvider value={createMockBudgetContext(budgetContextValue)}>
        {children}
      </MockBudgetProvider>
    </MockAuthProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Common test helpers
export const mockFetch = (response: any, ok = true) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(response),
  });
};

export const mockFetchError = (error: string) => {
  global.fetch = jest.fn().mockRejectedValue(new Error(error));
};

// Toast mock
export const mockToast = {
  toast: jest.fn(),
  dismiss: jest.fn(),
};

// Router mock
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};

// Chart component mocks for performance
export const mockChartComponents = () => {
  jest.mock('recharts', () => ({
    BarChart: ({ children }: any) => (
      <div data-testid="bar-chart">{children}</div>
    ),
    Bar: () => <div data-testid="bar" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    LineChart: ({ children }: any) => (
      <div data-testid="line-chart">{children}</div>
    ),
    Line: () => <div data-testid="line" />,
    PieChart: ({ children }: any) => (
      <div data-testid="pie-chart">{children}</div>
    ),
    Pie: () => <div data-testid="pie" />,
    Cell: () => <div data-testid="cell" />,
  }));
};

// Wait for async operations helper
export const waitForAsyncOperations = () => {
  return new Promise((resolve) => setTimeout(resolve, 0));
};

// Form helpers
export const fillInput = async (input: HTMLElement, value: string) => {
  const { fireEvent } = await import('@testing-library/react');
  fireEvent.change(input, { target: { value } });
};

export const submitForm = async (form: HTMLElement) => {
  const { fireEvent } = await import('@testing-library/react');
  fireEvent.submit(form);
};
