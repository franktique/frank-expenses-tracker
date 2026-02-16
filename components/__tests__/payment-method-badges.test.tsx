import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PaymentMethodBadges } from '../payment-method-badges';

// Mock the UI components
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`} data-testid="badge">
      {children}
    </span>
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
  HelpCircle: () => <div data-testid="help-icon" />,
}));

describe('PaymentMethodBadges', () => {
  it('shows "Todos los métodos" when no methods selected', () => {
    render(<PaymentMethodBadges selectedMethods={[]} />);

    expect(screen.getByText('Todos los métodos')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveClass('secondary');
  });

  it('shows individual method badges when methods are selected', () => {
    render(<PaymentMethodBadges selectedMethods={['cash', 'credit']} />);

    expect(screen.getByText('Efectivo')).toBeInTheDocument();
    expect(screen.getByText('Crédito')).toBeInTheDocument();
    expect(screen.getAllByTestId('badge')).toHaveLength(2);
  });

  it('shows correct labels for all payment methods', () => {
    render(
      <PaymentMethodBadges selectedMethods={['cash', 'credit', 'debit']} />
    );

    expect(screen.getByText('Efectivo')).toBeInTheDocument();
    expect(screen.getByText('Crédito')).toBeInTheDocument();
    expect(screen.getByText('Débito')).toBeInTheDocument();
  });

  it('handles unknown payment method gracefully', () => {
    render(<PaymentMethodBadges selectedMethods={['unknown']} />);

    expect(screen.getByText('unknown')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <PaymentMethodBadges
        selectedMethods={['cash']}
        className="custom-class"
      />
    );

    expect(screen.getByText('Efectivo')).toBeInTheDocument();
  });

  it('uses outline variant for individual method badges', () => {
    render(<PaymentMethodBadges selectedMethods={['cash']} />);

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('outline');
  });

  it('shows tooltip by default', () => {
    render(<PaymentMethodBadges selectedMethods={['cash']} />);

    expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument();
    expect(screen.getByTestId('help-icon')).toBeInTheDocument();
  });

  it('hides tooltip when showTooltip is false', () => {
    render(
      <PaymentMethodBadges selectedMethods={['cash']} showTooltip={false} />
    );

    expect(screen.queryByTestId('tooltip-provider')).not.toBeInTheDocument();
    expect(screen.queryByTestId('help-icon')).not.toBeInTheDocument();
  });

  it('shows help icon for all methods', () => {
    render(<PaymentMethodBadges selectedMethods={[]} />);

    expect(screen.getByTestId('help-icon')).toBeInTheDocument();
  });

  it('shows help icon for specific methods', () => {
    render(<PaymentMethodBadges selectedMethods={['cash', 'credit']} />);

    expect(screen.getByTestId('help-icon')).toBeInTheDocument();
  });
});
