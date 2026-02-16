import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IncomesView } from '../incomes-view';
import {
  renderWithProviders,
  mockFetch,
  mockFetchError,
} from './utils/test-utils';
import { mockIncomes, mockPeriods, mockFunds } from './fixtures/test-data';
import { BudgetContextType } from './utils/test-utils';

// Mock the useToast hook
const mockToast = jest.fn();
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock utility functions
jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  formatDate: (date: Date) => date.toLocaleDateString('es-CO'),
}));

// Mock FundFilter component
jest.mock('@/components/fund-filter', () => ({
  FundFilter: ({ selectedFund, onFundChange, placeholder }: any) => (
    <select
      data-testid="fund-filter"
      value={selectedFund?.id || ''}
      onChange={(e) => {
        const fund = mockFunds.find((f) => f.id === e.target.value);
        onFundChange(fund || null);
      }}
    >
      <option value="">{placeholder}</option>
      {mockFunds.map((fund) => (
        <option key={fund.id} value={fund.id}>
          {fund.name}
        </option>
      ))}
    </select>
  ),
}));

// Mock Calendar component
jest.mock('@/components/ui/calendar', () => ({
  Calendar: ({ selected, onSelect }: any) => (
    <div data-testid="calendar">
      <button onClick={() => onSelect(new Date('2024-01-15'))}>
        Select Date
      </button>
      <span>Selected: {selected?.toISOString()}</span>
    </div>
  ),
}));

describe('IncomesView', () => {
  const mockBudgetContext: Partial<BudgetContextType> = {
    periods: mockPeriods,
    incomes: mockIncomes,
    funds: mockFunds,
    activePeriod: mockPeriods[0], // January 2024 (open period)
    addIncome: jest.fn(),
    updateIncome: jest.fn(),
    deleteIncome: jest.fn(),
    getFundById: jest.fn((id) => mockFunds.find((f) => f.id === id)),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch({ success: true });
  });

  describe('Initial Rendering', () => {
    it('renders the incomes view with header', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByText('Ingresos')).toBeInTheDocument();
      expect(screen.getByText('Nuevo Ingreso')).toBeInTheDocument();
    });

    it('shows no periods warning when no periods available', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: { ...mockBudgetContext, periods: [] },
      });

      expect(
        screen.getByText('No hay periodos disponibles')
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Para registrar ingresos, primero debes crear un periodo/
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Ir a Periodos')).toBeInTheDocument();
    });

    it('renders incomes table with headers', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByText('Fecha')).toBeInTheDocument();
      expect(screen.getByText('Descripción')).toBeInTheDocument();
      expect(screen.getByText('Evento')).toBeInTheDocument();
      expect(screen.getByText('Periodo')).toBeInTheDocument();
      expect(screen.getByText('Fondo')).toBeInTheDocument();
      expect(screen.getByText('Monto')).toBeInTheDocument();
      expect(screen.getByText('Acciones')).toBeInTheDocument();
    });

    it('displays active period information', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByText('Registro de Ingresos')).toBeInTheDocument();
      expect(
        screen.getByText('Ingresos del periodo: Enero 2024')
      ).toBeInTheDocument();
    });

    it('shows all incomes when no active period', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: { ...mockBudgetContext, activePeriod: null },
      });

      expect(
        screen.getByText('Historial de todos los ingresos registrados')
      ).toBeInTheDocument();
    });
  });

  describe('Income Data Display', () => {
    it('displays filtered incomes for active period', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      // Should show income from active period
      expect(screen.getByText('Salario enero')).toBeInTheDocument();
      expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    });

    it('sorts incomes by date (newest first)', () => {
      const multipleIncomes = [
        ...mockIncomes,
        {
          id: 'inc-2',
          amount: 1000,
          description: 'Bonus',
          fund_id: 'fund-1',
          period_id: 'period-1',
          date: '2024-01-15',
        },
      ];

      renderWithProviders(<IncomesView />, {
        budgetContextValue: { ...mockBudgetContext, incomes: multipleIncomes },
      });

      const rows = screen.getAllByRole('row');
      // Should have header row + 2 income rows
      expect(rows).toHaveLength(3);
    });

    it('displays fund information correctly', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      // Should show fund name or default "Disponible"
      expect(screen.getByText('Disponible')).toBeInTheDocument();
    });

    it('formats dates correctly avoiding timezone issues', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      // Should format dates properly
      expect(screen.getByText(/1\/1\/2024/)).toBeInTheDocument();
    });

    it('shows empty state when no incomes exist', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: { ...mockBudgetContext, incomes: [] },
      });

      expect(
        screen.getByText(
          'No hay ingresos registrados. Agrega un nuevo ingreso para comenzar.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Add Income Dialog', () => {
    it('opens add income dialog when button is clicked', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText('Nuevo Ingreso'));

      expect(screen.getByText('Registrar Ingreso')).toBeInTheDocument();
      expect(screen.getByLabelText('Periodo *')).toBeInTheDocument();
      expect(screen.getByLabelText('Fecha *')).toBeInTheDocument();
      expect(screen.getByLabelText('Descripción *')).toBeInTheDocument();
      expect(screen.getByLabelText('Monto *')).toBeInTheDocument();
      expect(screen.getByLabelText('Evento (opcional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Fondo (opcional)')).toBeInTheDocument();
    });

    it('preselects active period', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText('Nuevo Ingreso'));

      // Active period should be preselected
      expect(screen.getByDisplayValue('period-1')).toBeInTheDocument();
    });

    it('shows period selector with available periods', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText('Nuevo Ingreso'));

      // Open period selector
      fireEvent.click(screen.getByText('Selecciona un periodo'));

      expect(screen.getByText('Enero 2024 (Activo)')).toBeInTheDocument();
      expect(screen.getByText('Febrero 2024')).toBeInTheDocument();
    });

    it('allows entering income information', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText('Nuevo Ingreso'));

      const descriptionInput = screen.getByLabelText('Descripción *');
      const amountInput = screen.getByLabelText('Monto *');
      const eventInput = screen.getByLabelText('Evento (opcional)');

      fireEvent.change(descriptionInput, { target: { value: 'Test Income' } });
      fireEvent.change(amountInput, { target: { value: '1500' } });
      fireEvent.change(eventInput, { target: { value: 'Test Event' } });

      expect(descriptionInput).toHaveValue('Test Income');
      expect(amountInput).toHaveValue(1500);
      expect(eventInput).toHaveValue('Test Event');
    });

    it('allows selecting date from calendar', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText('Nuevo Ingreso'));

      // Open calendar
      fireEvent.click(screen.getByText('Selecciona una fecha'));

      expect(screen.getByTestId('calendar')).toBeInTheDocument();

      // Select a date
      fireEvent.click(screen.getByText('Select Date'));

      // Calendar should close and date should be selected
      expect(screen.queryByTestId('calendar')).not.toBeInTheDocument();
    });

    it('allows selecting fund', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText('Nuevo Ingreso'));

      const fundFilter = screen.getByTestId('fund-filter');
      fireEvent.change(fundFilter, { target: { value: 'fund-1' } });

      expect(fundFilter).toHaveValue('fund-1');
    });

    it('shows default fund information', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText('Nuevo Ingreso'));

      expect(
        screen.getByText(
          /Si no seleccionas un fondo, se asignará al fondo "Disponible"/
        )
      ).toBeInTheDocument();
    });

    it('shows active period fallback information', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText('Nuevo Ingreso'));

      // Clear period selection to trigger fallback message
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });

      expect(
        screen.getByText('Se usará el periodo activo: Enero 2024')
      ).toBeInTheDocument();
    });
  });

  describe('Income Creation', () => {
    it('creates income successfully', async () => {
      const mockAddIncome = jest.fn().mockResolvedValue({});

      renderWithProviders(<IncomesView />, {
        budgetContextValue: { ...mockBudgetContext, addIncome: mockAddIncome },
      });

      fireEvent.click(screen.getByText('Nuevo Ingreso'));

      // Fill form
      fireEvent.change(screen.getByLabelText('Descripción *'), {
        target: { value: 'Test Income' },
      });
      fireEvent.change(screen.getByLabelText('Monto *'), {
        target: { value: '1500' },
      });

      // Submit
      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockAddIncome).toHaveBeenCalledWith(
          'period-1', // active period
          expect.any(String), // date ISO string
          'Test Income',
          1500,
          undefined, // no event
          undefined // no fund selected
        );
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Ingreso agregado',
        description: 'El ingreso ha sido registrado exitosamente',
      });
    });

    it('creates income with all fields filled', async () => {
      const mockAddIncome = jest.fn().mockResolvedValue({});

      renderWithProviders(<IncomesView />, {
        budgetContextValue: { ...mockBudgetContext, addIncome: mockAddIncome },
      });

      fireEvent.click(screen.getByText('Nuevo Ingreso'));

      // Fill all fields
      fireEvent.change(screen.getByLabelText('Descripción *'), {
        target: { value: 'Test Income' },
      });
      fireEvent.change(screen.getByLabelText('Monto *'), {
        target: { value: '1500' },
      });
      fireEvent.change(screen.getByLabelText('Evento (opcional)'), {
        target: { value: 'Test Event' },
      });

      // Select fund
      fireEvent.change(screen.getByTestId('fund-filter'), {
        target: { value: 'fund-1' },
      });

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockAddIncome).toHaveBeenCalledWith(
          'period-1',
          expect.any(String),
          'Test Income',
          1500,
          'Test Event',
          'fund-1'
        );
      });
    });

    it('resets form after successful creation', async () => {
      const mockAddIncome = jest.fn().mockResolvedValue({});

      renderWithProviders(<IncomesView />, {
        budgetContextValue: { ...mockBudgetContext, addIncome: mockAddIncome },
      });

      fireEvent.click(screen.getByText('Nuevo Ingreso'));

      fireEvent.change(screen.getByLabelText('Descripción *'), {
        target: { value: 'Test Income' },
      });
      fireEvent.change(screen.getByLabelText('Monto *'), {
        target: { value: '1500' },
      });

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockAddIncome).toHaveBeenCalled();
      });

      // Dialog should close and reopen with empty form
      fireEvent.click(screen.getByText('Nuevo Ingreso'));

      expect(screen.getByLabelText('Descripción *')).toHaveValue('');
      expect(screen.getByLabelText('Monto *')).toHaveValue('');
    });

    it('handles creation errors', async () => {
      const mockAddIncome = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      renderWithProviders(<IncomesView />, {
        budgetContextValue: { ...mockBudgetContext, addIncome: mockAddIncome },
      });

      fireEvent.click(screen.getByText('Nuevo Ingreso'));

      fireEvent.change(screen.getByLabelText('Descripción *'), {
        target: { value: 'Test Income' },
      });
      fireEvent.change(screen.getByLabelText('Monto *'), {
        target: { value: '1500' },
      });

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Error al agregar ingreso: Database error',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Income Validation', () => {
    it('validates required fields', async () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText('Nuevo Ingreso'));
      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Fecha, descripción y monto son obligatorios',
          variant: 'destructive',
        });
      });
    });

    it('validates positive amount', async () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText('Nuevo Ingreso'));

      fireEvent.change(screen.getByLabelText('Descripción *'), {
        target: { value: 'Test Income' },
      });
      fireEvent.change(screen.getByLabelText('Monto *'), {
        target: { value: '-100' },
      });

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'El monto debe ser un número positivo',
          variant: 'destructive',
        });
      });
    });

    it('validates numeric amount', async () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText('Nuevo Ingreso'));

      fireEvent.change(screen.getByLabelText('Descripción *'), {
        target: { value: 'Test Income' },
      });
      fireEvent.change(screen.getByLabelText('Monto *'), {
        target: { value: 'invalid' },
      });

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'El monto debe ser un número positivo',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Income Editing', () => {
    it('opens edit dialog when edit button is clicked', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      const editButtons = screen.getAllByText('Editar');
      fireEvent.click(editButtons[0]);

      expect(screen.getByText('Editar Ingreso')).toBeInTheDocument();
      expect(
        screen.getByText('Actualiza los detalles del ingreso')
      ).toBeInTheDocument();
    });

    it('populates edit form with existing income data', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      const editButtons = screen.getAllByText('Editar');
      fireEvent.click(editButtons[0]);

      expect(screen.getByDisplayValue('Salario enero')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2500')).toBeInTheDocument();
    });

    it('updates income successfully', async () => {
      const mockUpdateIncome = jest.fn().mockResolvedValue({});

      renderWithProviders(<IncomesView />, {
        budgetContextValue: {
          ...mockBudgetContext,
          updateIncome: mockUpdateIncome,
        },
      });

      const editButtons = screen.getAllByText('Editar');
      fireEvent.click(editButtons[0]);

      fireEvent.change(screen.getByDisplayValue('Salario enero'), {
        target: { value: 'Salario actualizado' },
      });

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockUpdateIncome).toHaveBeenCalledWith(
          'inc-1',
          'period-1',
          expect.any(String),
          'Salario actualizado',
          2500,
          undefined,
          undefined
        );
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Ingreso actualizado',
        description: 'El ingreso ha sido actualizado exitosamente',
      });
    });

    it('validates edit form data', async () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      const editButtons = screen.getAllByText('Editar');
      fireEvent.click(editButtons[0]);

      // Clear required fields
      fireEvent.change(screen.getByDisplayValue('Salario enero'), {
        target: { value: '' },
      });

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Fecha, descripción y monto son obligatorios',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Income Deletion', () => {
    it('opens delete dialog when delete button is clicked', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      const deleteButtons = screen.getAllByText('Eliminar');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Eliminar Ingreso')).toBeInTheDocument();
      expect(
        screen.getByText(/Esta acción no se puede deshacer/)
      ).toBeInTheDocument();
    });

    it('deletes income successfully', async () => {
      const mockDeleteIncome = jest.fn().mockResolvedValue({});

      renderWithProviders(<IncomesView />, {
        budgetContextValue: {
          ...mockBudgetContext,
          deleteIncome: mockDeleteIncome,
        },
      });

      const deleteButtons = screen.getAllByText('Eliminar');
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getAllByText('Eliminar')[1]); // Confirm button

      await waitFor(() => {
        expect(mockDeleteIncome).toHaveBeenCalledWith('inc-1');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Ingreso eliminado',
        description: 'El ingreso ha sido eliminado exitosamente',
      });
    });

    it('handles deletion errors', async () => {
      const mockDeleteIncome = jest
        .fn()
        .mockRejectedValue(new Error('Cannot delete'));

      renderWithProviders(<IncomesView />, {
        budgetContextValue: {
          ...mockBudgetContext,
          deleteIncome: mockDeleteIncome,
        },
      });

      const deleteButtons = screen.getAllByText('Eliminar');
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getAllByText('Eliminar')[1]);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Error al eliminar ingreso: Cannot delete',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Loading States', () => {
    it('disables buttons during submission', async () => {
      const mockAddIncome = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 1000))
        );

      renderWithProviders(<IncomesView />, {
        budgetContextValue: { ...mockBudgetContext, addIncome: mockAddIncome },
      });

      fireEvent.click(screen.getByText('Nuevo Ingreso'));

      fireEvent.change(screen.getByLabelText('Descripción *'), {
        target: { value: 'Test Income' },
      });
      fireEvent.change(screen.getByLabelText('Monto *'), {
        target: { value: '1500' },
      });

      fireEvent.click(screen.getByText('Guardar'));

      expect(screen.getByText('Guardando...')).toBeInTheDocument();
      expect(screen.getByText('Guardando...')).toBeDisabled();
      expect(screen.getByText('Cancelar')).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('handles missing context data gracefully', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: {
          ...mockBudgetContext,
          incomes: undefined,
          periods: undefined,
        },
      });

      expect(
        screen.getByText('No hay periodos disponibles')
      ).toBeInTheDocument();
    });

    it('handles empty arrays gracefully', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: {
          ...mockBudgetContext,
          incomes: [],
        },
      });

      expect(
        screen.getByText(
          'No hay ingresos registrados. Agrega un nuevo ingreso para comenzar.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /nuevo ingreso/i })
      ).toBeInTheDocument();

      const actionButtons = screen.getAllByRole('button', {
        name: /editar|eliminar/i,
      });
      expect(actionButtons.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', () => {
      renderWithProviders(<IncomesView />, {
        budgetContextValue: mockBudgetContext,
      });

      const newIncomeButton = screen.getByText('Nuevo Ingreso');
      newIncomeButton.focus();
      expect(newIncomeButton).toHaveFocus();
    });
  });
});
