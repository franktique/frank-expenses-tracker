import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CreditCardSelector,
  validateCreditCard,
  useCreditCardSelection,
} from "@/components/credit-card-selector";
import { CreditCard } from "@/types/credit-cards";

// Mock fetch
global.fetch = jest.fn();

// Mock credit cards data
const mockCreditCards: CreditCard[] = [
  {
    id: "1",
    bank_name: "Banco de Bogotá",
    franchise: "visa",
    last_four_digits: "1234",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    bank_name: "Bancolombia",
    franchise: "mastercard",
    last_four_digits: "5678",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "3",
    bank_name: "BBVA",
    franchise: "american_express",
    last_four_digits: "9012",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

describe("CreditCardSelector", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ credit_cards: mockCreditCards }),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders with default placeholder", async () => {
    render(
      <CreditCardSelector
        selectedCreditCard={null}
        onCreditCardChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Seleccionar tarjeta de crédito...")
      ).toBeInTheDocument();
    });
  });

  it("renders with custom placeholder", async () => {
    render(
      <CreditCardSelector
        selectedCreditCard={null}
        onCreditCardChange={mockOnChange}
        placeholder="Elegir tarjeta personalizada..."
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Elegir tarjeta personalizada...")
      ).toBeInTheDocument();
    });
  });

  it("shows loading state initially", () => {
    render(
      <CreditCardSelector
        selectedCreditCard={null}
        onCreditCardChange={mockOnChange}
      />
    );

    expect(screen.getByText("Cargando tarjetas...")).toBeInTheDocument();
  });

  it("displays credit cards after loading", async () => {
    const user = userEvent.setup();

    render(
      <CreditCardSelector
        selectedCreditCard={null}
        onCreditCardChange={mockOnChange}
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(
        screen.queryByText("Cargando tarjetas...")
      ).not.toBeInTheDocument();
    });

    // Click to open dropdown
    const button = screen.getByRole("combobox");
    await user.click(button);

    // Check if credit cards are displayed
    await waitFor(() => {
      expect(
        screen.getByText("Banco de Bogotá - Visa ****1234")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Bancolombia - Mastercard ****5678")
      ).toBeInTheDocument();
      expect(
        screen.getByText("BBVA - American Express ****9012")
      ).toBeInTheDocument();
    });
  });

  it("shows 'No card' option when showNoCardOption is true", async () => {
    const user = userEvent.setup();

    render(
      <CreditCardSelector
        selectedCreditCard={null}
        onCreditCardChange={mockOnChange}
        showNoCardOption={true}
      />
    );

    await waitFor(() => {
      expect(
        screen.queryByText("Cargando tarjetas...")
      ).not.toBeInTheDocument();
    });

    const button = screen.getByRole("combobox");
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("Sin tarjeta de crédito")).toBeInTheDocument();
    });
  });

  it("hides 'No card' option when showNoCardOption is false", async () => {
    const user = userEvent.setup();

    render(
      <CreditCardSelector
        selectedCreditCard={null}
        onCreditCardChange={mockOnChange}
        showNoCardOption={false}
      />
    );

    await waitFor(() => {
      expect(
        screen.queryByText("Cargando tarjetas...")
      ).not.toBeInTheDocument();
    });

    const button = screen.getByRole("combobox");
    await user.click(button);

    await waitFor(() => {
      expect(
        screen.queryByText("Sin tarjeta de crédito")
      ).not.toBeInTheDocument();
    });
  });

  it("calls onCreditCardChange when a card is selected", async () => {
    const user = userEvent.setup();

    render(
      <CreditCardSelector
        selectedCreditCard={null}
        onCreditCardChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(
        screen.queryByText("Cargando tarjetas...")
      ).not.toBeInTheDocument();
    });

    const button = screen.getByRole("combobox");
    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByText("Banco de Bogotá - Visa ****1234")
      ).toBeInTheDocument();
    });

    const cardOption = screen.getByText("Banco de Bogotá - Visa ****1234");
    await user.click(cardOption);

    expect(mockOnChange).toHaveBeenCalledWith(mockCreditCards[0]);
  });

  it("calls onCreditCardChange with null when 'No card' is selected", async () => {
    const user = userEvent.setup();

    render(
      <CreditCardSelector
        selectedCreditCard={mockCreditCards[0]}
        onCreditCardChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(
        screen.queryByText("Cargando tarjetas...")
      ).not.toBeInTheDocument();
    });

    const button = screen.getByRole("combobox");
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("Sin tarjeta de crédito")).toBeInTheDocument();
    });

    const noCardOption = screen.getByText("Sin tarjeta de crédito");
    await user.click(noCardOption);

    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  it("displays selected credit card", async () => {
    render(
      <CreditCardSelector
        selectedCreditCard={mockCreditCards[0]}
        onCreditCardChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Banco de Bogotá - Visa ****1234")
      ).toBeInTheDocument();
    });
  });

  it("shows error message when error prop is provided", async () => {
    render(
      <CreditCardSelector
        selectedCreditCard={null}
        onCreditCardChange={mockOnChange}
        error="Test error message"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Test error message")).toBeInTheDocument();
    });
  });

  it("shows required field indicator when required and no card selected", async () => {
    render(
      <CreditCardSelector
        selectedCreditCard={null}
        onCreditCardChange={mockOnChange}
        required={true}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          /Seleccione una tarjeta de crédito si desea asociarla al gasto/
        )
      ).toBeInTheDocument();
    });
  });

  it("shows no cards available message when no credit cards exist", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ credit_cards: [] }),
    });

    render(
      <CreditCardSelector
        selectedCreditCard={null}
        onCreditCardChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/No hay tarjetas de crédito registradas/)
      ).toBeInTheDocument();
    });
  });

  it("shows error state when fetch fails", async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(
      <CreditCardSelector
        selectedCreditCard={null}
        onCreditCardChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Error cargando tarjetas")).toBeInTheDocument();
      expect(
        screen.getByText("Error cargando tarjetas de crédito")
      ).toBeInTheDocument();
    });
  });

  it("filters credit cards based on search input", async () => {
    const user = userEvent.setup();

    render(
      <CreditCardSelector
        selectedCreditCard={null}
        onCreditCardChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(
        screen.queryByText("Cargando tarjetas...")
      ).not.toBeInTheDocument();
    });

    const button = screen.getByRole("combobox");
    await user.click(button);

    // Wait for dropdown to open
    await waitFor(() => {
      expect(
        screen.getByText("Banco de Bogotá - Visa ****1234")
      ).toBeInTheDocument();
    });

    // Type in search input
    const searchInput = screen.getByPlaceholderText("Buscar tarjetas...");
    await user.type(searchInput, "Bancolombia");

    // Check that only matching card is shown
    await waitFor(() => {
      expect(
        screen.getByText("Bancolombia - Mastercard ****5678")
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Banco de Bogotá - Visa ****1234")
      ).not.toBeInTheDocument();
    });
  });

  it("is disabled when disabled prop is true", async () => {
    render(
      <CreditCardSelector
        selectedCreditCard={null}
        onCreditCardChange={mockOnChange}
        disabled={true}
      />
    );

    await waitFor(() => {
      const button = screen.getByRole("combobox");
      expect(button).toBeDisabled();
    });
  });
});

describe("validateCreditCard", () => {
  it("returns valid when credit card is selected and not required", () => {
    const result = validateCreditCard(mockCreditCards[0], false);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns valid when credit card is null and not required", () => {
    const result = validateCreditCard(null, false);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns valid when credit card is selected and required", () => {
    const result = validateCreditCard(mockCreditCards[0], true);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns invalid when credit card is null and required", () => {
    const result = validateCreditCard(null, true);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Debe seleccionar una tarjeta de crédito");
  });
});

// Test the hook
describe("useCreditCardSelection", () => {
  it("fetches credit cards on mount", async () => {
    const TestComponent = () => {
      const { creditCards, isLoading } = useCreditCardSelection();

      if (isLoading) return <div>Loading...</div>;

      return (
        <div>
          {creditCards.map((card) => (
            <div key={card.id}>{card.bank_name}</div>
          ))}
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Banco de Bogotá")).toBeInTheDocument();
      expect(screen.getByText("Bancolombia")).toBeInTheDocument();
      expect(screen.getByText("BBVA")).toBeInTheDocument();
    });
  });

  it("handles fetch error", async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    const TestComponent = () => {
      const { error, isLoading } = useCreditCardSelection();

      if (isLoading) return <div>Loading...</div>;
      if (error) return <div>Error: {error}</div>;

      return <div>Success</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(
        screen.getByText("Error: Error cargando tarjetas de crédito")
      ).toBeInTheDocument();
    });
  });
});
