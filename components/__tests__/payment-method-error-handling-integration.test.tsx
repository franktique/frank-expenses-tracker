import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PaymentMethodErrorBoundary } from "../payment-method-error-boundary";
import { PaymentMethodSelector } from "../payment-method-selector";
import { PaymentMethodErrorHandler } from "../payment-method-error-handler";
import {
  usePaymentMethodValidation,
  usePaymentMethodApi,
} from "../../hooks/use-payment-method-validation";

// Mock toast
jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

// Test component that uses validation hook
const ValidationTestComponent = () => {
  const { methods, setMethods, isValid, errors, warnings, hasUserInteracted } =
    usePaymentMethodValidation({
      validateOnChange: true,
      sanitizeOnChange: false,
    });

  return (
    <div>
      <div data-testid="methods">{JSON.stringify(methods)}</div>
      <div data-testid="is-valid">{isValid.toString()}</div>
      <div data-testid="errors">{JSON.stringify(errors)}</div>
      <div data-testid="warnings">{JSON.stringify(warnings)}</div>
      <div data-testid="has-interacted">{hasUserInteracted.toString()}</div>
      <button onClick={() => setMethods(["cash", "credit"])}>
        Set Valid Methods
      </button>
      <button onClick={() => setMethods(["invalid"])}>
        Set Invalid Methods
      </button>
      <button onClick={() => setMethods([])}>Set Empty Methods</button>
    </div>
  );
};

// Test component that uses API hook
const ApiTestComponent = () => {
  const { isLoading, error, handleApiCall, canRetry, retry, clearError } =
    usePaymentMethodApi({
      onSuccess: (data) => console.log("Success:", data),
      onError: (error) => console.log("Error:", error),
    });

  const makeSuccessfulCall = () => {
    handleApiCall(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response)
    );
  };

  const makeFailedCall = () => {
    handleApiCall(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: "Test error",
            code: "TEST_ERROR",
            retryable: true,
          }),
      } as Response)
    );
  };

  const makeNetworkError = () => {
    handleApiCall(() => Promise.reject(new Error("Network error")));
  };

  return (
    <div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <div data-testid="error">{error ? JSON.stringify(error) : "null"}</div>
      <div data-testid="can-retry">{canRetry.toString()}</div>
      <button onClick={makeSuccessfulCall}>Make Successful Call</button>
      <button onClick={makeFailedCall}>Make Failed Call</button>
      <button onClick={makeNetworkError}>Make Network Error</button>
      <button onClick={() => retry(() => Promise.resolve({} as Response))}>
        Retry
      </button>
      <button onClick={clearError}>Clear Error</button>
    </div>
  );
};

describe("Payment Method Error Handling Integration", () => {
  describe("Validation Integration", () => {
    it("should handle validation lifecycle correctly", async () => {
      render(<ValidationTestComponent />);

      // Initial state - empty array should be invalid
      expect(screen.getByTestId("is-valid")).toHaveTextContent("false");
      expect(screen.getByTestId("has-interacted")).toHaveTextContent("false");

      // Set valid methods
      fireEvent.click(screen.getByText("Set Valid Methods"));

      await waitFor(() => {
        expect(screen.getByTestId("is-valid")).toHaveTextContent("true");
        expect(screen.getByTestId("has-interacted")).toHaveTextContent("true");
        expect(screen.getByTestId("methods")).toHaveTextContent(
          '["cash","credit"]'
        );
      });

      // Set invalid methods
      fireEvent.click(screen.getByText("Set Invalid Methods"));

      await waitFor(() => {
        expect(screen.getByTestId("is-valid")).toHaveTextContent("false");
        expect(
          JSON.parse(screen.getByTestId("errors").textContent!)
        ).toHaveLength(1);
      });

      // Set empty methods
      fireEvent.click(screen.getByText("Set Empty Methods"));

      await waitFor(() => {
        expect(screen.getByTestId("is-valid")).toHaveTextContent("false");
        expect(
          JSON.parse(screen.getByTestId("errors").textContent!)
        ).toHaveLength(1);
      });
    });
  });

  describe("API Error Handling Integration", () => {
    it("should handle API call lifecycle correctly", async () => {
      render(<ApiTestComponent />);

      // Initial state
      expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
      expect(screen.getByTestId("error")).toHaveTextContent("null");
      expect(screen.getByTestId("can-retry")).toHaveTextContent("false");

      // Make successful call
      fireEvent.click(screen.getByText("Make Successful Call"));

      await waitFor(() => {
        expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
        expect(screen.getByTestId("error")).toHaveTextContent("null");
      });

      // Make failed call
      fireEvent.click(screen.getByText("Make Failed Call"));

      await waitFor(() => {
        expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
        expect(screen.getByTestId("error")).not.toHaveTextContent("null");
        expect(screen.getByTestId("can-retry")).toHaveTextContent("true");
      });

      // Clear error
      fireEvent.click(screen.getByText("Clear Error"));

      await waitFor(() => {
        expect(screen.getByTestId("error")).toHaveTextContent("null");
        expect(screen.getByTestId("can-retry")).toHaveTextContent("false");
      });

      // Make network error
      fireEvent.click(screen.getByText("Make Network Error"));

      await waitFor(() => {
        expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
        const errorData = JSON.parse(screen.getByTestId("error").textContent!);
        expect(errorData.code).toBe("NETWORK_ERROR");
        expect(errorData.retryable).toBe(true);
      });
    });
  });

  describe("Error Boundary Integration", () => {
    it("should catch and display errors from payment method components", () => {
      const ThrowingComponent = () => {
        throw new Error("Payment method component error");
      };

      render(
        <PaymentMethodErrorBoundary>
          <ThrowingComponent />
        </PaymentMethodErrorBoundary>
      );

      expect(screen.getByText("Error en Métodos de Pago")).toBeInTheDocument();
      expect(
        screen.getByText(/Ocurrió un error al cargar o procesar/)
      ).toBeInTheDocument();
    });

    it("should provide retry functionality", () => {
      let shouldThrow = true;
      const ConditionalThrowingComponent = () => {
        if (shouldThrow) {
          throw new Error("Conditional error");
        }
        return <div>Success!</div>;
      };

      const { rerender } = render(
        <PaymentMethodErrorBoundary>
          <ConditionalThrowingComponent />
        </PaymentMethodErrorBoundary>
      );

      // Should show error initially
      expect(screen.getByText("Error en Métodos de Pago")).toBeInTheDocument();

      // Fix the error condition
      shouldThrow = false;

      // Click retry
      const retryButton = screen.getByText(/Reintentar/);
      fireEvent.click(retryButton);

      // Re-render with fixed condition
      rerender(
        <PaymentMethodErrorBoundary>
          <ConditionalThrowingComponent />
        </PaymentMethodErrorBoundary>
      );

      // Should show success now
      expect(screen.getByText("Success!")).toBeInTheDocument();
    });
  });

  describe("Error Handler Component Integration", () => {
    it("should display different error types correctly", () => {
      const networkError = {
        error: "Network connection failed",
        code: "NETWORK_ERROR" as const,
        retryable: true,
      };

      const { rerender } = render(
        <PaymentMethodErrorHandler
          error={networkError}
          canRetry={true}
          onRetry={() => {}}
        />
      );

      expect(screen.getByText("Error de Conexión")).toBeInTheDocument();
      expect(screen.getByText("NETWORK_ERROR")).toBeInTheDocument();
      expect(screen.getByText(/Reintentar/)).toBeInTheDocument();

      // Test validation error
      const validationError = {
        error: "Invalid payment methods",
        code: "INVALID_METHODS" as const,
        retryable: false,
      };

      rerender(
        <PaymentMethodErrorHandler error={validationError} canRetry={false} />
      );

      expect(screen.getByText("Error de Validación")).toBeInTheDocument();
      expect(screen.getByText("INVALID_METHODS")).toBeInTheDocument();
      expect(screen.queryByText(/Reintentar/)).not.toBeInTheDocument();
    });

    it("should handle retry functionality", () => {
      const onRetry = jest.fn();
      const error = {
        error: "Retryable error",
        code: "TEST_ERROR" as const,
        retryable: true,
      };

      render(
        <PaymentMethodErrorHandler
          error={error}
          canRetry={true}
          onRetry={onRetry}
          retryCount={1}
          maxRetries={3}
        />
      );

      const retryButton = screen.getByText(/Reintentar/);
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe("PaymentMethodSelector with Error Handling", () => {
    it("should show validation errors when enabled", () => {
      const onSelectionChange = jest.fn();
      const onValidationChange = jest.fn();

      render(
        <PaymentMethodSelector
          selectedMethods={[]}
          onSelectionChange={onSelectionChange}
          showValidation={true}
          onValidationChange={onValidationChange}
        />
      );

      // Select a method to trigger user interaction
      const cashCheckbox = screen.getByLabelText("Efectivo");
      fireEvent.click(cashCheckbox);

      expect(onSelectionChange).toHaveBeenCalled();
      expect(onValidationChange).toHaveBeenCalled();
    });

    it("should be wrapped in error boundary", () => {
      const ThrowingSelector = () => {
        throw new Error("Selector error");
      };

      render(
        <PaymentMethodErrorBoundary>
          <ThrowingSelector />
        </PaymentMethodErrorBoundary>
      );

      expect(screen.getByText("Error en Métodos de Pago")).toBeInTheDocument();
    });
  });
});
