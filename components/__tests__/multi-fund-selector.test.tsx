import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  MultiFundSelector,
  validateFundSelection,
  getFundSelectionSummary,
} from "../multi-fund-selector";
import { Fund } from "@/types/funds";

// Mock the budget context
jest.mock("@/context/budget-context", () => ({
  useBudget: () => ({
    funds: mockFunds,
    isLoading: false,
    error: null,
  }),
}));

const mockFunds: Fund[] = [
  {
    id: "1",
    name: "Fondo Principal",
    description: "Fondo principal de gastos",
    initial_balance: 1000,
    current_balance: 800,
    start_date: "2024-01-01",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Fondo Emergencia",
    description: "Fondo para emergencias",
    initial_balance: 500,
    current_balance: 500,
    start_date: "2024-01-01",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "3",
    name: "Fondo Vacaciones",
    initial_balance: 300,
    current_balance: 250,
    start_date: "2024-01-01",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

describe("MultiFundSelector", () => {
  const mockOnFundsChange = jest.fn();

  beforeEach(() => {
    mockOnFundsChange.mockClear();
  });

  it("renders with placeholder when no funds selected", () => {
    render(
      <MultiFundSelector
        selectedFunds={[]}
        onFundsChange={mockOnFundsChange}
        placeholder="Seleccionar fondos..."
      />
    );

    expect(screen.getByText("Seleccionar fondos...")).toBeInTheDocument();
  });

  it("displays selected funds as badges", () => {
    render(
      <MultiFundSelector
        selectedFunds={[mockFunds[0], mockFunds[1]]}
        onFundsChange={mockOnFundsChange}
      />
    );

    expect(screen.getByText("Fondo Principal")).toBeInTheDocument();
    expect(screen.getByText("Fondo Emergencia")).toBeInTheDocument();
    expect(screen.getByText("2 fondos seleccionados")).toBeInTheDocument();
  });

  it("opens dropdown and shows available funds", async () => {
    render(
      <MultiFundSelector
        selectedFunds={[]}
        onFundsChange={mockOnFundsChange}
        availableFunds={mockFunds}
      />
    );

    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("Fondo Principal")).toBeInTheDocument();
      expect(screen.getByText("Fondo Emergencia")).toBeInTheDocument();
      expect(screen.getByText("Fondo Vacaciones")).toBeInTheDocument();
    });
  });

  it("allows selecting and deselecting funds", async () => {
    render(
      <MultiFundSelector
        selectedFunds={[]}
        onFundsChange={mockOnFundsChange}
        availableFunds={mockFunds}
      />
    );

    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    await waitFor(() => {
      const fundOption = screen.getByText("Fondo Principal");
      fireEvent.click(fundOption);
    });

    expect(mockOnFundsChange).toHaveBeenCalledWith([mockFunds[0]]);
  });

  it("removes fund when X button is clicked", () => {
    render(
      <MultiFundSelector
        selectedFunds={[mockFunds[0]]}
        onFundsChange={mockOnFundsChange}
      />
    );

    const removeButton = screen.getByLabelText("Remover Fondo Principal");
    fireEvent.click(removeButton);

    expect(mockOnFundsChange).toHaveBeenCalledWith([]);
  });

  it("respects max selection limit", async () => {
    render(
      <MultiFundSelector
        selectedFunds={[mockFunds[0]]}
        onFundsChange={mockOnFundsChange}
        availableFunds={mockFunds}
        maxSelection={1}
      />
    );

    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    await waitFor(() => {
      const fundOption = screen.getByText("Fondo Emergencia");
      expect(fundOption.closest(".opacity-50")).toBeTruthy();
    });
  });

  it("filters funds based on search", async () => {
    render(
      <MultiFundSelector
        selectedFunds={[]}
        onFundsChange={mockOnFundsChange}
        availableFunds={mockFunds}
      />
    );

    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText("Buscar fondos...");
      fireEvent.change(searchInput, { target: { value: "Principal" } });
    });

    await waitFor(() => {
      expect(screen.queryByText("Fondo Emergencia")).not.toBeInTheDocument();
      expect(screen.queryByText("Fondo Vacaciones")).not.toBeInTheDocument();
    });
  });
});

describe("validateFundSelection", () => {
  it("validates successful selection", () => {
    const result = validateFundSelection([mockFunds[0]], mockFunds);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("detects invalid funds", () => {
    const invalidFund: Fund = {
      id: "invalid",
      name: "Invalid Fund",
      initial_balance: 0,
      current_balance: 0,
      start_date: "2024-01-01",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = validateFundSelection([invalidFund], mockFunds);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("Invalid Fund");
  });

  it("detects max selection exceeded", () => {
    const result = validateFundSelection(
      [mockFunds[0], mockFunds[1]],
      mockFunds,
      1
    );
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("más de 1 fondos");
  });
});

describe("getFundSelectionSummary", () => {
  it("returns correct summary for no selection", () => {
    expect(getFundSelectionSummary([])).toBe("Ningún fondo seleccionado");
  });

  it("returns fund name for single selection", () => {
    expect(getFundSelectionSummary([mockFunds[0]])).toBe("Fondo Principal");
  });

  it("returns comma-separated names for multiple selection", () => {
    expect(getFundSelectionSummary([mockFunds[0], mockFunds[1]])).toBe(
      "Fondo Principal, Fondo Emergencia"
    );
  });

  it("returns full list for 3 selections", () => {
    const result = getFundSelectionSummary(mockFunds);
    expect(result).toBe("Fondo Principal, Fondo Emergencia, Fondo Vacaciones");
  });

  it("returns truncated summary for more than 3 selections", () => {
    const manyFunds = [
      ...mockFunds,
      {
        id: "4",
        name: "Fondo Extra",
        initial_balance: 100,
        current_balance: 100,
        start_date: "2024-01-01",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ];
    const result = getFundSelectionSummary(manyFunds);
    expect(result).toBe("Fondo Principal, Fondo Emergencia y 2 más");
  });
});
