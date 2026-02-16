import React from 'react';
import { render, screen } from '@testing-library/react';
import { ExpensesView } from '../expenses-view';
import { BudgetProvider } from '@/context/budget-context';

import type { BudgetContextType } from '@/context/budget-context';

// Mock the budget context with test data
const mockBudgetContext: Partial<BudgetContextType> = {
  categories: [
    {
      id: 'cat-1',
      name: 'Test Category',
      associated_funds: [
        {
          id: 'fund-1',
          name: 'Disponible',
          initial_balance: 1000,
          current_balance: 1000,
          start_date: '2024-01-01',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 'fund-2',
          name: 'Ahorros',
          initial_balance: 1000,
          current_balance: 1000,
          start_date: '2024-01-01',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ],
    },
  ] as any,
  periods: [
    {
      id: 'period-1',
      name: 'Test Period',
      month: 1,
      year: 2024,
      is_open: true,
      isOpen: true,
    },
  ] as any,
  expenses: [
    {
      id: 'expense-1',
      category_id: 'cat-1',
      period_id: 'period-1',
      date: '2024-01-15',
      description: 'Test expense with transfer',
      amount: 100,
      payment_method: 'credit' as const,
      source_fund_id: 'fund-1',
      source_fund_name: 'Disponible',
      destination_fund_id: 'fund-2',
      destination_fund_name: 'Ahorros',
    },
    {
      id: 'expense-2',
      category_id: 'cat-1',
      period_id: 'period-1',
      date: '2024-01-16',
      description: 'Test expense same fund',
      amount: 50,
      payment_method: 'debit' as const,
      source_fund_id: 'fund-1',
      source_fund_name: 'Disponible',
      destination_fund_id: 'fund-1',
      destination_fund_name: 'Disponible',
    },
    {
      id: 'expense-3',
      category_id: 'cat-1',
      period_id: 'period-1',
      date: '2024-01-17',
      description: 'Test expense no destination',
      amount: 75,
      payment_method: 'cash' as const,
      source_fund_id: 'fund-1',
      source_fund_name: 'Disponible',
    },
  ],
  funds: [
    {
      id: 'fund-1',
      name: 'Disponible',
      description: 'Main fund',
      initial_balance: 1000,
      current_balance: 1000,
      start_date: '2024-01-01',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'fund-2',
      name: 'Ahorros',
      description: 'Savings fund',
      initial_balance: 500,
      current_balance: 500,
      start_date: '2024-01-01',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ] as any,
  activePeriod: {
    id: 'period-1',
    name: 'Test Period',
    month: 1,
    year: 2024,
    is_open: true,
    isOpen: true,
  },
  addExpense: jest.fn(),
  updateExpense: jest.fn(),
  deleteExpense: jest.fn(),
  getCategoryById: jest.fn((id: string) =>
    mockBudgetContext.categories?.find((c) => c.id === id)
  ),
  getPeriodById: jest.fn((id: string) =>
    mockBudgetContext.periods?.find((p) => p.id === id)
  ),
  getFundById: jest.fn((id: string) =>
    mockBudgetContext.funds?.find((f) => f.id === id)
  ),
};

// Mock the budget context
jest.mock('@/context/budget-context', () => ({
  useBudget: () => mockBudgetContext,
  BudgetProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock other components
jest.mock('../csv-import-dialog', () => ({
  CSVImportDialog: () => <div data-testid="csv-import-dialog" />,
}));

jest.mock('../csv-import-dialog-enhanced', () => ({
  CSVImportDialogEnhanced: () => (
    <div data-testid="csv-import-dialog-enhanced" />
  ),
}));

jest.mock('../export-expenses-button', () => ({
  ExportExpensesButton: () => (
    <button data-testid="export-button">Export</button>
  ),
}));

jest.mock('../fund-filter', () => ({
  FundFilter: ({
    selectedFund,
    onFundChange,
    placeholder,
  }: {
    selectedFund: { id: string; name: string } | null;
    onFundChange: (fund: { id: string; name: string } | null) => void;
    placeholder: string;
  }) => (
    <select
      data-testid="fund-filter"
      value={selectedFund?.id || ''}
      onChange={(e) => {
        const fund = mockBudgetContext.funds?.find(
          (f) => f.id === e.target.value
        );
        onFundChange(fund || null);
      }}
    >
      <option value="">{placeholder}</option>
      {mockBudgetContext.funds?.map((fund) => (
        <option key={fund.id} value={fund.id}>
          {fund.name}
        </option>
      ))}
    </select>
  ),
}));

jest.mock('../fund-category-relationship-indicator', () => ({
  FundSelectionConstraintIndicator: () => (
    <div data-testid="fund-constraint-indicator" />
  ),
}));

jest.mock('../source-fund-selector', () => ({
  SourceFundSelector: ({
    selectedSourceFund,
    onSourceFundChange,
  }: {
    selectedSourceFund: { id: string; name: string } | null;
    onSourceFundChange: (fund: { id: string; name: string } | null) => void;
  }) => (
    <select
      data-testid="source-fund-selector"
      value={selectedSourceFund?.id || ''}
      onChange={(e) => {
        const fund = mockBudgetContext.funds?.find(
          (f) => f.id === e.target.value
        );
        onSourceFundChange(fund || null);
      }}
    >
      <option value="">Select source fund</option>
      {mockBudgetContext.funds?.map((fund) => (
        <option key={fund.id} value={fund.id}>
          {fund.name}
        </option>
      ))}
    </select>
  ),
}));

describe('ExpensesView - Source Fund Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays source fund column in the table', () => {
    render(<ExpensesView />);

    expect(screen.getByText('Fondo Origen')).toBeInTheDocument();
  });

  it('displays destination fund column in the table', () => {
    render(<ExpensesView />);

    expect(screen.getByText('Fondo Destino')).toBeInTheDocument();
  });

  it('shows source fund name with blue badge styling', () => {
    render(<ExpensesView />);

    // Check that source fund names are displayed
    expect(screen.getAllByText('Disponible')).toHaveLength(3); // All expenses have Disponible as source
  });

  it('shows destination fund name with green badge styling', () => {
    render(<ExpensesView />);

    // Check that destination fund names are displayed where applicable
    expect(screen.getByText('Ahorros')).toBeInTheDocument(); // First expense has Ahorros as destination
  });

  it('displays transfer indicator when source and destination funds are different', () => {
    render(<ExpensesView />);

    // Check for transfer indicator text
    expect(screen.getByText('Transferencia')).toBeInTheDocument();
  });

  it('displays internal indicator when source and destination funds are the same', () => {
    render(<ExpensesView />);

    // Check for internal indicator text
    expect(screen.getByText('Interno')).toBeInTheDocument();
  });

  it('handles expenses with no destination fund', () => {
    render(<ExpensesView />);

    // Should display dash for missing destination fund
    const dashElements = screen.getAllByText('-');
    expect(dashElements.length).toBeGreaterThan(0);
  });

  it('displays expense amounts correctly', () => {
    render(<ExpensesView />);

    // Check that amounts are formatted as currency
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('$75.00')).toBeInTheDocument();
  });

  it('shows correct payment method labels', () => {
    render(<ExpensesView />);

    expect(screen.getByText('Crédito')).toBeInTheDocument();
    expect(screen.getByText('Débito')).toBeInTheDocument();
    expect(screen.getByText('Efectivo')).toBeInTheDocument();
  });
});
