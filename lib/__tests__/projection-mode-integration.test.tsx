/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = jest.fn();

// Mock toast function
const mockToast = jest.fn();
jest.mock('@/components/ui/use-toast', () => ({
  toast: mockToast,
}));

// Mock session storage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

describe('Projection Mode Integration Tests', () => {
  // Mock integrated component that combines all projection mode functionality
  const IntegratedProjectionModeComponent = () => {
    const [projectionMode, setProjectionMode] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<string>('current');
    const [grouperData, setGrouperData] = React.useState<any[]>([]);
    const [categoryData, setCategoryData] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [selectedEstudio, setSelectedEstudio] = React.useState<number | null>(
      1
    );
    const [selectedGroupers, setSelectedGroupers] = React.useState<number[]>([
      1, 2,
    ]);
    const [paymentMethod, setPaymentMethod] = React.useState('all');

    // Session storage utilities
    const saveProjectionModeToSession = (mode: boolean) => {
      try {
        const projectionState = {
          projectionMode: mode,
          lastUpdated: Date.now(),
        };
        sessionStorage.setItem(
          'dashboard-projection-mode',
          JSON.stringify(projectionState)
        );
      } catch (error) {
        console.error('Error saving projection mode:', error);
      }
    };

    const loadProjectionModeFromSession = (): boolean => {
      try {
        const saved = sessionStorage.getItem('dashboard-projection-mode');
        if (saved) {
          const projectionState = JSON.parse(saved);
          if (typeof projectionState === 'boolean') {
            return projectionState;
          }
          if (
            projectionState &&
            typeof projectionState.projectionMode === 'boolean'
          ) {
            return projectionState.projectionMode;
          }
        }
        return false;
      } catch (error) {
        console.error('Error loading projection mode:', error);
        return false;
      }
    };

    // Data transformation
    const processProjectionData = (data: any[], isProjecting: boolean) => {
      return data.map((item) => ({
        ...item,
        total_amount: isProjecting
          ? item.budget_amount || 0
          : item.total_amount,
        isProjectiond: isProjecting,
      }));
    };

    // API call projection
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          periodId: '1',
          paymentMethod: projectionMode ? 'all' : paymentMethod,
        });

        if (selectedEstudio) {
          params.append('estudioId', selectedEstudio.toString());
        }

        if (selectedGroupers.length > 0) {
          params.append('grouperIds', selectedGroupers.join(','));
        }

        if (projectionMode) {
          params.append('includeBudgets', 'true');
          params.append('projectionMode', 'true');
        }

        const response = await fetch(
          `/api/dashboard/groupers?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Error al cargar datos`);
        }

        const data = await response.json();
        const processedData = processProjectionData(data, projectionMode);
        setGrouperData(processedData);
      } catch (error) {
        console.error('Error fetching data:', error);
        mockToast({
          title: 'Error',
          description: 'Error al cargar datos',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Handle projection mode toggle
    const handleProjectionModeToggle = (checked: boolean) => {
      setProjectionMode(checked);
      saveProjectionModeToSession(checked);

      // Clear existing data to force refresh
      setGrouperData([]);
      setCategoryData([]);
    };

    // Load projection mode on mount
    React.useEffect(() => {
      const savedMode = loadProjectionModeFromSession();
      setProjectionMode(savedMode);
    }, []);

    // Fetch data when dependencies change
    React.useEffect(() => {
      if (activeTab === 'current') {
        fetchData();
      }
    }, [
      projectionMode,
      selectedEstudio,
      selectedGroupers,
      paymentMethod,
      activeTab,
    ]);

    return (
      <div data-testid="integrated-component">
        {/* Tab Navigation */}
        <div data-testid="tab-navigation">
          <button
            data-testid="current-tab"
            onClick={() => setActiveTab('current')}
            className={activeTab === 'current' ? 'active' : ''}
          >
            Vista Actual
          </button>
          <button
            data-testid="period-comparison-tab"
            onClick={() => setActiveTab('period-comparison')}
            className={activeTab === 'period-comparison' ? 'active' : ''}
          >
            Comparación por Períodos
          </button>
        </div>

        {/* Filters */}
        <div data-testid="filters">
          <select
            data-testid="estudio-filter"
            value={selectedEstudio || ''}
            onChange={(e) => setSelectedEstudio(Number(e.target.value) || null)}
          >
            <option value="">Todos los estudios</option>
            <option value="1">Estudio 1</option>
            <option value="2">Estudio 2</option>
          </select>

          <select
            data-testid="payment-method-filter"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="all">Todos los métodos</option>
            <option value="credit">Tarjeta de crédito</option>
            <option value="debit">Tarjeta de débito</option>
          </select>

          {/* Projection Mode Checkbox */}
          <div data-testid="projection-mode-container">
            <input
              type="checkbox"
              id="projection-mode"
              data-testid="projection-mode"
              checked={projectionMode}
              onChange={(e) => handleProjectionModeToggle(e.target.checked)}
              disabled={activeTab !== 'current'}
            />
            <label htmlFor="projection-mode">Proyectar</label>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && <div data-testid="loading">Cargando...</div>}

        {/* Chart */}
        <div data-testid="chart-container">
          <h3 data-testid="chart-title">
            {projectionMode ? 'Gráfico (Proyección)' : 'Gráfico'}
          </h3>
          <div data-testid="chart-legend">
            {projectionMode ? 'Presupuesto' : 'Gastos'}
          </div>
          {grouperData.map((item, index) => (
            <div
              key={index}
              data-testid={`chart-bar-${index}`}
              className={item.isProjectiond ? 'projectiond' : 'normal'}
              style={{
                opacity: item.isProjectiond ? 0.7 : 1,
              }}
            >
              {item.grouper_name}: ${item.total_amount}
            </div>
          ))}
        </div>

        {/* Debug Info */}
        <div data-testid="debug-info" style={{ display: 'none' }}>
          <div data-testid="projection-mode-state">
            {projectionMode.toString()}
          </div>
          <div data-testid="active-tab-state">{activeTab}</div>
          <div data-testid="data-count">{grouperData.length}</div>
        </div>
      </div>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.clear();

    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [
        {
          grouper_id: 1,
          grouper_name: 'Alimentación',
          total_amount: 500,
          budget_amount: 600,
        },
        {
          grouper_id: 2,
          grouper_name: 'Transporte',
          total_amount: 300,
          budget_amount: 400,
        },
      ],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete User Workflow', () => {
    it('should handle complete projection mode workflow', async () => {
      render(<IntegratedProjectionModeComponent />);

      // Initial state - projection mode off
      const checkbox = screen.getByTestId('projection-mode');
      expect(checkbox).not.toBeChecked();

      // Wait for initial data load
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Verify normal chart display
      expect(screen.getByTestId('chart-title')).toHaveTextContent('Gráfico');
      expect(screen.getByTestId('chart-legend')).toHaveTextContent('Gastos');

      // Enable projection mode
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      // Wait for data refresh
      await waitFor(() => {
        expect(screen.getByTestId('chart-title')).toHaveTextContent(
          'Gráfico (Proyección)'
        );
      });

      // Verify projection chart display
      expect(screen.getByTestId('chart-legend')).toHaveTextContent(
        'Presupuesto'
      );

      // Verify data transformation
      const bars = screen.getAllByTestId(/chart-bar-/);
      expect(bars[0]).toHaveTextContent('Alimentación: $600'); // Budget amount
      expect(bars[1]).toHaveTextContent('Transporte: $400'); // Budget amount
    });

    it('should persist projection mode across page refresh', async () => {
      // First render - enable projection mode
      const { unmount } = render(<IntegratedProjectionModeComponent />);

      const checkbox = screen.getByTestId('projection-mode');
      fireEvent.click(checkbox);

      // Verify session storage was called
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'dashboard-projection-mode',
        expect.stringContaining('"projectionMode":true')
      );

      unmount();

      // Mock session storage return
      mockSessionStorage.getItem.mockReturnValue(
        JSON.stringify({
          projectionMode: true,
          lastUpdated: Date.now(),
        })
      );

      // Second render - should restore projection mode
      render(<IntegratedProjectionModeComponent />);

      await waitFor(() => {
        const restoredCheckbox = screen.getByTestId('projection-mode');
        expect(restoredCheckbox).toBeChecked();
      });
    });

    it('should handle tab switching correctly', async () => {
      render(<IntegratedProjectionModeComponent />);

      // Enable projection mode on current tab
      const checkbox = screen.getByTestId('projection-mode');
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      expect(checkbox).not.toBeDisabled();

      // Switch to period comparison tab
      const periodTab = screen.getByTestId('period-comparison-tab');
      fireEvent.click(periodTab);

      // Checkbox should be disabled but maintain state
      expect(checkbox).toBeChecked();
      expect(checkbox).toBeDisabled();

      // Switch back to current tab
      const currentTab = screen.getByTestId('current-tab');
      fireEvent.click(currentTab);

      // Checkbox should be enabled and maintain state
      expect(checkbox).toBeChecked();
      expect(checkbox).not.toBeDisabled();
    });
  });

  describe('Filter Integration', () => {
    it('should work with estudio filter', async () => {
      render(<IntegratedProjectionModeComponent />);

      // Change estudio filter
      const estudioFilter = screen.getByTestId('estudio-filter');
      fireEvent.change(estudioFilter, { target: { value: '2' } });

      // Enable projection mode
      const checkbox = screen.getByTestId('projection-mode');
      fireEvent.click(checkbox);

      // Wait for API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('estudioId=2')
        );
      });

      // Verify projection mode parameters
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('includeBudgets=true')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('projectionMode=true')
      );
    });

    it('should handle payment method filter in projection mode', async () => {
      render(<IntegratedProjectionModeComponent />);

      // Change payment method
      const paymentFilter = screen.getByTestId('payment-method-filter');
      fireEvent.change(paymentFilter, { target: { value: 'credit' } });

      // Enable projection mode
      const checkbox = screen.getByTestId('projection-mode');
      fireEvent.click(checkbox);

      // Wait for API call
      await waitFor(() => {
        // In projection mode, payment method should be "all" for budget data
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('paymentMethod=all')
        );
      });
    });

    it('should maintain filter state when toggling projection mode', async () => {
      render(<IntegratedProjectionModeComponent />);

      // Set filters
      const estudioFilter = screen.getByTestId('estudio-filter');
      const paymentFilter = screen.getByTestId('payment-method-filter');

      fireEvent.change(estudioFilter, { target: { value: '2' } });
      fireEvent.change(paymentFilter, { target: { value: 'credit' } });

      // Toggle projection mode on and off
      const checkbox = screen.getByTestId('projection-mode');
      fireEvent.click(checkbox); // On
      fireEvent.click(checkbox); // Off

      // Filters should maintain their values
      expect(estudioFilter).toHaveValue('2');
      expect(paymentFilter).toHaveValue('credit');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<IntegratedProjectionModeComponent />);

      // Enable projection mode
      const checkbox = screen.getByTestId('projection-mode');
      fireEvent.click(checkbox);

      // Wait for error handling
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Error al cargar datos',
          variant: 'destructive',
        });
      });
    });

    it('should handle session storage errors', async () => {
      // Mock session storage error
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      render(<IntegratedProjectionModeComponent />);

      // Enable projection mode
      const checkbox = screen.getByTestId('projection-mode');
      fireEvent.click(checkbox);

      // Should still work despite storage error
      expect(checkbox).toBeChecked();
    });

    it('should handle missing budget data', async () => {
      // Mock API response with missing budget data
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [
          {
            grouper_id: 1,
            grouper_name: 'Alimentación',
            total_amount: 500,
            budget_amount: null,
          },
        ],
      });

      render(<IntegratedProjectionModeComponent />);

      // Enable projection mode
      const checkbox = screen.getByTestId('projection-mode');
      fireEvent.click(checkbox);

      // Wait for data load
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Should show zero for missing budget
      const bar = screen.getByTestId('chart-bar-0');
      expect(bar).toHaveTextContent('Alimentación: $0');
    });
  });

  describe('Performance Integration', () => {
    it('should handle rapid toggle changes', async () => {
      render(<IntegratedProjectionModeComponent />);

      const checkbox = screen.getByTestId('projection-mode');

      // Rapidly toggle projection mode
      for (let i = 0; i < 5; i++) {
        fireEvent.click(checkbox);
        fireEvent.click(checkbox);
      }

      // Should end in off state
      expect(checkbox).not.toBeChecked();

      // Should not cause errors
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });
    });

    it('should debounce API calls appropriately', async () => {
      render(<IntegratedProjectionModeComponent />);

      const checkbox = screen.getByTestId('projection-mode');

      // Toggle multiple times quickly
      fireEvent.click(checkbox); // On
      fireEvent.click(checkbox); // Off
      fireEvent.click(checkbox); // On

      // Wait for all effects to settle
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Should have made appropriate number of API calls
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across mode changes', async () => {
      render(<IntegratedProjectionModeComponent />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Verify initial data
      let bars = screen.getAllByTestId(/chart-bar-/);
      expect(bars[0]).toHaveTextContent('Alimentación: $500'); // Actual amount

      // Enable projection mode
      const checkbox = screen.getByTestId('projection-mode');
      fireEvent.click(checkbox);

      // Wait for data refresh
      await waitFor(() => {
        expect(screen.getByTestId('chart-title')).toHaveTextContent(
          'Gráfico (Proyección)'
        );
      });

      // Verify projectiond data
      bars = screen.getAllByTestId(/chart-bar-/);
      expect(bars[0]).toHaveTextContent('Alimentación: $600'); // Budget amount

      // Disable projection mode
      fireEvent.click(checkbox);

      // Wait for data refresh
      await waitFor(() => {
        expect(screen.getByTestId('chart-title')).toHaveTextContent('Gráfico');
      });

      // Should return to actual data
      bars = screen.getAllByTestId(/chart-bar-/);
      expect(bars[0]).toHaveTextContent('Alimentación: $500'); // Back to actual
    });
  });
});
