import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  SourceFundErrorBoundary,
  SourceFundErrorWrapper,
  useSourceFundErrorHandler,
  SourceFundErrorFallback,
} from '../source-fund-error-boundary';

// Mock component that throws errors
function ThrowError({
  shouldThrow,
  errorType,
}: {
  shouldThrow: boolean;
  errorType?: string;
}) {
  if (shouldThrow) {
    if (errorType === 'validation') {
      throw new Error('Invalid source fund selection');
    } else if (errorType === 'network') {
      throw new Error('Network connection failed');
    } else if (errorType === 'server') {
      throw new Error('Internal server error');
    } else {
      throw new Error('Unknown error occurred');
    }
  }
  return <div>No error</div>;
}

// Mock component to test the hook
function TestHookComponent() {
  const {
    error,
    isRetrying,
    handleAsyncError,
    clearError,
    retryOperation,
    wrapAsyncOperation,
  } = useSourceFundErrorHandler();

  const triggerError = () => {
    handleAsyncError(new Error('Test async error'), 'test context');
  };

  const triggerRetry = async () => {
    await retryOperation(
      async () => {
        throw new Error('Retry failed');
      },
      'retry context',
      2
    );
  };

  const triggerWrap = async () => {
    await wrapAsyncOperation(async () => {
      throw new Error('Wrapped error');
    }, 'wrap context');
  };

  return (
    <div>
      <div data-testid="error">{error?.message || 'No error'}</div>
      <div data-testid="retrying">
        {isRetrying ? 'Retrying' : 'Not retrying'}
      </div>
      <button onClick={triggerError}>Trigger Error</button>
      <button onClick={triggerRetry}>Trigger Retry</button>
      <button onClick={triggerWrap}>Trigger Wrap</button>
      <button onClick={clearError}>Clear Error</button>
    </div>
  );
}

describe('SourceFundErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Error Boundary Component', () => {
    it('should render children when no error occurs', () => {
      render(
        <SourceFundErrorBoundary>
          <ThrowError shouldThrow={false} />
        </SourceFundErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should catch and display validation errors', () => {
      render(
        <SourceFundErrorBoundary showDetails>
          <ThrowError shouldThrow={true} errorType="validation" />
        </SourceFundErrorBoundary>
      );

      expect(
        screen.getByText('Error de validación de fondo origen')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Los datos del fondo origen no son válidos/)
      ).toBeInTheDocument();
      expect(
        screen.getByText('Invalid source fund selection')
      ).toBeInTheDocument();
    });

    it('should catch and display network errors', () => {
      render(
        <SourceFundErrorBoundary>
          <ThrowError shouldThrow={true} errorType="network" />
        </SourceFundErrorBoundary>
      );

      expect(screen.getByText('Error de conexión')).toBeInTheDocument();
      expect(
        screen.getByText(/No se pudo conectar con el servidor/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Reintentando automáticamente/)
      ).toBeInTheDocument();
    });

    it('should catch and display server errors', () => {
      render(
        <SourceFundErrorBoundary>
          <ThrowError shouldThrow={true} errorType="server" />
        </SourceFundErrorBoundary>
      );

      expect(screen.getByText('Error del servidor')).toBeInTheDocument();
      expect(
        screen.getByText(/Ha ocurrido un error interno del servidor/)
      ).toBeInTheDocument();
    });

    it('should catch and display unknown errors', () => {
      render(
        <SourceFundErrorBoundary>
          <ThrowError shouldThrow={true} />
        </SourceFundErrorBoundary>
      );

      expect(screen.getByText('Error en fondo origen')).toBeInTheDocument();
      expect(
        screen.getByText(/Ha ocurrido un error inesperado/)
      ).toBeInTheDocument();
    });

    it('should display error ID and timestamp', () => {
      render(
        <SourceFundErrorBoundary>
          <ThrowError shouldThrow={true} />
        </SourceFundErrorBoundary>
      );

      expect(screen.getByText(/ID: sf_error_/)).toBeInTheDocument();
      expect(screen.getByText(/Tipo: unknown/)).toBeInTheDocument();
    });

    it('should show technical details when showDetails is true', () => {
      render(
        <SourceFundErrorBoundary showDetails>
          <ThrowError shouldThrow={true} />
        </SourceFundErrorBoundary>
      );

      expect(screen.getByText('Información técnica:')).toBeInTheDocument();
      expect(
        screen.getByText(/Error: Unknown error occurred/)
      ).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = jest.fn();

      render(
        <SourceFundErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </SourceFundErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should reset error state when retry button is clicked', () => {
      const { rerender } = render(
        <SourceFundErrorBoundary>
          <ThrowError shouldThrow={true} />
        </SourceFundErrorBoundary>
      );

      expect(screen.getByText('Error en fondo origen')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Reintentar'));

      rerender(
        <SourceFundErrorBoundary>
          <ThrowError shouldThrow={false} />
        </SourceFundErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should display context information when provided', () => {
      render(
        <SourceFundErrorBoundary context="expense form">
          <ThrowError shouldThrow={true} />
        </SourceFundErrorBoundary>
      );

      expect(screen.getByText(/Contexto: expense form/)).toBeInTheDocument();
    });

    it('should use custom fallback when provided', () => {
      const customFallback = <div>Custom error fallback</div>;

      render(
        <SourceFundErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </SourceFundErrorBoundary>
      );

      expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
      expect(
        screen.queryByText('Error en fondo origen')
      ).not.toBeInTheDocument();
    });
  });

  describe('Error Wrapper Component', () => {
    it('should render children normally', () => {
      render(
        <SourceFundErrorWrapper>
          <ThrowError shouldThrow={false} />
        </SourceFundErrorWrapper>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should catch errors and log them', () => {
      const consoleSpy = jest.spyOn(console, 'error');

      render(
        <SourceFundErrorWrapper context="test wrapper">
          <ThrowError shouldThrow={true} />
        </SourceFundErrorWrapper>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Source Fund Error:',
        expect.objectContaining({
          error: 'Unknown error occurred',
          context: 'test wrapper',
        })
      );
    });

    it('should reset on props change when enabled', () => {
      const { rerender } = render(
        <SourceFundErrorWrapper resetOnPropsChange={true}>
          <ThrowError shouldThrow={true} />
        </SourceFundErrorWrapper>
      );

      expect(screen.getByText('Error en fondo origen')).toBeInTheDocument();

      rerender(
        <SourceFundErrorWrapper resetOnPropsChange={true}>
          <ThrowError shouldThrow={false} />
        </SourceFundErrorWrapper>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('useSourceFundErrorHandler Hook', () => {
    it('should handle async errors', () => {
      render(<TestHookComponent />);

      expect(screen.getByTestId('error')).toHaveTextContent('No error');

      fireEvent.click(screen.getByText('Trigger Error'));

      expect(screen.getByTestId('error')).toHaveTextContent('Test async error');
    });

    it('should clear errors', () => {
      render(<TestHookComponent />);

      fireEvent.click(screen.getByText('Trigger Error'));
      expect(screen.getByTestId('error')).toHaveTextContent('Test async error');

      fireEvent.click(screen.getByText('Clear Error'));
      expect(screen.getByTestId('error')).toHaveTextContent('No error');
    });

    it('should handle retry operations', async () => {
      render(<TestHookComponent />);

      fireEvent.click(screen.getByText('Trigger Retry'));

      expect(screen.getByTestId('retrying')).toHaveTextContent('Retrying');

      await waitFor(() => {
        expect(screen.getByTestId('retrying')).toHaveTextContent(
          'Not retrying'
        );
      });

      expect(screen.getByTestId('error')).toHaveTextContent('Retry failed');
    });

    it('should wrap async operations', async () => {
      render(<TestHookComponent />);

      fireEvent.click(screen.getByText('Trigger Wrap'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Wrapped error');
      });
    });
  });

  describe('SourceFundErrorFallback Component', () => {
    it('should render validation error fallback', () => {
      const error = new Error('Validation failed');
      const resetError = jest.fn();

      render(
        <SourceFundErrorFallback
          error={error}
          resetError={resetError}
          type="validation"
          context="test context"
        />
      );

      expect(
        screen.getByText('Error de validación en la selección de fondo origen')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Verifique que ha seleccionado un fondo origen válido/)
      ).toBeInTheDocument();
      expect(screen.getByText('Validation failed')).toBeInTheDocument();
      expect(screen.getByText('(test context)')).toBeInTheDocument();
    });

    it('should render network error fallback', () => {
      render(<SourceFundErrorFallback type="network" />);

      expect(
        screen.getByText('Error de conexión al validar el fondo origen')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/No se pudo conectar con el servidor/)
      ).toBeInTheDocument();
    });

    it('should render server error fallback', () => {
      render(<SourceFundErrorFallback type="server" />);

      expect(
        screen.getByText('Error del servidor en la operación de fondo origen')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Ha ocurrido un error interno/)
      ).toBeInTheDocument();
    });

    it('should render unknown error fallback', () => {
      render(<SourceFundErrorFallback type="unknown" />);

      expect(
        screen.getByText('Error en la gestión de fondo origen')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Ha ocurrido un error inesperado/)
      ).toBeInTheDocument();
    });

    it('should call resetError when retry button is clicked', () => {
      const resetError = jest.fn();

      render(<SourceFundErrorFallback resetError={resetError} />);

      fireEvent.click(screen.getByText('Reintentar'));

      expect(resetError).toHaveBeenCalled();
    });

    it('should reload page when reload button is clicked', () => {
      // Mock window.location.reload
      const reloadMock = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      });

      render(<SourceFundErrorFallback />);

      fireEvent.click(screen.getByText('Recargar'));

      expect(reloadMock).toHaveBeenCalled();
    });
  });

  describe('Error Categorization', () => {
    it('should categorize validation errors correctly', () => {
      render(
        <SourceFundErrorBoundary>
          <ThrowError shouldThrow={true} errorType="validation" />
        </SourceFundErrorBoundary>
      );

      expect(screen.getByText(/Tipo: validation/)).toBeInTheDocument();
    });

    it('should categorize network errors correctly', () => {
      render(
        <SourceFundErrorBoundary>
          <ThrowError shouldThrow={true} errorType="network" />
        </SourceFundErrorBoundary>
      );

      expect(screen.getByText(/Tipo: network/)).toBeInTheDocument();
    });

    it('should categorize server errors correctly', () => {
      render(
        <SourceFundErrorBoundary>
          <ThrowError shouldThrow={true} errorType="server" />
        </SourceFundErrorBoundary>
      );

      expect(screen.getByText(/Tipo: server/)).toBeInTheDocument();
    });
  });

  describe('Auto-retry for Network Errors', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should auto-retry network errors after 5 seconds', () => {
      const { rerender } = render(
        <SourceFundErrorBoundary>
          <ThrowError shouldThrow={true} errorType="network" />
        </SourceFundErrorBoundary>
      );

      expect(screen.getByText('Error de conexión')).toBeInTheDocument();

      // Fast-forward time by 5 seconds
      jest.advanceTimersByTime(5000);

      rerender(
        <SourceFundErrorBoundary>
          <ThrowError shouldThrow={false} />
        </SourceFundErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });
});
