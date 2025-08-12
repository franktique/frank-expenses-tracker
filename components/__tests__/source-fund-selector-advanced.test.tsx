import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { SourceFundSelector } from "../source-fund-selector";
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
  {
    id: "fund-3",
    name: "Ahorros",
    description: "Cuenta de ahorros",
    initial_balance: 2000,
    current_balance: 2200,
    start_date: "2024-01-01",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

describe("SourceFundSelector - Advanced Behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBudget.mockReturnValue({
      funds: mockFunds,
      isLoading: false,
      error: null,
    } as any);
  });

  describe("Category Change Handling", () => {
    it("should clear selection when category changes and current fund is no longer valid", async () => {
      const mockOnChange = jest.fn();

      // Initial category has fund-1 and fund-2
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ funds: [mockFunds[0], mockFunds[1]] }),
      } as Response);

      const { rerender } = render(
        <SourceFundSelector
          selectedCategoryId="category-1"
          selectedSourceFund={mockFunds[1]} // Banco
          onSourceFundChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/categories/category-1/funds"
        );
      });

      // Change to category that only has fund-3
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ funds: [mockFunds[2]] }),
      } as Response);

      rerender(
        <SourceFundSelector
          selectedCategoryId="category-2"
          selectedSourceFund={mockFunds[1]} // Still Banco, but not valid for new category
          onSourceFundChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/categories/category-2/funds"
        );
      });

      // Should clear selection since Banco is not available for category-2
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(null);
      });
    });

    it("should preserve selection when category changes and current fund is still valid", async () => {
      const mockOnChange = jest.fn();

      // Initial category has fund-1 and fund-2
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ funds: [mockFunds[0], mockFunds[1]] }),
      } as Response);

      const { rerender } = render(
        <SourceFundSelector
          selectedCategoryId="category-1"
          selectedSourceFund={mockFunds[1]} // Banco
          onSourceFundChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/categories/category-1/funds"
        );
      });

      // Change to category that also has fund-2
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ funds: [mockFunds[1], mockFunds[2]] }),
      } as Response);

      rerender(
        <SourceFundSelector
          selectedCategoryId="category-2"
          selectedSourceFund={mockFunds[1]} // Still Banco, and valid for new category
          onSourceFundChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/categories/category-2/funds"
        );
      });

      // Should not clear selection since Banco is still available
      expect(mockOnChange).not.toHaveBeenCalledWith(null);
    });

    it("should auto-select when category changes to one with single fund", async () => {
      const mockOnChange = jest.fn();

      // Initial category has multiple funds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ funds: [mockFunds[0], mockFunds[1]] }),
      } as Response);

      const { rerender } = render(
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

      // Change to category with single fund
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ funds: [mockFunds[2]] }),
      } as Response);

      rerender(
        <SourceFundSelector
          selectedCategoryId="category-2"
          selectedSourceFund={null}
          onSourceFundChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/categories/category-2/funds"
        );
      });

      // Should auto-select the single available fund
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(mockFunds[2]);
      });
    });
  });

  describe("Fund Filter Integration", () => {
    it("should prioritize fund filter as default when multiple funds available", async () => {
      const mockOnChange = jest.fn();
      const multipleFunds = [mockFunds[0], mockFunds[1], mockFunds[2]];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ funds: multipleFunds }),
      } as Response);

      render(
        <SourceFundSelector
          selectedCategoryId="category-1"
          selectedSourceFund={null}
          onSourceFundChange={mockOnChange}
          currentFundFilter={mockFunds[2]} // Ahorros
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/categories/category-1/funds"
        );
      });

      // Should auto-select the fund from filter
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(mockFunds[2]);
      });
    });

    it("should not use fund filter if it's not available for category", async () => {
      const mockOnChange = jest.fn();
      const categoryFunds = [mockFunds[0], mockFunds[1]]; // Only Efectivo and Banco

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ funds: categoryFunds }),
      } as Response);

      render(
        <SourceFundSelector
          selectedCategoryId="category-1"
          selectedSourceFund={null}
          onSourceFundChange={mockOnChange}
          currentFundFilter={mockFunds[2]} // Ahorros - not available for this category
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/categories/category-1/funds"
        );
      });

      // Should not auto-select since filter fund is not available
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("should use fund filter even when single fund available if filter matches", async () => {
      const mockOnChange = jest.fn();
      const singleFund = [mockFunds[0]]; // Only Efectivo

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ funds: singleFund }),
      } as Response);

      render(
        <SourceFundSelector
          selectedCategoryId="category-1"
          selectedSourceFund={null}
          onSourceFundChange={mockOnChange}
          currentFundFilter={mockFunds[0]} // Efectivo - matches the single available fund
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/categories/category-1/funds"
        );
      });

      // Should auto-select the fund (both single fund logic and filter logic apply)
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(mockFunds[0]);
      });
    });
  });

  describe("Loading and Error States", () => {
    it("should show loading state while fetching category funds", async () => {
      // Mock a delayed response
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(delayedPromise as any);

      render(
        <SourceFundSelector
          selectedCategoryId="category-1"
          selectedSourceFund={null}
          onSourceFundChange={jest.fn()}
        />
      );

      // Should show loading state
      expect(screen.getByText("Cargando fondos...")).toBeInTheDocument();

      // Resolve the promise
      act(() => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({ funds: [mockFunds[0]] }),
        });
      });

      await waitFor(() => {
        expect(
          screen.queryByText("Cargando fondos...")
        ).not.toBeInTheDocument();
      });
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Internal server error" }),
      } as Response);

      render(
        <SourceFundSelector
          selectedCategoryId="category-1"
          selectedSourceFund={null}
          onSourceFundChange={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Error al cargar fondos")).toBeInTheDocument();
      });
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(
        <SourceFundSelector
          selectedCategoryId="category-1"
          selectedSourceFund={null}
          onSourceFundChange={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Error al cargar fondos")).toBeInTheDocument();
      });
    });

    it("should retry fetching when category changes after error", async () => {
      // First request fails
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { rerender } = render(
        <SourceFundSelector
          selectedCategoryId="category-1"
          selectedSourceFund={null}
          onSourceFundChange={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Error al cargar fondos")).toBeInTheDocument();
      });

      // Second request succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ funds: [mockFunds[0]] }),
      } as Response);

      rerender(
        <SourceFundSelector
          selectedCategoryId="category-2"
          selectedSourceFund={null}
          onSourceFundChange={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(
          screen.queryByText("Error al cargar fondos")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("User Interaction", () => {
    it("should allow manual fund selection from dropdown", async () => {
      const mockOnChange = jest.fn();
      const multipleFunds = [mockFunds[0], mockFunds[1], mockFunds[2]];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ funds: multipleFunds }),
      } as Response);

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

      // Click to open dropdown
      const button = screen.getByRole("combobox");
      fireEvent.click(button);

      // Wait for dropdown to appear and select a fund
      await waitFor(() => {
        const fundOption = screen.getByText("Banco");
        fireEvent.click(fundOption);
      });

      expect(mockOnChange).toHaveBeenCalledWith(mockFunds[1]);
    });

    it("should show fund balances in dropdown options", async () => {
      const multipleFunds = [mockFunds[0], mockFunds[1], mockFunds[2]];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ funds: multipleFunds }),
      } as Response);

      render(
        <SourceFundSelector
          selectedCategoryId="category-1"
          selectedSourceFund={null}
          onSourceFundChange={jest.fn()}
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

      // Click to open dropdown
      const button = screen.getByRole("combobox");
      fireEvent.click(button);

      // Check that fund balances are displayed
      await waitFor(() => {
        expect(screen.getByText("$1,500.00")).toBeInTheDocument(); // Efectivo balance
        expect(screen.getByText("$4,500.00")).toBeInTheDocument(); // Banco balance
        expect(screen.getByText("$2,200.00")).toBeInTheDocument(); // Ahorros balance
      });
    });

    it("should clear selection when clear button is clicked", async () => {
      const mockOnChange = jest.fn();
      const multipleFunds = [mockFunds[0], mockFunds[1]];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ funds: multipleFunds }),
      } as Response);

      render(
        <SourceFundSelector
          selectedCategoryId="category-1"
          selectedSourceFund={mockFunds[0]} // Pre-selected
          onSourceFundChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/categories/category-1/funds"
        );
      });

      // Find and click the clear button
      const clearButton = screen.getByRole("button", { name: /clear/i });
      fireEvent.click(clearButton);

      expect(mockOnChange).toHaveBeenCalledWith(null);
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels and roles", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ funds: [mockFunds[0]] }),
      } as Response);

      render(
        <SourceFundSelector
          selectedCategoryId="category-1"
          selectedSourceFund={null}
          onSourceFundChange={jest.fn()}
        />
      );

      await waitFor(() => {
        const combobox = screen.getByRole("combobox");
        expect(combobox).toHaveAttribute("aria-expanded");
        expect(combobox).toHaveAttribute("aria-haspopup");
      });
    });

    it("should support keyboard navigation", async () => {
      const mockOnChange = jest.fn();
      const multipleFunds = [mockFunds[0], mockFunds[1]];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ funds: multipleFunds }),
      } as Response);

      render(
        <SourceFundSelector
          selectedCategoryId="category-1"
          selectedSourceFund={null}
          onSourceFundChange={mockOnChange}
        />
      );

      await waitFor(() => {
        const button = screen.getByRole("combobox");
        expect(button).not.toBeDisabled();
      });

      const button = screen.getByRole("combobox");

      // Test keyboard interaction
      fireEvent.keyDown(button, { key: "Enter" });

      await waitFor(() => {
        // Should open dropdown
        expect(button).toHaveAttribute("aria-expanded", "true");
      });

      // Test arrow key navigation
      fireEvent.keyDown(button, { key: "ArrowDown" });
      fireEvent.keyDown(button, { key: "Enter" });

      // Should select the first fund
      expect(mockOnChange).toHaveBeenCalledWith(mockFunds[0]);
    });
  });
});
