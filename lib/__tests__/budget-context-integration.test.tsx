/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { BudgetProvider, useBudget } from '../../context/budget-context';
import { ActivePeriodStorage } from '../active-period-storage';
import { Period } from '../../types/funds';

// Mock the active period storage
jest.mock('../active-period-storage');
const mockActiveStorage = ActivePeriodStorage as jest.Mocked<
  typeof ActivePeriodStorage
>;

// Mock the active period service
jest.mock('../active-period-service');

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Test component that uses the budget context
const TestComponent = () => {
  const { activePeriod, isLoading, validateActivePeriodCache } = useBudget();

  return (
    <div>
      <div data-testid="active-period">
        {activePeriod ? activePeriod.name : 'No active period'}
      </div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not loading'}</div>
      <button
        data-testid="validate-cache"
        onClick={() => validateActivePeriodCache()}
      >
        Validate Cache
      </button>
    </div>
  );
};

describe('Budget Context Session Storage Integration', () => {
  const mockPeriod: Period = {
    id: '1',
    name: 'Test Period',
    month: 1,
    year: 2024,
    is_open: true,
    isOpen: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful database status check
    mockFetch.mockImplementation((url) => {
      if (url === '/api/check-db-status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ connected: true, initialized: true }),
        } as Response);
      }

      // Mock empty responses for other API calls
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should load cached active period on startup', async () => {
    // Setup: Mock cached period exists
    mockActiveStorage.loadActivePeriod.mockReturnValue(mockPeriod);

    const { getByTestId } = render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    // Should immediately show cached period
    expect(getByTestId('active-period')).toHaveTextContent('Test Period');

    // Verify storage was called
    expect(mockActiveStorage.loadActivePeriod).toHaveBeenCalled();
  });

  it('should handle missing cached period gracefully', async () => {
    // Setup: No cached period
    mockActiveStorage.loadActivePeriod.mockReturnValue(null);

    const { getByTestId } = render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    // Should show no active period initially
    expect(getByTestId('active-period')).toHaveTextContent('No active period');

    // Verify storage was called
    expect(mockActiveStorage.loadActivePeriod).toHaveBeenCalled();
  });

  it('should handle storage errors gracefully', async () => {
    // Setup: Storage throws error
    mockActiveStorage.loadActivePeriod.mockImplementation(() => {
      throw new Error('Storage error');
    });

    const { getByTestId } = render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    // Should handle error gracefully
    expect(getByTestId('active-period')).toHaveTextContent('No active period');

    // Should clear corrupted cache
    expect(mockActiveStorage.clearActivePeriod).toHaveBeenCalled();
  });

  it('should provide validateActivePeriodCache function', async () => {
    mockActiveStorage.loadActivePeriod.mockReturnValue(null);
    mockActiveStorage.isActivePeriodCached.mockReturnValue(false);

    const { getByTestId } = render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    // Should have the validate cache button
    expect(getByTestId('validate-cache')).toBeInTheDocument();
  });

  it('should synchronize with server data during refresh', async () => {
    // Setup: Mock server response with active period
    mockFetch.mockImplementation((url) => {
      if (url === '/api/check-db-status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ connected: true, initialized: true }),
        } as Response);
      }

      if (url === '/api/periods') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockPeriod]),
        } as Response);
      }

      // Mock empty responses for other API calls
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);
    });

    mockActiveStorage.loadActivePeriod.mockReturnValue(null);

    const { getByTestId } = render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(getByTestId('loading')).toHaveTextContent('Not loading');
    });

    // Should save period to storage after loading from server
    expect(mockActiveStorage.saveActivePeriod).toHaveBeenCalledWith(mockPeriod);
  });
});
