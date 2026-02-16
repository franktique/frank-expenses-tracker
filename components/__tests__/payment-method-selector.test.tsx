import { render, screen, fireEvent } from '@testing-library/react';
import {
  PaymentMethodSelector,
  PAYMENT_METHODS,
  PaymentMethod,
} from '../payment-method-selector';

describe('PaymentMethodSelector', () => {
  const mockOnSelectionChange = jest.fn();

  beforeEach(() => {
    mockOnSelectionChange.mockClear();
  });

  describe('Initial Rendering', () => {
    it('renders with default label', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      expect(screen.getByText('Métodos de Pago')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={[]}
          onSelectionChange={mockOnSelectionChange}
          label="Custom Payment Methods"
        />
      );

      expect(screen.getByText('Custom Payment Methods')).toBeInTheDocument();
    });

    it('renders all payment method options', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      expect(screen.getByText('Todos los métodos')).toBeInTheDocument();
      expect(screen.getByText('Efectivo')).toBeInTheDocument();
      expect(screen.getByText('Crédito')).toBeInTheDocument();
      expect(screen.getByText('Débito')).toBeInTheDocument();
    });
  });

  describe('All Methods Selection', () => {
    it('shows "All Methods" as checked when no specific methods are selected', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const allMethodsCheckbox = screen.getByRole('checkbox', {
        name: /todos los métodos/i,
      });
      expect(allMethodsCheckbox).toBeChecked();
    });

    it('shows individual methods as disabled when "All Methods" is selected', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const cashCheckbox = screen.getByRole('checkbox', { name: /efectivo/i });
      const creditCheckbox = screen.getByRole('checkbox', { name: /crédito/i });
      const debitCheckbox = screen.getByRole('checkbox', { name: /débito/i });

      expect(cashCheckbox).toBeDisabled();
      expect(creditCheckbox).toBeDisabled();
      expect(debitCheckbox).toBeDisabled();
    });

    it('calls onSelectionChange with all methods when unchecking "All Methods"', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const allMethodsCheckbox = screen.getByRole('checkbox', {
        name: /todos los métodos/i,
      });
      fireEvent.click(allMethodsCheckbox);

      expect(mockOnSelectionChange).toHaveBeenCalledWith([
        'cash',
        'credit',
        'debit',
      ]);
    });

    it('calls onSelectionChange with empty array when checking "All Methods"', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={['cash', 'credit']}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const allMethodsCheckbox = screen.getByRole('checkbox', {
        name: /todos los métodos/i,
      });
      fireEvent.click(allMethodsCheckbox);

      expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Individual Method Selection', () => {
    it('shows specific methods as checked when they are in selectedMethods', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={['cash', 'credit']}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const cashCheckbox = screen.getByRole('checkbox', { name: /efectivo/i });
      const creditCheckbox = screen.getByRole('checkbox', { name: /crédito/i });
      const debitCheckbox = screen.getByRole('checkbox', { name: /débito/i });

      expect(cashCheckbox).toBeChecked();
      expect(creditCheckbox).toBeChecked();
      expect(debitCheckbox).not.toBeChecked();
    });

    it('shows "All Methods" as unchecked when specific methods are selected', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={['cash']}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const allMethodsCheckbox = screen.getByRole('checkbox', {
        name: /todos los métodos/i,
      });
      expect(allMethodsCheckbox).not.toBeChecked();
    });

    it('adds method to selection when checking an unchecked method', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={['cash']}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const creditCheckbox = screen.getByRole('checkbox', { name: /crédito/i });
      fireEvent.click(creditCheckbox);

      expect(mockOnSelectionChange).toHaveBeenCalledWith(['cash', 'credit']);
    });

    it('removes method from selection when unchecking a checked method', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={['cash', 'credit']}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const cashCheckbox = screen.getByRole('checkbox', { name: /efectivo/i });
      fireEvent.click(cashCheckbox);

      expect(mockOnSelectionChange).toHaveBeenCalledWith(['credit']);
    });

    it('does not duplicate methods when checking an already selected method', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={['cash']}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const cashCheckbox = screen.getByRole('checkbox', { name: /efectivo/i });
      fireEvent.click(cashCheckbox);

      expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Disabled State', () => {
    it('disables all checkboxes when disabled prop is true', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={['cash']}
          onSelectionChange={mockOnSelectionChange}
          disabled={true}
        />
      );

      const allMethodsCheckbox = screen.getByRole('checkbox', {
        name: /todos los métodos/i,
      });
      const cashCheckbox = screen.getByRole('checkbox', { name: /efectivo/i });
      const creditCheckbox = screen.getByRole('checkbox', { name: /crédito/i });
      const debitCheckbox = screen.getByRole('checkbox', { name: /débito/i });

      expect(allMethodsCheckbox).toBeDisabled();
      expect(cashCheckbox).toBeDisabled();
      expect(creditCheckbox).toBeDisabled();
      expect(debitCheckbox).toBeDisabled();
    });

    it('does not call onSelectionChange when disabled', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={[]}
          onSelectionChange={mockOnSelectionChange}
          disabled={true}
        />
      );

      const allMethodsCheckbox = screen.getByRole('checkbox', {
        name: /todos los métodos/i,
      });
      fireEvent.click(allMethodsCheckbox);

      expect(mockOnSelectionChange).not.toHaveBeenCalled();
    });
  });

  describe('Helper Text', () => {
    it('shows correct helper text when all methods are selected', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      expect(
        screen.getByText(/Se incluirán gastos de todos los métodos de pago/)
      ).toBeInTheDocument();
    });

    it('shows correct helper text when specific methods are selected', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={['cash', 'credit']}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      expect(
        screen.getByText('Se incluirán gastos de: Efectivo, Crédito')
      ).toBeInTheDocument();
    });

    it('shows correct helper text when no methods are specifically selected but not all', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // When selectedMethods is empty, it means "all methods" so should show the all methods text
      expect(
        screen.getByText(/Se incluirán gastos de todos los métodos de pago/)
      ).toBeInTheDocument();
    });

    it('shows enhanced tip text', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      expect(
        screen.getByText(/💡 Tip: Selecciona "Todos los métodos"/)
      ).toBeInTheDocument();
    });
  });

  describe('TypeScript Interfaces', () => {
    it('accepts valid PaymentMethod values', () => {
      const validMethods: PaymentMethod[] = ['cash', 'credit', 'debit'];

      render(
        <PaymentMethodSelector
          selectedMethods={validMethods}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      expect(screen.getByRole('checkbox', { name: /efectivo/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /crédito/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /débito/i })).toBeChecked();
    });
  });

  describe('PAYMENT_METHODS Constant', () => {
    it('exports the correct payment methods', () => {
      expect(PAYMENT_METHODS).toEqual([
        { value: 'cash', label: 'Efectivo' },
        { value: 'credit', label: 'Crédito' },
        { value: 'debit', label: 'Débito' },
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty selectedMethods array correctly', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const allMethodsCheckbox = screen.getByRole('checkbox', {
        name: /todos los métodos/i,
      });
      expect(allMethodsCheckbox).toBeChecked();
    });

    it('handles invalid payment method values gracefully', () => {
      render(
        <PaymentMethodSelector
          selectedMethods={['cash', 'invalid-method' as PaymentMethod]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Should still render without crashing
      expect(screen.getByRole('checkbox', { name: /efectivo/i })).toBeChecked();
    });

    it('applies custom className', () => {
      const { container } = render(
        <PaymentMethodSelector
          selectedMethods={[]}
          onSelectionChange={mockOnSelectionChange}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
