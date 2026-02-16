import { Fund, Category, Period, Expense, Income, Budget } from '@/types/funds';

export const mockFunds: Fund[] = [
  {
    id: 'fund-1',
    name: 'Efectivo',
    description: 'Dinero en efectivo',
    initial_balance: 1000,
    current_balance: 1500,
    start_date: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'fund-2',
    name: 'Cuenta Bancaria',
    description: 'Cuenta corriente principal',
    initial_balance: 5000,
    current_balance: 4500,
    start_date: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'fund-3',
    name: 'Fondo Emergencia',
    description: 'Fondo para emergencias',
    initial_balance: 2000,
    current_balance: 2000,
    start_date: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Alimentación',
    associated_funds: [mockFunds[0], mockFunds[1]],
  },
  {
    id: 'cat-2',
    name: 'Transporte',
    associated_funds: [mockFunds[1]],
  },
  {
    id: 'cat-3',
    name: 'Entretenimiento',
    associated_funds: [mockFunds[0], mockFunds[1], mockFunds[2]],
  },
];

export const mockPeriods: Period[] = [
  {
    id: 'period-1',
    name: 'Enero 2024',
    month: 1,
    year: 2024,
    is_open: true,
    isOpen: true,
  },
  {
    id: 'period-2',
    name: 'Febrero 2024',
    month: 2,
    year: 2024,
    is_open: false,
    isOpen: false,
  },
];

export const mockExpenses: Expense[] = [
  {
    id: 'exp-1',
    amount: 25.5,
    description: 'Almuerzo en restaurante',
    category_id: 'cat-1',
    period_id: 'period-1',
    source_fund_id: 'fund-1',
    payment_method: 'cash',
    date: '2024-01-15',
  },
  {
    id: 'exp-2',
    amount: 45.0,
    description: 'Gasolina',
    category_id: 'cat-2',
    period_id: 'period-1',
    source_fund_id: 'fund-2',
    payment_method: 'debit',
    date: '2024-01-10',
  },
];

export const mockIncomes: Income[] = [
  {
    id: 'inc-1',
    amount: 2500,
    description: 'Salario enero',
    fund_id: 'fund-2',
    period_id: 'period-1',
    date: '2024-01-01',
  },
];

export const mockBudgets: Budget[] = [
  {
    id: 'budget-1',
    category_id: 'cat-1',
    period_id: 'period-1',
    expected_amount: 300,
    payment_method: 'debit',
  },
  {
    id: 'budget-2',
    category_id: 'cat-2',
    period_id: 'period-1',
    expected_amount: 150,
    payment_method: 'debit',
  },
];

// Helper to get mock data with relationships
export const getMockDataWithRelationships = () => {
  return {
    funds: mockFunds,
    categories: mockCategories,
    periods: mockPeriods,
    expenses: mockExpenses,
    incomes: mockIncomes,
    budgets: mockBudgets,
  };
};

// Default fund for tests
export const DEFAULT_FUND = mockFunds[0];

// Active period for tests
export const ACTIVE_PERIOD = mockPeriods[0];
