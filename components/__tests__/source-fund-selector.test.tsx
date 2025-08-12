import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  SourceFundSelector,
  validateSourceFund,
} from "../source-fund-selector";
import { useBudget } from "@/context/budget-context";
import { Fund } from "@/types/funds";

// Mock the budget context
jest.mock("@/context/budget-context");
const mockUseBudget = useBudget as jest.MockedFunction<typeof useBudget>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Sample test data
const mockFunds: Fund[] = [
  {
    id: "fund-1",
    name: "Efectivo",
    description: "Dinero en efectivo",
    initial_balance: 1000,
    current_balance: 1500,
    start_date: "2024-01-01",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "fund-2",
    name: "Banco",
    description: "Cuenta bancaria",
    initial_balance: 5000,
    current_balance: 4500,
    start_date: "2024-01-01",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const mockCategoryFunds = [mockFunds[0]]; // Only "Efectivo" is related to category

describe("SourceFundSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBudget.mockReturnValue({
      funds: mockFunds,
      isLoading: false,
      error: null,
    } as any);

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ funds: mockCategoryFunds }),
    } as Response);
  });

  it("renders disabled state when no category is selected", () => {
    render(
      <SourceFundSelector
        selectedCategoryId={null}
        selectedSourceFund={null}
        onSourceFundChange={jest.fn()}
      />
    );

    const button = screen.getByRole("combobox");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Seleccione una categoría primero");
  });

  it("fetches and displays category funds when category is selected", async () => {
    const mockOnChange = jest.fn();

    render(
      <SourceFundSelector
        selectedCategoryId="category-1"
        selectedSourceFund={null}
        onSourceFundChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/categories/category-1/funds"
      );
    });

    // Wait for loading to complete
    await waitFor(() => {
      const button = screen.getByRole("combobox");
      expect(button).not.toBeDisabled();
    });
  });

  it("auto-selects fund when category has only one related fund", async () => {
    const mockOnChange = jest.fn();

    render(
      <SourceFundSelector
        selectedCategoryId="category-1"
        selectedSourceFund={null}
        onSourceFundChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(mockCategoryFunds[0]);
    });
  });

  it("uses current fund filter as smart default when available", async () => {
    const mockOnChange = jest.fn();
    const multipleFunds = [mockFunds[0], mockFunds[1]];

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ funds: multipleFunds }),
    } as Response);

    render(
      <SourceFundSelector
        selectedCategoryId="category-1"
        selectedSourceFund={null}
        onSourceFundChange={mockOnChange}
        currentFundFilter={mockFunds[1]} // Banco
      />
    );

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(mockFunds[1]);
    });
  });

  it("displays error when category has no associated funds", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ funds: [] }),
    } as Response);

    render(
      <SourceFundSelector
        selectedCategoryId="category-1"
        selectedSourceFund={null}
        onSourceFundChange={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("No hay fondos asociados a esta categoría")
      ).toBeInTheDocument();
    });
  });

  it("clears selection when category changes and current fund is no longer valid", async () => {
    const mockOnChange = jest.fn();
    const { rerender } = render(
      <SourceFundSelector
        selectedCategoryId="category-1"
        selectedSourceFund={mockFunds[1]} // Banco (not in category funds)
        onSourceFundChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/categories/category-1/funds"
      );
    });

    // Should clear selection since Banco is not in category funds
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(null);
    });
  });

  it("shows validation error when required and no fund selected", async () => {
    render(
      <SourceFundSelector
        selectedCategoryId="category-1"
        selectedSourceFund={null}
        onSourceFundChange={jest.fn()}
        error="Debe seleccionar un fondo origen para el gasto"
      />
    );

    // Wait for loading to complete first
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/categories/category-1/funds"
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText("Debe seleccionar un fondo origen para el gasto")
      ).toBeInTheDocument();
    });
  });

  it("renders with correct placeholder and button state", async () => {
    const mockOnChange = jest.fn();

    render(
      <SourceFundSelector
        selectedCategoryId="category-1"
        selectedSourceFund={null}
        onSourceFundChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Wait for component to finish loading
    await waitFor(() => {
      const button = screen.getByRole("combobox");
      expect(button).toHaveTextContent("Seleccionar fondo origen...");
      expect(button).not.toBeDisabled();
    });
  });
});

describe("validateSourceFund", () => {
  it("returns invalid when required fund is not selected", () => {
    const result = validateSourceFund(null, mockCategoryFunds, true);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Debe seleccionar un fondo origen para el gasto");
  });

  it("returns valid when fund is not required and not selected", () => {
    const result = validateSourceFund(null, mockCategoryFunds, false);
    expect(result.isValid).toBe(true);
  });

  it("returns invalid when selected fund is not in category funds", () => {
    const result = validateSourceFund(mockFunds[1], mockCategoryFunds, true);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(
      "El fondo origen seleccionado no está asociado con esta categoría"
    );
  });

  it("returns valid when selected fund is in category funds", () => {
    const result = validateSourceFund(mockFunds[0], mockCategoryFunds, true);
    expect(result.isValid).toBe(true);
  });
});
