import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PaymentMethodTableSelector } from '../payment-method-table-selector';

// Mock the UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid="edit-button"
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open, onOpenChange }: any) => (
    <div data-testid="popover" data-open={open}>
      {children}
    </div>
  ),
  PopoverTrigger: ({ children }: any) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
  PopoverContent: ({ children }: any) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children }: any) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: any) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipProvider: ({ children }: any) => (
    <div data-testid="tooltip-provider">{children}</div>
  ),
}));

jest.mock('lucide-react', () => ({
  Edit3: () => <div data-testid="edit-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
}));

jest.mock('../payment-method-selector', () => ({
  PaymentMethodSelector: ({
    selectedMethods,
    onSelectionChange,
    disabled,
  }: any) => (
    <div data-testid="payment-method-selector">
      <div data-testid="selected-methods">
        {JSON.stringify(selectedMethods)}
      </div>
      <button
        data-testid="change-methods"
        onClick={() => onSelectionChange(['cash', 'credit'])}
        disabled={disabled}
      >
        Change Methods
      </button>
    </div>
  ),
}));

jest.mock('../payment-method-badges', () => ({
  PaymentMethodBadges: ({ selectedMethods }: any) => (
    <div data-testid="payment-method-badges">
      {selectedMethods.length === 0
        ? 'All Methods'
        : selectedMethods.join(', ')}
    </div>
  ),
}));

describe('PaymentMethodTableSelector', () => {
  const mockOnSelectionChange = jest.fn();

  beforeEach(() => {
    mockOnSelectionChange.mockClear();
  });

  it('renders badges and edit button', () => {
    render(
      <PaymentMethodTableSelector
        selectedMethods={['cash', 'credit']}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByTestId('payment-method-badges')).toBeInTheDocument();
    expect(screen.getByTestId('edit-button')).toBeInTheDocument();
    expect(screen.getByText('cash, credit')).toBeInTheDocument();
  });

  it('shows "All Methods" when no methods selected', () => {
    render(
      <PaymentMethodTableSelector
        selectedMethods={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByText('All Methods')).toBeInTheDocument();
  });

  it('shows unsaved changes indicator when hasUnsavedChanges is true', () => {
    render(
      <PaymentMethodTableSelector
        selectedMethods={['cash']}
        onSelectionChange={mockOnSelectionChange}
        hasUnsavedChanges={true}
      />
    );

    const alertIcon = screen.getByTestId('alert-icon');
    expect(alertIcon).toBeInTheDocument();
  });

  it('does not show unsaved changes indicator when hasUnsavedChanges is false', () => {
    render(
      <PaymentMethodTableSelector
        selectedMethods={['cash']}
        onSelectionChange={mockOnSelectionChange}
        hasUnsavedChanges={false}
      />
    );

    expect(screen.queryByTestId('alert-icon')).not.toBeInTheDocument();
  });

  it('applies orange styling to edit button when hasUnsavedChanges is true', () => {
    render(
      <PaymentMethodTableSelector
        selectedMethods={['cash']}
        onSelectionChange={mockOnSelectionChange}
        hasUnsavedChanges={true}
      />
    );

    const editButton = screen.getByTestId('edit-button');
    expect(editButton).toHaveClass('text-orange-600');
  });

  it('disables edit button when disabled prop is true', () => {
    render(
      <PaymentMethodTableSelector
        selectedMethods={['cash']}
        onSelectionChange={mockOnSelectionChange}
        disabled={true}
      />
    );

    const editButton = screen.getByTestId('edit-button');
    expect(editButton).toBeDisabled();
  });

  it('calls onSelectionChange when methods are changed in selector', () => {
    render(
      <PaymentMethodTableSelector
        selectedMethods={['cash']}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const changeButton = screen.getByTestId('change-methods');
    fireEvent.click(changeButton);

    expect(mockOnSelectionChange).toHaveBeenCalledWith(['cash', 'credit']);
  });

  it('passes disabled prop to PaymentMethodSelector', () => {
    render(
      <PaymentMethodTableSelector
        selectedMethods={['cash']}
        onSelectionChange={mockOnSelectionChange}
        disabled={true}
      />
    );

    const changeButton = screen.getByTestId('change-methods');
    expect(changeButton).toBeDisabled();
  });

  it('shows tooltip provider', () => {
    render(
      <PaymentMethodTableSelector
        selectedMethods={['cash']}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument();
  });

  it('shows edit icon', () => {
    render(
      <PaymentMethodTableSelector
        selectedMethods={['cash']}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
  });
});
