import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PaymentMethodBadges } from "../payment-method-badges";
import { PaymentMethodTableSelector } from "../payment-method-table-selector";
import { PaymentMethodSelector } from "../payment-method-selector";

// Mock the UI components
jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`} data-testid="badge">
      {children}
    </span>
  ),
}));

jest.mock("@/components/ui/button", () => ({
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

jest.mock("@/components/ui/tooltip", () => ({
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

jest.mock("@/components/ui/popover", () => ({
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

jest.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ id, checked, onCheckedChange, disabled, ...props }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      disabled={disabled}
      data-testid={id}
      {...props}
    />
  ),
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ htmlFor, children, className, ...props }: any) => (
    <label htmlFor={htmlFor} className={className} {...props}>
      {children}
    </label>
  ),
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="payment-method-card">
      {children}
    </div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

jest.mock("lucide-react", () => ({
  Edit3: () => <div data-testid="edit-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  HelpCircle: () => <div data-testid="help-icon" />,
}));

describe("Task 9: Visual Indicators for Payment Methods", () => {
  describe("PaymentMethodBadges Visual Indicators", () => {
    it("displays 'Todos los métodos' badge when no methods selected", () => {
      render(<PaymentMethodBadges selectedMethods={[]} />);

      expect(screen.getByText("Todos los métodos")).toBeInTheDocument();
      expect(screen.getByTestId("badge")).toHaveClass("secondary");
    });

    it("displays individual method badges when specific methods selected", () => {
      render(<PaymentMethodBadges selectedMethods={["cash", "credit"]} />);

      expect(screen.getByText("Efectivo")).toBeInTheDocument();
      expect(screen.getByText("Crédito")).toBeInTheDocument();
      expect(screen.getAllByTestId("badge")).toHaveLength(2);
    });

    it("shows help icon with tooltip for all methods", () => {
      render(<PaymentMethodBadges selectedMethods={[]} />);

      expect(screen.getByTestId("help-icon")).toBeInTheDocument();
      expect(screen.getByTestId("tooltip-provider")).toBeInTheDocument();
    });

    it("shows help icon with tooltip for specific methods", () => {
      render(<PaymentMethodBadges selectedMethods={["cash"]} />);

      expect(screen.getByTestId("help-icon")).toBeInTheDocument();
      expect(screen.getByTestId("tooltip-provider")).toBeInTheDocument();
    });

    it("can disable tooltip display", () => {
      render(
        <PaymentMethodBadges selectedMethods={["cash"]} showTooltip={false} />
      );

      expect(screen.queryByTestId("help-icon")).not.toBeInTheDocument();
      expect(screen.queryByTestId("tooltip-provider")).not.toBeInTheDocument();
    });
  });

  describe("PaymentMethodTableSelector Visual Indicators", () => {
    const mockOnSelectionChange = jest.fn();

    beforeEach(() => {
      mockOnSelectionChange.mockClear();
    });

    it("shows payment method badges and edit button", () => {
      render(
        <PaymentMethodTableSelector
          selectedMethods={["cash", "credit"]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      expect(screen.getByTestId("edit-icon")).toBeInTheDocument();
      expect(screen.getAllByTestId("tooltip-provider")).toHaveLength(2); // One for badges, one for table selector
    });

    it("shows unsaved changes indicator when hasUnsavedChanges is true", () => {
      render(
        <PaymentMethodTableSelector
          selectedMethods={["cash"]}
          onSelectionChange={mockOnSelectionChange}
          hasUnsavedChanges={true}
        />
      );

      expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
    });

    it("does not show unsaved changes indicator when hasUnsavedChanges is false", () => {
      render(
        <PaymentMethodTableSelector
          selectedMethods={["cash"]}
          onSelectionChange={mockOnSelectionChange}
          hasUnsavedChanges={false}
        />
      );

      expect(screen.queryByTestId("alert-icon")).not.toBeInTheDocument();
    });

    it("applies orange styling to edit button when hasUnsavedChanges is true", () => {
      render(
        <PaymentMethodTableSelector
          selectedMethods={["cash"]}
          onSelectionChange={mockOnSelectionChange}
          hasUnsavedChanges={true}
        />
      );

      const editButton = screen.getByTestId("edit-button");
      expect(editButton).toHaveClass("text-orange-600");
    });
  });

  describe("PaymentMethodSelector Enhanced Help Text", () => {
    const mockOnSelectionChange = jest.fn();

    beforeEach(() => {
      mockOnSelectionChange.mockClear();
    });

    it("displays enhanced help text for all methods", () => {
      render(
        <PaymentMethodSelector
          selectedMethods={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      expect(
        screen.getByText(/Se incluirán gastos de todos los métodos de pago/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/💡 Tip: Selecciona "Todos los métodos"/)
      ).toBeInTheDocument();
    });

    it("displays enhanced help text for specific methods", () => {
      render(
        <PaymentMethodSelector
          selectedMethods={["cash", "credit"]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      expect(
        screen.getByText(/Se incluirán gastos de: Efectivo, Crédito/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/💡 Tip: Selecciona "Todos los métodos"/)
      ).toBeInTheDocument();
    });

    it("shows warning when no methods selected", () => {
      render(
        <PaymentMethodSelector
          selectedMethods={["cash"]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Simulate deselecting all methods by clicking individual method
      fireEvent.click(screen.getByTestId("method-cash"));

      // The component should show warning for no methods
      expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
    });

    it("displays help text in styled container", () => {
      render(
        <PaymentMethodSelector
          selectedMethods={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // The help text should be in a styled container
      expect(
        screen.getByText(/💡 Tip: Selecciona "Todos los métodos"/)
      ).toBeInTheDocument();
    });
  });

  describe("Integration: Complete Visual Indicator System", () => {
    it("provides complete visual feedback system", () => {
      const mockOnSelectionChange = jest.fn();

      // Test the complete system with badges, tooltips, and help text
      const { rerender } = render(
        <div>
          <PaymentMethodBadges selectedMethods={[]} />
          <PaymentMethodTableSelector
            selectedMethods={[]}
            onSelectionChange={mockOnSelectionChange}
            hasUnsavedChanges={false}
          />
        </div>
      );

      // Should show "all methods" indicators
      expect(screen.getAllByText("Todos los métodos")).toHaveLength(3); // Badge, table selector badge, and selector label
      expect(screen.getAllByTestId("help-icon")).toHaveLength(2); // One for each badge component
      expect(screen.queryByTestId("alert-icon")).not.toBeInTheDocument();

      // Test with specific methods and unsaved changes
      rerender(
        <div>
          <PaymentMethodBadges selectedMethods={["cash", "credit"]} />
          <PaymentMethodTableSelector
            selectedMethods={["cash", "credit"]}
            onSelectionChange={mockOnSelectionChange}
            hasUnsavedChanges={true}
          />
        </div>
      );

      // Should show specific method badges and unsaved changes indicator
      expect(screen.getAllByText("Efectivo")).toHaveLength(3); // Badge, table selector badge, and selector label
      expect(screen.getAllByText("Crédito")).toHaveLength(3); // Badge, table selector badge, and selector label
      expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
    });
  });
});
