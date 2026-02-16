import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BudgetsView } from '../budgets-view';
import {
  renderWithProviders,
  mockFetch,
  mockFetchError,
} from './utils/test-utils';
import {
  mockCategories,
  mockPeriods,
  mockBudgets,
  mockFunds,
} from './fixtures/test-data';
import { BudgetContextType } from './utils/test-utils';

// Mock the useToast hook
const mockToast = jest.fn();
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock formatCurrency function
jest.mock('@/lib/utils', () => ({
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
}));

// Mock the useBudget hook
let mockBudgetContext: Partial<BudgetContextType> = {};
jest.mock('@/context/budget-context', () => ({
  useBudget: () => mockBudgetContext,
}));

describe('BudgetsView', () => {
  const defaultMockBudgetContext: Partial<BudgetContextType> = {
    categories: mockCategories,
    periods: mockPeriods,
    budgets: mockBudgets,
    activePeriod: mockPeriods[0], // January 2024 (open period)
    addBudget: jest.fn(),
    updateBudget: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch({ success: true });
    // Set the mock context for each test
    mockBudgetContext = { ...defaultMockBudgetContext };
  });

  describe('Initial Rendering', () => {
    it('renders the budgets view with header', () => {
      render(<BudgetsView />);

      expect(screen.getByText('Presupuestos')).toBeInTheDocument();
      expect(
        screen.getByText(/Configura los montos presupuestados/)
      ).toBeInTheDocument();
    });

    it('shows no periods message when no periods available', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: { ...mockBudgetContext, periods: [] },
      });

      expect(
        screen.getByText('No hay periodos disponibles')
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Para configurar presupuestos, primero debes crear un periodo/
        )
      ).toBeInTheDocument();
    });

    it('shows period selector with available periods', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByText('Selecciona un periodo')).toBeInTheDocument();

      // Click to open selector
      fireEvent.click(screen.getByRole('combobox'));

      expect(screen.getByText('Enero 2024 (Activo)')).toBeInTheDocument();
      expect(screen.getByText('Febrero 2024')).toBeInTheDocument();
    });

    it('preselects active period by default', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      // The budget summary should be visible indicating a period is selected
      expect(screen.getByText('Total Presupuestado')).toBeInTheDocument();
    });
  });

  describe('Period Selection', () => {
    it('allows changing the selected period', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      // Open period selector
      fireEvent.click(screen.getByRole('combobox'));

      // Select different period
      fireEvent.click(screen.getByText('Febrero 2024'));

      // Budget summary should still be visible (even if empty)
      expect(screen.getByText('Total Presupuestado')).toBeInTheDocument();
    });

    it('shows categories table when period is selected', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByText('Categoría')).toBeInTheDocument();
      expect(screen.getByText('Efectivo')).toBeInTheDocument();
      expect(screen.getByText('Crédito')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('Acciones')).toBeInTheDocument();
    });

    it('shows help text when no period is selected', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: { ...mockBudgetContext, activePeriod: null },
      });

      expect(
        screen.getByText(
          'Selecciona un periodo para ver y configurar los presupuestos'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Budget Summary Display', () => {
    it('calculates and displays total budgeted amount', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByText('Total Presupuestado')).toBeInTheDocument();
      // Should show sum of budget amounts for the selected period
      expect(screen.getByText('$450.00')).toBeInTheDocument(); // 300 + 150 from mockBudgets
    });

    it('shows cash and credit budget breakdown', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByText('Efectivo:')).toBeInTheDocument();
      expect(screen.getByText('Crédito:')).toBeInTheDocument();
    });

    it('shows count of categories with budget', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(
        screen.getByText('2 categorías con presupuesto')
      ).toBeInTheDocument();
    });
  });

  describe('Categories Table', () => {
    it('displays all categories in alphabetical order', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const categoryNames = screen
        .getAllByRole('cell')
        .filter((cell) =>
          mockCategories.some((cat) => cell.textContent?.includes(cat.name))
        );

      expect(categoryNames).toHaveLength(mockCategories.length);
      expect(screen.getByText('Alimentación')).toBeInTheDocument();
      expect(screen.getByText('Transporte')).toBeInTheDocument();
      expect(screen.getByText('Entretenimiento')).toBeInTheDocument();
    });

    it('shows existing budget amounts for categories', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      // Budget for Alimentación (cat-1) should show $300.00
      expect(screen.getByText('$300.00')).toBeInTheDocument();
      // Budget for Transporte (cat-2) should show $150.00
      expect(screen.getByText('$150.00')).toBeInTheDocument();
    });

    it('shows $0.00 for categories without budgets', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      // Categories without budgets should show $0.00
      const zeroAmounts = screen.getAllByText('$0.00');
      expect(zeroAmounts.length).toBeGreaterThan(0);
    });

    it('shows edit buttons for cash and credit columns', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const editButtons = screen.getAllByText('✏️');
      expect(editButtons.length).toBeGreaterThan(0);
    });

    it('shows add buttons for each category', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const addButtons = screen.getAllByText('Agregar');
      expect(addButtons).toHaveLength(mockCategories.length);
    });

    it('shows empty state when no categories exist', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: { ...mockBudgetContext, categories: [] },
      });

      expect(
        screen.getByText(
          'No hay categorías. Agrega categorías en la sección de Categorías.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Edit Budget Dialog', () => {
    it('opens edit dialog when edit button is clicked', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const editButtons = screen.getAllByText('✏️');
      fireEvent.click(editButtons[0]);

      expect(screen.getByText('Establecer Presupuesto')).toBeInTheDocument();
      expect(screen.getByLabelText('Monto Presupuestado')).toBeInTheDocument();
      expect(screen.getByLabelText('Método de Pago')).toBeInTheDocument();
    });

    it('opens add dialog when add button is clicked', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const addButtons = screen.getAllByText('Agregar');
      fireEvent.click(addButtons[0]);

      expect(screen.getByText('Establecer Presupuesto')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0')).toBeInTheDocument();
    });

    it('displays correct category and period information in dialog', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const addButtons = screen.getAllByText('Agregar');
      fireEvent.click(addButtons[0]); // First category (should be Alimentación after sorting)

      expect(
        screen.getByText(/Define el monto presupuestado para/)
      ).toBeInTheDocument();
      expect(screen.getByText(/Enero 2024/)).toBeInTheDocument();
    });

    it('allows entering budget amount', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const addButtons = screen.getAllByText('Agregar');
      fireEvent.click(addButtons[0]);

      const amountInput = screen.getByLabelText('Monto Presupuestado');
      fireEvent.change(amountInput, { target: { value: '250.50' } });

      expect(amountInput).toHaveValue(250.5);
    });

    it('allows selecting payment method', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const addButtons = screen.getAllByText('Agregar');
      fireEvent.click(addButtons[0]);

      const creditRadio = screen.getByLabelText('Crédito');
      fireEvent.click(creditRadio);

      expect(creditRadio).toBeChecked();
    });

    it('closes dialog when cancel button is clicked', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const addButtons = screen.getAllByText('Agregar');
      fireEvent.click(addButtons[0]);

      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      expect(
        screen.queryByText('Establecer Presupuesto')
      ).not.toBeInTheDocument();
    });
  });

  describe('Budget Creation', () => {
    it('creates new budget successfully', async () => {
      const mockAddBudget = jest.fn();

      renderWithProviders(<BudgetsView />, {
        budgetContextValue: { ...mockBudgetContext, addBudget: mockAddBudget },
      });

      // Open add dialog
      const addButtons = screen.getAllByText('Agregar');
      fireEvent.click(addButtons[0]);

      // Fill form
      const amountInput = screen.getByLabelText('Monto Presupuestado');
      fireEvent.change(amountInput, { target: { value: '100' } });

      // Submit
      const saveButton = screen.getByText('Guardar');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockAddBudget).toHaveBeenCalledWith(
          'cat-1', // category id
          'period-1', // period id
          100, // amount
          'cash' // payment method
        );
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Presupuesto actualizado',
        description: 'El presupuesto ha sido actualizado exitosamente',
      });
    });

    it('updates existing budget successfully', async () => {
      const mockUpdateBudget = jest.fn();

      renderWithProviders(<BudgetsView />, {
        budgetContextValue: {
          ...mockBudgetContext,
          updateBudget: mockUpdateBudget,
        },
      });

      // Open edit dialog for existing budget
      const editButtons = screen.getAllByText('✏️');
      fireEvent.click(editButtons[0]);

      // Modify amount
      const amountInput = screen.getByLabelText('Monto Presupuestado');
      fireEvent.change(amountInput, { target: { value: '350' } });

      // Submit
      const saveButton = screen.getByText('Guardar');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateBudget).toHaveBeenCalledWith(
          'budget-1', // budget id
          350, // new amount
          'debit' // payment method
        );
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Presupuesto actualizado',
        description: 'El presupuesto ha sido actualizado exitosamente',
      });
    });
  });

  describe('Validation', () => {
    it('shows error for invalid amount', async () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      // Open add dialog
      const addButtons = screen.getAllByText('Agregar');
      fireEvent.click(addButtons[0]);

      // Enter invalid amount
      const amountInput = screen.getByLabelText('Monto Presupuestado');
      fireEvent.change(amountInput, { target: { value: 'invalid' } });

      // Submit
      const saveButton = screen.getByText('Guardar');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'El monto debe ser un número positivo',
          variant: 'destructive',
        });
      });
    });

    it('shows error for negative amount', async () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      // Open add dialog
      const addButtons = screen.getAllByText('Agregar');
      fireEvent.click(addButtons[0]);

      // Enter negative amount
      const amountInput = screen.getByLabelText('Monto Presupuestado');
      fireEvent.change(amountInput, { target: { value: '-50' } });

      // Submit
      const saveButton = screen.getByText('Guardar');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'El monto debe ser un número positivo',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('handles missing context data gracefully', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: {
          ...mockBudgetContext,
          categories: undefined,
          periods: undefined,
          budgets: undefined,
        },
      });

      expect(
        screen.getByText('No hay periodos disponibles')
      ).toBeInTheDocument();
    });

    it('handles empty budgets array', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: { ...mockBudgetContext, budgets: [] },
      });

      expect(screen.getByText('Total Presupuestado')).toBeInTheDocument();
      expect(screen.getByText('$0.00')).toBeInTheDocument(); // Total should be 0
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();

      const addButtons = screen.getAllByRole('button', { name: /agregar/i });
      expect(addButtons.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const periodSelector = screen.getByRole('combobox');
      periodSelector.focus();
      expect(periodSelector).toHaveFocus();

      const addButtons = screen.getAllByText('Agregar');
      addButtons[0].focus();
      expect(addButtons[0]).toHaveFocus();
    });

    it('has screen reader text for edit buttons', () => {
      renderWithProviders(<BudgetsView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getAllByText('Editar efectivo')).toHaveLength(
        mockCategories.length
      );
      expect(screen.getAllByText('Editar crédito')).toHaveLength(
        mockCategories.length
      );
    });
  });
});
