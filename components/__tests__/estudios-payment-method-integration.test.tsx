import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PaymentMethodSelector } from "../payment-method-selector";

// Mock the UI components
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

describe("PaymentMethodSelector Integration", () => {
  const mockOnSelectionChange = jest.fn();

  beforeEach(() => {
    mockOnSelectionChange.mockClear();
  });

  it("renders with default state (all methods selected)", () => {
    render(
      <PaymentMethodSelector
        selectedMethods={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByText("Métodos de Pago")).toBeInTheDocument();
    expect(screen.getByText("Todos los métodos")).toBeInTheDocument();
    expect(screen.getByTestId("all-methods")).toBeChecked();

    // Individual methods should be disabled when "all methods" is selected
    expect(screen.getByTestId("method-cash")).toBeDisabled();
    expect(screen.getByTestId("method-credit")).toBeDisabled();
    expect(screen.getByTestId("method-debit")).toBeDisabled();
  });

  it("renders with specific methods selected", () => {
    render(
      <PaymentMethodSelector
        selectedMethods={["cash", "credit"]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByTestId("all-methods")).not.toBeChecked();
    expect(screen.getByTestId("method-cash")).toBeChecked();
    expect(screen.getByTestId("method-credit")).toBeChecked();
    expect(screen.getByTestId("method-debit")).not.toBeChecked();
  });

  it("handles selecting all methods", () => {
    render(
      <PaymentMethodSelector
        selectedMethods={["cash"]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    fireEvent.click(screen.getByTestId("all-methods"));
    expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
  });

  it("handles deselecting all methods", () => {
    render(
      <PaymentMethodSelector
        selectedMethods={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    fireEvent.click(screen.getByTestId("all-methods"));
    expect(mockOnSelectionChange).toHaveBeenCalledWith([
      "cash",
      "credit",
      "debit",
    ]);
  });

  it("handles individual method selection", () => {
    render(
      <PaymentMethodSelector
        selectedMethods={["cash"]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    fireEvent.click(screen.getByTestId("method-credit"));
    expect(mockOnSelectionChange).toHaveBeenCalledWith(["cash", "credit"]);
  });

  it("handles individual method deselection", () => {
    render(
      <PaymentMethodSelector
        selectedMethods={["cash", "credit"]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    fireEvent.click(screen.getByTestId("method-cash"));
    expect(mockOnSelectionChange).toHaveBeenCalledWith(["credit"]);
  });

  it("displays correct helper text for selected methods", () => {
    render(
      <PaymentMethodSelector
        selectedMethods={["cash", "debit"]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(
      screen.getByText(/Se incluirán gastos de: Efectivo, Débito/)
    ).toBeInTheDocument();
  });

  it("displays correct helper text for all methods", () => {
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

  it("displays enhanced tip text", () => {
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

  it("respects disabled prop", () => {
    render(
      <PaymentMethodSelector
        selectedMethods={["cash"]}
        onSelectionChange={mockOnSelectionChange}
        disabled={true}
      />
    );

    expect(screen.getByTestId("all-methods")).toBeDisabled();
    expect(screen.getByTestId("method-cash")).toBeDisabled();
    expect(screen.getByTestId("method-credit")).toBeDisabled();
    expect(screen.getByTestId("method-debit")).toBeDisabled();
  });

  it("uses custom label when provided", () => {
    render(
      <PaymentMethodSelector
        selectedMethods={[]}
        onSelectionChange={mockOnSelectionChange}
        label="Custom Payment Methods"
      />
    );

    expect(screen.getByText("Custom Payment Methods")).toBeInTheDocument();
  });
});
