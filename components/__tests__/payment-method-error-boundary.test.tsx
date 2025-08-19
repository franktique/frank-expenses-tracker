import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  PaymentMethodErrorBoundary,
  usePaymentMethodErrorBoundary,
} from "../payment-method-error-boundary";

// Test component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div>No error</div>;
};

// Test component for hook testing
const HookTestComponent = () => {
  const { error, resetError, captureError, hasError } =
    usePaymentMethodErrorBoundary();

  return (
    <div>
      <div data-testid="has-error">{hasError.toString()}</div>
      <div data-testid="error-message">{error?.message || "no error"}</div>
      <button onClick={() => captureError(new Error("Hook test error"))}>
        Capture Error
      </button>
      <button onClick={resetError}>Reset Error</button>
    </div>
  );
};

describe("PaymentMethodErrorBoundary", () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it("should render children when there is no error", () => {
    render(
      <PaymentMethodErrorBoundary>
        <ThrowError shouldThrow={false} />
      </PaymentMethodErrorBoundary>
    );

    expect(screen.getByText("No error")).toBeInTheDocument();
  });

  it("should render error UI when child component throws", () => {
    render(
      <PaymentMethodErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PaymentMethodErrorBoundary>
    );

    expect(screen.getByText("Error en Métodos de Pago")).toBeInTheDocument();
    expect(
      screen.getByText(/Ocurrió un error al cargar o procesar/)
    ).toBeInTheDocument();
  });

  it("should show retry button when retries are available", () => {
    render(
      <PaymentMethodErrorBoundary maxRetries={3}>
        <ThrowError shouldThrow={true} />
      </PaymentMethodErrorBoundary>
    );

    const retryButton = screen.getByText(/Reintentar/);
    expect(retryButton).toBeInTheDocument();
    expect(retryButton.textContent).toContain("(1/3)");
  });

  it("should show reset button when max retries reached", () => {
    const { rerender } = render(
      <PaymentMethodErrorBoundary maxRetries={1}>
        <ThrowError shouldThrow={true} />
      </PaymentMethodErrorBoundary>
    );

    // Click retry to reach max retries
    const retryButton = screen.getByText(/Reintentar/);
    fireEvent.click(retryButton);

    // Should now show reset button
    rerender(
      <PaymentMethodErrorBoundary maxRetries={1}>
        <ThrowError shouldThrow={true} />
      </PaymentMethodErrorBoundary>
    );

    expect(screen.getByText("Restablecer")).toBeInTheDocument();
  });

  it("should call onError callback when error occurs", () => {
    const onError = jest.fn();

    render(
      <PaymentMethodErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </PaymentMethodErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it("should render custom fallback when provided", () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <PaymentMethodErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </PaymentMethodErrorBoundary>
    );

    expect(screen.getByText("Custom error message")).toBeInTheDocument();
    expect(
      screen.queryByText("Error en Métodos de Pago")
    ).not.toBeInTheDocument();
  });

  it("should show technical details in expandable section", () => {
    render(
      <PaymentMethodErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PaymentMethodErrorBoundary>
    );

    const detailsButton = screen.getByText("Detalles técnicos");
    expect(detailsButton).toBeInTheDocument();

    fireEvent.click(detailsButton);
    expect(screen.getByText(/Test error message/)).toBeInTheDocument();
  });

  it("should show suggested solutions", () => {
    render(
      <PaymentMethodErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PaymentMethodErrorBoundary>
    );

    expect(screen.getByText("Soluciones sugeridas:")).toBeInTheDocument();
    expect(
      screen.getByText(/Verifica que los métodos de pago/)
    ).toBeInTheDocument();
  });

  it("should have reload page button", () => {
    // Mock window.location.reload
    const mockReload = jest.fn();
    delete (window as any).location;
    (window as any).location = { reload: mockReload };

    render(
      <PaymentMethodErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PaymentMethodErrorBoundary>
    );

    const reloadButton = screen.getByText("Recargar página");
    fireEvent.click(reloadButton);

    expect(mockReload).toHaveBeenCalled();
  });
});

describe("usePaymentMethodErrorBoundary", () => {
  it("should initialize with no error", () => {
    render(<HookTestComponent />);

    expect(screen.getByTestId("has-error")).toHaveTextContent("false");
    expect(screen.getByTestId("error-message")).toHaveTextContent("no error");
  });

  it("should capture and store errors", () => {
    render(<HookTestComponent />);

    const captureButton = screen.getByText("Capture Error");
    fireEvent.click(captureButton);

    expect(screen.getByTestId("has-error")).toHaveTextContent("true");
    expect(screen.getByTestId("error-message")).toHaveTextContent(
      "Hook test error"
    );
  });

  it("should reset errors", () => {
    render(<HookTestComponent />);

    // First capture an error
    const captureButton = screen.getByText("Capture Error");
    fireEvent.click(captureButton);

    expect(screen.getByTestId("has-error")).toHaveTextContent("true");

    // Then reset it
    const resetButton = screen.getByText("Reset Error");
    fireEvent.click(resetButton);

    expect(screen.getByTestId("has-error")).toHaveTextContent("false");
    expect(screen.getByTestId("error-message")).toHaveTextContent("no error");
  });

  it("should log errors to console", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    render(<HookTestComponent />);

    const captureButton = screen.getByText("Capture Error");
    fireEvent.click(captureButton);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Payment method error captured:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
