/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { ActivePeriodErrorHandler } from '../../components/active-period-error-handler';
import { NoActivePeriodFallback } from '../../components/no-active-period-fallback';
import {
  ActivePeriodErrorBoundary,
  useActivePeriodErrorBoundary,
} from '../../components/active-period-error-boundary';
import { useAuth } from '../auth-context';
import { useBudget } from '../../context/budget-context';
import { PeriodLoadingError } from '../active-period-service';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../auth-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../context/budget-context', () => ({
  useBudget: jest.fn(),
}));

jest.mock('../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseBudget = useBudget as jest.MockedFunction<typeof useBudget>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('Active Period Error Handling Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseBudget.mockReturnValue({
      periods: [],
      categories: [],
      budgets: [],
      incomes: [],
      expenses: [],
      funds: [],
      activePeriod: null,
      selectedFund: null,
      fundFilter: null,
      isLoading: false,
      error: null,
      isDbInitialized: true,
      dbConnectionError: false,
      connectionErrorDetails: null,
      setupDatabase: jest.fn(),
      addCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      addPeriod: jest.fn(),
      updatePeriod: jest.fn(),
      deletePeriod: jest.fn(),
      openPeriod: jest.fn(),
      closePeriod: jest.fn(),
      addBudget: jest.fn(),
      updateBudget: jest.fn(),
      creditCards: [],
      settings: { default_fund_id: null },
      dataLoaded: true,
      getCategoryFunds: jest.fn(),
      updateFund: jest.fn(),
      addFund: jest.fn(),
      deleteFund: jest.fn(),
      validateActivePeriodCache: jest.fn(),
      deleteBudget: jest.fn(),
      addIncome: jest.fn(),
      updateIncome: jest.fn(),
      deleteIncome: jest.fn(),
      addExpense: jest.fn(),
      updateExpense: jest.fn(),
      deleteExpense: jest.fn(),
      updateFund: jest.fn(),
      recalculateFundBalance: jest.fn(),
      setSelectedFund: jest.fn(),
      setFundFilter: jest.fn(),
      getFilteredCategories: jest.fn(),
      getFilteredIncomes: jest.fn(),
      getFilteredExpenses: jest.fn(),
      getDashboardData: jest.fn(),
      getCategoryById: jest.fn(),
      getPeriodById: jest.fn(),
      getFundById: jest.fn(),
      getDefaultFund: jest.fn(),
      refreshData: jest.fn(),
      refreshFunds: jest.fn(),
    } as any);
  });

  describe('ActivePeriodErrorHandler', () => {
    const createMockError = (
      type: string,
      retryable = true
    ): PeriodLoadingError => ({
      type: type as any,
      message: `Test ${type} error`,
      retryable,
      timestamp: Date.now(),
    });

    it('should display network error with retry button', () => {
      const mockError = createMockError('network');
      const mockOnRetry = jest.fn();

      render(
        <ActivePeriodErrorHandler
          error={mockError}
          onRetry={mockOnRetry}
          showFullCard={true}
        />
      );

      expect(screen.getByText('Error de conexión')).toBeInTheDocument();
      expect(
        screen.getByText(/No se pudo conectar al servidor/)
      ).toBeInTheDocument();

      const retryButton = screen.getByRole('button', { name: /Reintentar/ });
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should display authentication error with login button', () => {
      const mockError = createMockError('authentication', false);

      render(
        <ActivePeriodErrorHandler error={mockError} showFullCard={true} />
      );

      expect(screen.getByText('Sesión expirada')).toBeInTheDocument();
      expect(screen.getByText(/Tu sesión ha expirado/)).toBeInTheDocument();

      const loginButton = screen.getByRole('button', {
        name: /Iniciar sesión/,
      });
      expect(loginButton).toBeInTheDocument();

      fireEvent.click(loginButton);
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });

    it('should display no active period error with periods button', () => {
      const mockError = createMockError('no_active_period', false);

      render(
        <ActivePeriodErrorHandler error={mockError} showFullCard={true} />
      );

      expect(screen.getByText('No hay periodo activo')).toBeInTheDocument();
      expect(
        screen.getByText(/No hay un periodo activo configurado/)
      ).toBeInTheDocument();

      const periodsButton = screen.getByRole('button', {
        name: /Ir a Periodos/,
      });
      expect(periodsButton).toBeInTheDocument();

      fireEvent.click(periodsButton);
      expect(mockRouter.push).toHaveBeenCalledWith('/periodos');
    });

    it('should display server error with setup button', () => {
      const mockError = createMockError('server');

      render(
        <ActivePeriodErrorHandler
          error={mockError}
          onRetry={jest.fn()}
          showFullCard={true}
        />
      );

      expect(screen.getByText('Error del servidor')).toBeInTheDocument();
      expect(
        screen.getByText(/Ocurrió un error en el servidor/)
      ).toBeInTheDocument();

      const setupButton = screen.getByRole('button', { name: /Configuración/ });
      expect(setupButton).toBeInTheDocument();

      fireEvent.click(setupButton);
      expect(mockRouter.push).toHaveBeenCalledWith('/setup');
    });

    it('should show compact alert version when showFullCard is false', () => {
      const mockError = createMockError('network');

      render(
        <ActivePeriodErrorHandler error={mockError} showFullCard={false} />
      );

      // Should not have the full card structure
      expect(screen.queryByText('Tipo de error:')).not.toBeInTheDocument();
      expect(screen.queryByText('Sugerencias:')).not.toBeInTheDocument();

      // But should still have the error message
      expect(screen.getByText('Error de conexión')).toBeInTheDocument();
    });

    it('should disable retry button when retrying', () => {
      const mockError = createMockError('network');

      render(
        <ActivePeriodErrorHandler
          error={mockError}
          onRetry={jest.fn()}
          isRetrying={true}
          showFullCard={true}
        />
      );

      const retryButton = screen.getByRole('button', {
        name: /Reintentando.../,
      });
      expect(retryButton).toBeDisabled();
    });
  });

  describe('NoActivePeriodFallback', () => {
    it('should display create period option when no periods exist', () => {
      mockUseBudget.mockReturnValue({
        ...mockUseBudget(),
        periods: [],
      });

      render(<NoActivePeriodFallback />);

      expect(screen.getByText('No hay periodo activo')).toBeInTheDocument();
      expect(screen.getByText('Crear primer periodo')).toBeInTheDocument();
      expect(
        screen.getByText(/No tienes periodos creados/)
      ).toBeInTheDocument();

      const createButton = screen.getByRole('button', {
        name: /Crear periodo/,
      });
      expect(createButton).toBeInTheDocument();

      fireEvent.click(createButton);
      expect(mockRouter.push).toHaveBeenCalledWith('/periodos');
    });

    it('should display activate period option when inactive periods exist', () => {
      mockUseBudget.mockReturnValue({
        ...mockUseBudget(),
        periods: [
          {
            id: '1',
            name: 'January 2025',
            month: 1,
            year: 2025,
            is_open: false,
            isOpen: false,
          },
          {
            id: '2',
            name: 'February 2025',
            month: 2,
            year: 2025,
            is_open: false,
            isOpen: false,
          },
        ],
      });

      render(<NoActivePeriodFallback />);

      expect(screen.getByText('Activar periodo existente')).toBeInTheDocument();
      expect(screen.getByText(/Tienes 2 periodos creados/)).toBeInTheDocument();

      const activateButton = screen.getByRole('button', {
        name: /Activar periodo/,
      });
      expect(activateButton).toBeInTheDocument();

      fireEvent.click(activateButton);
      expect(mockRouter.push).toHaveBeenCalledWith('/periodos');
    });

    it('should display compact version when showCompact is true', () => {
      render(<NoActivePeriodFallback showCompact={true} />);

      expect(screen.getByText(/No hay periodo activo/)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Ir a Periodos/ })
      ).toBeInTheDocument();

      // Should not have the full guide
      expect(screen.queryByText('Guía rápida')).not.toBeInTheDocument();
    });

    it('should display quick start guide', () => {
      render(<NoActivePeriodFallback />);

      expect(screen.getByText('Guía rápida')).toBeInTheDocument();
      expect(
        screen.getByText('Crear o activar un periodo')
      ).toBeInTheDocument();
      expect(screen.getByText('Configurar categorías')).toBeInTheDocument();
      expect(screen.getByText('Establecer presupuestos')).toBeInTheDocument();
      expect(
        screen.getByText('Registrar ingresos y gastos')
      ).toBeInTheDocument();

      const startButton = screen.getByRole('button', {
        name: /Comenzar ahora/,
      });
      expect(startButton).toBeInTheDocument();

      fireEvent.click(startButton);
      expect(mockRouter.push).toHaveBeenCalledWith('/periodos');
    });
  });

  describe('ActivePeriodErrorBoundary', () => {
    const TestComponent = () => <div>Test Content</div>;

    it('should render children when no error exists', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        login: jest.fn(),
        logout: jest.fn(),
        activePeriod: null,
        isLoadingActivePeriod: false,
        activePeriodError: null,
        retryActivePeriodLoading: jest.fn(),
        clearActivePeriodError: jest.fn(),
        performCacheHealthCheck: jest.fn(),
        recoverFromCacheCorruption: jest.fn(),
        getServiceStatus: jest.fn(),
      } as any);

      render(
        <ActivePeriodErrorBoundary showGlobalErrors={true}>
          <TestComponent />
        </ActivePeriodErrorBoundary>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should show authentication error as full screen', () => {
      const mockError: PeriodLoadingError = {
        type: 'authentication',
        message: 'Authentication failed',
        retryable: false,
        timestamp: Date.now(),
      };

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        login: jest.fn(),
        logout: jest.fn(),
        activePeriod: null,
        isLoadingActivePeriod: false,
        activePeriodError: mockError,
        retryActivePeriodLoading: jest.fn(),
        clearActivePeriodError: jest.fn(),
        performCacheHealthCheck: jest.fn(),
        recoverFromCacheCorruption: jest.fn(),
        getServiceStatus: jest.fn(),
      });

      render(
        <ActivePeriodErrorBoundary showGlobalErrors={true}>
          <TestComponent />
        </ActivePeriodErrorBoundary>
      );

      expect(screen.getByText('Sesión expirada')).toBeInTheDocument();
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    it('should show non-critical errors as dismissible banner', () => {
      const mockError: PeriodLoadingError = {
        type: 'network',
        message: 'Network error',
        retryable: true,
        timestamp: Date.now(),
      };

      const mockClearError = jest.fn();

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        login: jest.fn(),
        logout: jest.fn(),
        activePeriod: null,
        isLoadingActivePeriod: false,
        activePeriodError: mockError,
        retryActivePeriodLoading: jest.fn(),
        clearActivePeriodError: mockClearError,
        performCacheHealthCheck: jest.fn(),
        recoverFromCacheCorruption: jest.fn(),
        getServiceStatus: jest.fn(),
      });

      render(
        <ActivePeriodErrorBoundary showGlobalErrors={true}>
          <TestComponent />
        </ActivePeriodErrorBoundary>
      );

      expect(
        screen.getByText(/Error al cargar el periodo activo/)
      ).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();

      const dismissButton = screen.getByRole('button', { name: /Descartar/ });
      fireEvent.click(dismissButton);
      expect(mockClearError).toHaveBeenCalledTimes(1);
    });

    it('should not show errors when showGlobalErrors is false', () => {
      const mockError: PeriodLoadingError = {
        type: 'network',
        message: 'Network error',
        retryable: true,
        timestamp: Date.now(),
      };

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        login: jest.fn(),
        logout: jest.fn(),
        activePeriod: null,
        isLoadingActivePeriod: false,
        activePeriodError: mockError,
        retryActivePeriodLoading: jest.fn(),
        clearActivePeriodError: jest.fn(),
        performCacheHealthCheck: jest.fn(),
        recoverFromCacheCorruption: jest.fn(),
        getServiceStatus: jest.fn(),
      });

      render(
        <ActivePeriodErrorBoundary showGlobalErrors={false}>
          <TestComponent />
        </ActivePeriodErrorBoundary>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(
        screen.queryByText(/Error al cargar el periodo activo/)
      ).not.toBeInTheDocument();
    });
  });

  describe('useActivePeriodErrorBoundary hook', () => {
    const TestHookComponent = () => {
      const {
        hasError,
        isCriticalError,
        isRetryableError,
        error,
        retry,
        isRetrying,
        clearError,
      } = useActivePeriodErrorBoundary();

      return (
        <div>
          <div data-testid="hasError">{hasError.toString()}</div>
          <div data-testid="isCriticalError">{isCriticalError.toString()}</div>
          <div data-testid="isRetryableError">
            {isRetryableError.toString()}
          </div>
          <div data-testid="errorType">{error?.type || 'none'}</div>
          <div data-testid="isRetrying">{isRetrying.toString()}</div>
          <button onClick={retry}>Retry</button>
          <button onClick={clearError}>Clear</button>
        </div>
      );
    };

    it('should return correct values when no error exists', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        login: jest.fn(),
        logout: jest.fn(),
        activePeriod: null,
        isLoadingActivePeriod: false,
        activePeriodError: null,
        retryActivePeriodLoading: jest.fn(),
        clearActivePeriodError: jest.fn(),
        performCacheHealthCheck: jest.fn(),
        recoverFromCacheCorruption: jest.fn(),
        getServiceStatus: jest.fn(),
      } as any);

      render(<TestHookComponent />);

      expect(screen.getByTestId('hasError')).toHaveTextContent('false');
      expect(screen.getByTestId('isCriticalError')).toHaveTextContent('false');
      expect(screen.getByTestId('isRetryableError')).toHaveTextContent('false');
      expect(screen.getByTestId('errorType')).toHaveTextContent('none');
    });

    it('should return correct values for authentication error', () => {
      const mockError: PeriodLoadingError = {
        type: 'authentication',
        message: 'Auth error',
        retryable: false,
        timestamp: Date.now(),
      };

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        login: jest.fn(),
        logout: jest.fn(),
        activePeriod: null,
        isLoadingActivePeriod: false,
        activePeriodError: mockError,
        retryActivePeriodLoading: jest.fn(),
        clearActivePeriodError: jest.fn(),
        performCacheHealthCheck: jest.fn(),
        recoverFromCacheCorruption: jest.fn(),
        getServiceStatus: jest.fn(),
      });

      render(<TestHookComponent />);

      expect(screen.getByTestId('hasError')).toHaveTextContent('true');
      expect(screen.getByTestId('isCriticalError')).toHaveTextContent('true');
      expect(screen.getByTestId('isRetryableError')).toHaveTextContent('false');
      expect(screen.getByTestId('errorType')).toHaveTextContent(
        'authentication'
      );
    });

    it('should return correct values for retryable network error', () => {
      const mockError: PeriodLoadingError = {
        type: 'network',
        message: 'Network error',
        retryable: true,
        timestamp: Date.now(),
      };

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        login: jest.fn(),
        logout: jest.fn(),
        activePeriod: null,
        isLoadingActivePeriod: false,
        activePeriodError: mockError,
        retryActivePeriodLoading: jest.fn(),
        clearActivePeriodError: jest.fn(),
        performCacheHealthCheck: jest.fn(),
        recoverFromCacheCorruption: jest.fn(),
        getServiceStatus: jest.fn(),
      });

      render(<TestHookComponent />);

      expect(screen.getByTestId('hasError')).toHaveTextContent('true');
      expect(screen.getByTestId('isCriticalError')).toHaveTextContent('false');
      expect(screen.getByTestId('isRetryableError')).toHaveTextContent('true');
      expect(screen.getByTestId('errorType')).toHaveTextContent('network');
    });

    it('should call retry and clear functions', () => {
      const mockRetry = jest.fn();
      const mockClear = jest.fn();

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        login: jest.fn(),
        logout: jest.fn(),
        activePeriod: null,
        isLoadingActivePeriod: false,
        activePeriodError: null,
        retryActivePeriodLoading: mockRetry,
        clearActivePeriodError: mockClear,
      });

      render(<TestHookComponent />);

      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(mockRetry).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
      expect(mockClear).toHaveBeenCalledTimes(1);
    });
  });
});
