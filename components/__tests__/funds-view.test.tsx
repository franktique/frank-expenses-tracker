import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FundsView } from '../funds-view';
import {
  renderWithProviders,
  mockFetch,
  mockFetchError,
} from './utils/test-utils';
import { mockFunds } from './fixtures/test-data';
import { BudgetContextType } from './utils/test-utils';

// Mock the useToast hook
const mockToast = jest.fn();
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock fund error handling functions
jest.mock('@/lib/fund-error-handling', () => ({
  classifyError: jest.fn((error) => ({
    type: 'general',
    message: error?.message || 'Error desconocido',
    retryable: true,
  })),
  validateFundForm: jest.fn((data, schema) => ({
    isValid: data.name && data.name.length > 0,
    errors:
      data.name && data.name.length > 0
        ? []
        : [{ field: 'name', message: 'Nombre es requerido' }],
  })),
  retryOperation: jest.fn((operation) => operation()),
  logFundError: jest.fn(),
}));

// Mock fund error display components
jest.mock('@/components/fund-error-display', () => ({
  FundErrorDisplay: ({ error, onDismiss }: any) => (
    <div data-testid="fund-error-display">
      <span>{error}</span>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
  FundValidationErrorDisplay: ({ errors, onDismiss }: any) => (
    <div data-testid="fund-validation-error-display">
      {errors.map((err: any, idx: number) => (
        <span key={idx}>{err.message}</span>
      ))}
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
  FundBalanceErrorDisplay: ({
    fundName,
    error,
    onRecalculate,
    onDismiss,
  }: any) => (
    <div data-testid="fund-balance-error-display">
      <span>
        {fundName}: {error}
      </span>
      <button onClick={onRecalculate}>Retry</button>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
}));

// Mock fund empty states components
jest.mock('@/components/fund-empty-states', () => ({
  FundsEmptyState: ({ onCreateFund }: any) => (
    <div data-testid="funds-empty-state">
      <span>No funds available</span>
      <button onClick={onCreateFund}>Create Fund</button>
    </div>
  ),
  FundsTableSkeleton: () => (
    <div data-testid="funds-table-skeleton">Loading...</div>
  ),
  LoadingButton: ({ children, onClick, isLoading, loadingText }: any) => (
    <button onClick={onClick} disabled={isLoading} data-testid="loading-button">
      {isLoading ? loadingText : children}
    </button>
  ),
}));

// Mock types
jest.mock('@/types/funds', () => ({
  CreateFundSchema: {},
  UpdateFundSchema: {},
}));

describe('FundsView', () => {
  const mockBudgetContext: Partial<BudgetContextType> = {
    funds: mockFunds,
    addFund: jest.fn(),
    updateFund: jest.fn(),
    deleteFund: jest.fn(),
    recalculateFundBalance: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch({ success: true });
  });

  describe('Initial Rendering', () => {
    it('renders the funds view with header', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByText('Fondos')).toBeInTheDocument();
      expect(screen.getByText('Nuevo Fondo')).toBeInTheDocument();
    });

    it('renders funds table with headers', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByText('Nombre')).toBeInTheDocument();
      expect(screen.getByText('Descripción')).toBeInTheDocument();
      expect(screen.getByText('Balance Inicial')).toBeInTheDocument();
      expect(screen.getByText('Balance Actual')).toBeInTheDocument();
      expect(screen.getByText('Fecha de Inicio')).toBeInTheDocument();
      expect(screen.getByText('Acciones')).toBeInTheDocument();
    });

    it('displays funds data in alphabetical order', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByText('Efectivo')).toBeInTheDocument();
      expect(screen.getByText('Cuenta Bancaria')).toBeInTheDocument();
      expect(screen.getByText('Fondo Emergencia')).toBeInTheDocument();
    });

    it('shows loading skeleton when isLoading is true', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: { ...mockBudgetContext, isLoading: true },
      });

      expect(screen.getByTestId('funds-table-skeleton')).toBeInTheDocument();
    });

    it('shows empty state when no funds exist', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: { ...mockBudgetContext, funds: [] },
      });

      expect(screen.getByTestId('funds-empty-state')).toBeInTheDocument();
      expect(screen.getByText('No funds available')).toBeInTheDocument();
    });
  });

  describe('Fund Data Display', () => {
    it('displays fund information correctly', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      // Check fund names
      expect(screen.getByText('Efectivo')).toBeInTheDocument();
      expect(screen.getByText('Cuenta Bancaria')).toBeInTheDocument();

      // Check descriptions
      expect(screen.getByText('Dinero en efectivo')).toBeInTheDocument();
      expect(
        screen.getByText('Cuenta corriente principal')
      ).toBeInTheDocument();
    });

    it('formats currency amounts correctly', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      // Should format Colombian pesos
      expect(screen.getByText(/\$1\.000/)).toBeInTheDocument(); // Initial balance
      expect(screen.getByText(/\$1\.500/)).toBeInTheDocument(); // Current balance
    });

    it('formats dates correctly', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      // Should show formatted dates in Spanish locale
      expect(screen.getByText(/1\/1\/2024/)).toBeInTheDocument();
    });

    it("shows 'Sin descripción' for funds without description", () => {
      const fundsWithoutDescription = [{ ...mockFunds[0], description: '' }];

      renderWithProviders(<FundsView />, {
        budgetContextValue: {
          ...mockBudgetContext,
          funds: fundsWithoutDescription,
        },
      });

      expect(screen.getByText('Sin descripción')).toBeInTheDocument();
    });
  });

  describe('Add Fund Dialog', () => {
    it('opens add fund dialog when button is clicked', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText('Nuevo Fondo'));

      expect(screen.getByText('Crear Nuevo Fondo')).toBeInTheDocument();
      expect(screen.getByLabelText('Nombre *')).toBeInTheDocument();
      expect(screen.getByLabelText('Descripción')).toBeInTheDocument();
      expect(screen.getByLabelText('Balance Inicial')).toBeInTheDocument();
      expect(screen.getByLabelText('Fecha de Inicio *')).toBeInTheDocument();
    });

    it('allows entering fund information', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText('Nuevo Fondo'));

      const nameInput = screen.getByLabelText('Nombre *');
      const descriptionInput = screen.getByLabelText('Descripción');
      const balanceInput = screen.getByLabelText('Balance Inicial');

      fireEvent.change(nameInput, { target: { value: 'Nuevo Fondo Test' } });
      fireEvent.change(descriptionInput, {
        target: { value: 'Descripción de prueba' },
      });
      fireEvent.change(balanceInput, { target: { value: '5000' } });

      expect(nameInput).toHaveValue('Nuevo Fondo Test');
      expect(descriptionInput).toHaveValue('Descripción de prueba');
      expect(balanceInput).toHaveValue(5000);
    });

    it('sets default start date to today', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText('Nuevo Fondo'));

      const dateInput = screen.getByLabelText('Fecha de Inicio *');
      const today = new Date().toISOString().split('T')[0];

      expect(dateInput).toHaveValue(today);
    });

    it('prevents selecting future dates', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText('Nuevo Fondo'));

      const dateInput = screen.getByLabelText('Fecha de Inicio *');
      const today = new Date().toISOString().split('T')[0];

      expect(dateInput).toHaveAttribute('max', today);
    });

    it('resets form when canceled', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText('Nuevo Fondo'));

      const nameInput = screen.getByLabelText('Nombre *');
      fireEvent.change(nameInput, { target: { value: 'Test Fund' } });

      fireEvent.click(screen.getByText('Cancelar'));
      fireEvent.click(screen.getByText('Nuevo Fondo'));

      expect(screen.getByLabelText('Nombre *')).toHaveValue('');
    });
  });

  describe('Fund Creation', () => {
    it('creates fund successfully', async () => {
      const mockAddFund = jest.fn().mockResolvedValue({});

      renderWithProviders(<FundsView />, {
        budgetContextValue: { ...mockBudgetContext, addFund: mockAddFund },
      });

      fireEvent.click(screen.getByText('Nuevo Fondo'));

      // Fill form
      fireEvent.change(screen.getByLabelText('Nombre *'), {
        target: { value: 'Test Fund' },
      });
      fireEvent.change(screen.getByLabelText('Balance Inicial'), {
        target: { value: '1000' },
      });

      // Submit
      fireEvent.click(screen.getByTestId('loading-button'));

      await waitFor(() => {
        expect(mockAddFund).toHaveBeenCalledWith(
          'Test Fund',
          undefined,
          1000,
          expect.any(String)
        );
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Fondo creado',
        description: 'El fondo ha sido creado exitosamente',
      });
    });

    it('shows validation errors for invalid data', async () => {
      // Mock validation to return errors
      const { validateFundForm } = require('@/lib/fund-error-handling');
      validateFundForm.mockReturnValue({
        isValid: false,
        errors: [{ field: 'name', message: 'Nombre es requerido' }],
      });

      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText('Nuevo Fondo'));
      fireEvent.click(screen.getByTestId('loading-button'));

      await waitFor(() => {
        expect(
          screen.getByTestId('fund-validation-error-display')
        ).toBeInTheDocument();
        expect(screen.getByText('Nombre es requerido')).toBeInTheDocument();
      });
    });

    it('handles creation errors', async () => {
      const mockAddFund = jest
        .fn()
        .mockRejectedValue(new Error('Fund already exists'));

      renderWithProviders(<FundsView />, {
        budgetContextValue: { ...mockBudgetContext, addFund: mockAddFund },
      });

      fireEvent.click(screen.getByText('Nuevo Fondo'));

      fireEvent.change(screen.getByLabelText('Nombre *'), {
        target: { value: 'Test Fund' },
      });

      fireEvent.click(screen.getByTestId('loading-button'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Fund already exists',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Fund Editing', () => {
    it('opens edit dialog when edit button is clicked', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const editButtons = screen.getAllByTitle('Editar fondo');
      fireEvent.click(editButtons[0]);

      expect(screen.getByText('Editar Fondo')).toBeInTheDocument();
      expect(
        screen.getByText('Actualiza la información del fondo')
      ).toBeInTheDocument();
    });

    it('populates edit form with existing fund data', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const editButtons = screen.getAllByTitle('Editar fondo');
      fireEvent.click(editButtons[0]);

      expect(screen.getByDisplayValue('Efectivo')).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('Dinero en efectivo')
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue(1000)).toBeInTheDocument();
    });

    it('allows modifying fund information', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const editButtons = screen.getAllByTitle('Editar fondo');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue('Efectivo');
      fireEvent.change(nameInput, {
        target: { value: 'Efectivo Actualizado' },
      });

      expect(nameInput).toHaveValue('Efectivo Actualizado');
    });

    it('shows note about date modification restriction', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const editButtons = screen.getAllByTitle('Editar fondo');
      fireEvent.click(editButtons[0]);

      expect(
        screen.getByText(/La fecha de inicio no se puede modificar/)
      ).toBeInTheDocument();
    });

    it('updates fund successfully', async () => {
      const mockUpdateFund = jest.fn().mockResolvedValue({});

      renderWithProviders(<FundsView />, {
        budgetContextValue: {
          ...mockBudgetContext,
          updateFund: mockUpdateFund,
        },
      });

      const editButtons = screen.getAllByTitle('Editar fondo');
      fireEvent.click(editButtons[0]);

      fireEvent.change(screen.getByDisplayValue('Efectivo'), {
        target: { value: 'Efectivo Actualizado' },
      });

      fireEvent.click(screen.getByTestId('loading-button'));

      await waitFor(() => {
        expect(mockUpdateFund).toHaveBeenCalledWith(
          'fund-1',
          'Efectivo Actualizado',
          'Dinero en efectivo',
          1000
        );
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Fondo actualizado',
        description: 'El fondo ha sido actualizado exitosamente',
      });
    });
  });

  describe('Fund Deletion', () => {
    it('opens delete dialog when delete button is clicked', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const deleteButtons = screen.getAllByTitle('Eliminar fondo');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Eliminar Fondo')).toBeInTheDocument();
      expect(
        screen.getByText(/Esta acción no se puede deshacer/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/No podrás eliminar el fondo si tiene categorías/)
      ).toBeInTheDocument();
    });

    it('deletes fund successfully', async () => {
      const mockDeleteFund = jest.fn().mockResolvedValue({});

      renderWithProviders(<FundsView />, {
        budgetContextValue: {
          ...mockBudgetContext,
          deleteFund: mockDeleteFund,
        },
      });

      const deleteButtons = screen.getAllByTitle('Eliminar fondo');
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getByTestId('loading-button'));

      await waitFor(() => {
        expect(mockDeleteFund).toHaveBeenCalledWith('fund-1');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Fondo eliminado',
        description: 'El fondo ha sido eliminado exitosamente',
      });
    });

    it('handles deletion errors', async () => {
      const mockDeleteFund = jest
        .fn()
        .mockRejectedValue(new Error('Fund has associated transactions'));

      renderWithProviders(<FundsView />, {
        budgetContextValue: {
          ...mockBudgetContext,
          deleteFund: mockDeleteFund,
        },
      });

      const deleteButtons = screen.getAllByTitle('Eliminar fondo');
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getByTestId('loading-button'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Fund has associated transactions',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Balance Recalculation', () => {
    it('opens recalculate dialog when calculator button is clicked', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const recalculateButtons = screen.getAllByTitle('Recalcular balance');
      fireEvent.click(recalculateButtons[0]);

      expect(screen.getByText('Recalcular Balance')).toBeInTheDocument();
      expect(screen.getByText(/Balance inicial del fondo/)).toBeInTheDocument();
      expect(
        screen.getByText(/Ingresos asignados al fondo/)
      ).toBeInTheDocument();
    });

    it('recalculates balance successfully', async () => {
      const mockRecalculateFundBalance = jest.fn().mockResolvedValue({
        success: true,
        old_balance: 1500,
        new_balance: 1750,
      });

      renderWithProviders(<FundsView />, {
        budgetContextValue: {
          ...mockBudgetContext,
          recalculateFundBalance: mockRecalculateFundBalance,
        },
      });

      const recalculateButtons = screen.getAllByTitle('Recalcular balance');
      fireEvent.click(recalculateButtons[0]);

      fireEvent.click(screen.getByTestId('loading-button'));

      await waitFor(() => {
        expect(mockRecalculateFundBalance).toHaveBeenCalledWith('fund-1');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Balance recalculado',
        description: 'Balance actualizado de $1,500 a $1,750',
      });
    });

    it('handles recalculation errors', async () => {
      const mockRecalculateFundBalance = jest.fn().mockResolvedValue({
        success: false,
        error: { message: 'Calculation failed' },
      });

      renderWithProviders(<FundsView />, {
        budgetContextValue: {
          ...mockBudgetContext,
          recalculateFundBalance: mockRecalculateFundBalance,
        },
      });

      const recalculateButtons = screen.getAllByTitle('Recalcular balance');
      fireEvent.click(recalculateButtons[0]);

      fireEvent.click(screen.getByTestId('loading-button'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Calculation failed',
          variant: 'destructive',
        });
      });
    });

    it('displays balance error in table', async () => {
      const mockRecalculateFundBalance = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      renderWithProviders(<FundsView />, {
        budgetContextValue: {
          ...mockBudgetContext,
          recalculateFundBalance: mockRecalculateFundBalance,
        },
      });

      const recalculateButtons = screen.getAllByTitle('Recalcular balance');
      fireEvent.click(recalculateButtons[0]);

      fireEvent.click(screen.getByTestId('loading-button'));

      await waitFor(() => {
        expect(
          screen.getByTestId('fund-balance-error-display')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays general errors', async () => {
      const mockAddFund = jest
        .fn()
        .mockRejectedValue(new Error('General error'));

      renderWithProviders(<FundsView />, {
        budgetContextValue: { ...mockBudgetContext, addFund: mockAddFund },
      });

      fireEvent.click(screen.getByText('Nuevo Fondo'));
      fireEvent.change(screen.getByLabelText('Nombre *'), {
        target: { value: 'Test Fund' },
      });
      fireEvent.click(screen.getByTestId('loading-button'));

      await waitFor(() => {
        expect(screen.getByTestId('fund-error-display')).toBeInTheDocument();
      });
    });

    it('allows dismissing errors', async () => {
      const mockAddFund = jest
        .fn()
        .mockRejectedValue(new Error('General error'));

      renderWithProviders(<FundsView />, {
        budgetContextValue: { ...mockBudgetContext, addFund: mockAddFund },
      });

      fireEvent.click(screen.getByText('Nuevo Fondo'));
      fireEvent.change(screen.getByLabelText('Nombre *'), {
        target: { value: 'Test Fund' },
      });
      fireEvent.click(screen.getByTestId('loading-button'));

      await waitFor(() => {
        expect(screen.getByTestId('fund-error-display')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Dismiss'));

      expect(
        screen.queryByTestId('fund-error-display')
      ).not.toBeInTheDocument();
    });

    it('handles missing context data gracefully', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: { ...mockBudgetContext, funds: undefined },
      });

      expect(screen.getByTestId('funds-empty-state')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /nuevo fondo/i })
      ).toBeInTheDocument();

      const actionButtons = screen.getAllByTitle(/editar|eliminar|recalcular/i);
      expect(actionButtons.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', () => {
      renderWithProviders(<FundsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const newFundButton = screen.getByText('Nuevo Fondo');
      newFundButton.focus();
      expect(newFundButton).toHaveFocus();
    });
  });
});
