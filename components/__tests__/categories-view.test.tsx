import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CategoriesView } from "../categories-view";
import { renderWithProviders, mockFetch, mockFetchError } from "./utils/test-utils";
import { mockCategories, mockFunds } from "./fixtures/test-data";
import { BudgetContextType } from "@/context/budget-context";

// Mock components that we don't need to test
jest.mock("../fund-filter", () => ({
  FundFilter: ({ onFundChange, selectedFund }: any) => (
    <select
      data-testid="fund-filter"
      value={selectedFund?.id || ""}
      onChange={(e) => {
        const fund = mockFunds.find(f => f.id === e.target.value);
        onFundChange(fund || null);
      }}
    >
      <option value="">Todos los fondos</option>
      {mockFunds.map(fund => (
        <option key={fund.id} value={fund.id}>{fund.name}</option>
      ))}
    </select>
  )
}));

jest.mock("../multi-fund-selector", () => ({
  MultiFundSelector: ({ selectedFunds, onFundsChange, placeholder }: any) => (
    <div data-testid="multi-fund-selector">
      <div>{placeholder}</div>
      <div>{selectedFunds.length} fondos seleccionados</div>
      {mockFunds.map(fund => (
        <button
          key={fund.id}
          onClick={() => {
            const isSelected = selectedFunds.some((f: any) => f.id === fund.id);
            if (isSelected) {
              onFundsChange(selectedFunds.filter((f: any) => f.id !== fund.id));
            } else {
              onFundsChange([...selectedFunds, fund]);
            }
          }}
        >
          {fund.name}
        </button>
      ))}
    </div>
  )
}));

jest.mock("../category-fund-error-dialog", () => ({
  CategoryFundErrorDialog: () => <div data-testid="error-dialog" />,
  useCategoryFundErrorDialog: () => ({
    dialogState: { isOpen: false },
    showError: jest.fn(),
    hideError: jest.fn(),
  }),
}));

jest.mock("../category-fund-loading-states", () => ({
  CategoryFundLoadingButton: ({ children }: any) => <div>{children}</div>,
  useCategoryFundLoadingState: () => ({
    setLoading: jest.fn(),
    clearLoading: jest.fn(),
    isLoading: jest.fn(() => false),
  }),
}));

jest.mock("../fund-category-relationship-indicator", () => ({
  FundCategoryRelationshipIndicator: () => <div data-testid="relationship-indicator" />,
}));

jest.mock("../category-fund-info-panel", () => ({
  CategoryFundInfoPanel: () => <div data-testid="info-panel" />,
  CategoryFundInfoCompact: () => <div data-testid="info-compact" />,
}));

describe("CategoriesView", () => {
  const mockBudgetContext: Partial<BudgetContextType> = {
    categories: mockCategories,
    funds: mockFunds,
    addCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch({ categories: mockCategories });
  });

  describe("Rendering", () => {
    it("renders the categories view with header", () => {
      renderWithProviders(<CategoriesView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByText("Categorías")).toBeInTheDocument();
      expect(screen.getByText("Nueva Categoría")).toBeInTheDocument();
    });

    it("renders fund filter", () => {
      renderWithProviders(<CategoriesView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByTestId("fund-filter")).toBeInTheDocument();
      expect(screen.getByText("Filtrar por fondo:")).toBeInTheDocument();
    });

    it("renders categories table with data", () => {
      renderWithProviders(<CategoriesView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByText("Alimentación")).toBeInTheDocument();
      expect(screen.getByText("Transporte")).toBeInTheDocument();
      expect(screen.getByText("Entretenimiento")).toBeInTheDocument();
    });

    it("shows empty state when no categories", () => {
      renderWithProviders(<CategoriesView />, {
        budgetContextValue: { ...mockBudgetContext, categories: [] },
      });

      expect(screen.getByText("Categorías")).toBeInTheDocument();
      // The table should still render but be empty
    });
  });

  describe("Fund Filtering", () => {
    it("filters categories by selected fund", () => {
      renderWithProviders(<CategoriesView />, {
        budgetContextValue: mockBudgetContext,
      });

      // Initially all categories should be visible
      expect(screen.getByText("Alimentación")).toBeInTheDocument();
      expect(screen.getByText("Transporte")).toBeInTheDocument();
      expect(screen.getByText("Entretenimiento")).toBeInTheDocument();

      // Select fund-1 (Efectivo) - should show categories that have fund-1
      const fundFilter = screen.getByTestId("fund-filter");
      fireEvent.change(fundFilter, { target: { value: "fund-1" } });

      // Only categories with fund-1 should be visible
      expect(screen.getByText("Alimentación")).toBeInTheDocument(); // has fund-1
      expect(screen.queryByText("Transporte")).not.toBeInTheDocument(); // doesn't have fund-1
      expect(screen.getByText("Entretenimiento")).toBeInTheDocument(); // has fund-1
    });

    it("shows all categories when no fund filter is selected", () => {
      renderWithProviders(<CategoriesView />, {
        budgetContextValue: mockBudgetContext,
      });

      const fundFilter = screen.getByTestId("fund-filter");
      
      // Select a fund first
      fireEvent.change(fundFilter, { target: { value: "fund-1" } });
      
      // Then clear the filter
      fireEvent.change(fundFilter, { target: { value: "" } });

      // All categories should be visible again
      expect(screen.getByText("Alimentación")).toBeInTheDocument();
      expect(screen.getByText("Transporte")).toBeInTheDocument();
      expect(screen.getByText("Entretenimiento")).toBeInTheDocument();
    });
  });

  describe("Add Category Dialog", () => {
    it("opens add category dialog when button is clicked", () => {
      renderWithProviders(<CategoriesView />, {
        budgetContextValue: mockBudgetContext,
      });

      const addButton = screen.getByText("Nueva Categoría");
      fireEvent.click(addButton);

      expect(screen.getByText("Agregar Categoría")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Ej: Alimentación, Transporte, etc.")).toBeInTheDocument();
      expect(screen.getByTestId("multi-fund-selector")).toBeInTheDocument();
    });

    it("allows entering category name", () => {
      renderWithProviders(<CategoriesView />, {
        budgetContextValue: mockBudgetContext,
      });

      const addButton = screen.getByText("Nueva Categoría");
      fireEvent.click(addButton);

      const nameInput = screen.getByPlaceholderText("Ej: Alimentación, Transporte, etc.");
      fireEvent.change(nameInput, { target: { value: "Nueva Categoría Test" } });

      expect(nameInput).toHaveValue("Nueva Categoría Test");
    });

    it("allows selecting funds for new category", () => {
      renderWithProviders(<CategoriesView />, {
        budgetContextValue: mockBudgetContext,
      });

      const addButton = screen.getByText("Nueva Categoría");
      fireEvent.click(addButton);

      const multiFundSelector = screen.getByTestId("multi-fund-selector");
      expect(multiFundSelector).toBeInTheDocument();

      // Click on a fund to select it
      const fundButton = screen.getByText("Efectivo");
      fireEvent.click(fundButton);

      expect(screen.getByText("1 fondos seleccionados")).toBeInTheDocument();
    });
  });

  describe("Add Category Functionality", () => {
    it("creates new category successfully", async () => {
      const mockAddCategory = jest.fn();
      mockFetch({ success: true, category: { id: "new-cat", name: "Test Category" } });

      // Mock window.location.reload
      Object.defineProperty(window, 'location', {
        value: { reload: jest.fn() },
        writable: true
      });

      renderWithProviders(<CategoriesView />, {
        budgetContextValue: { ...mockBudgetContext, addCategory: mockAddCategory },
      });

      // Open dialog
      fireEvent.click(screen.getByText("Nueva Categoría"));

      // Fill form
      const nameInput = screen.getByPlaceholderText("Ej: Alimentación, Transporte, etc.");
      fireEvent.change(nameInput, { target: { value: "Test Category" } });

      // Submit
      const submitButton = screen.getByText("Agregar");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Test Category", fund_ids: undefined }),
        });
      });
    });

    it("shows error when category name is empty", async () => {
      const mockToast = jest.fn();
      
      renderWithProviders(<CategoriesView />, {
        budgetContextValue: mockBudgetContext,
      });

      // Mock toast
      require("@/components/ui/use-toast").useToast = () => ({ toast: mockToast });

      // Open dialog
      fireEvent.click(screen.getByText("Nueva Categoría"));

      // Submit without name
      const submitButton = screen.getByText("Agregar");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "El nombre de la categoría no puede estar vacío",
          variant: "destructive",
        });
      });
    });

    it("handles API error when creating category", async () => {
      mockFetchError("Category already exists");

      renderWithProviders(<CategoriesView />, {
        budgetContextValue: mockBudgetContext,
      });

      // Open dialog
      fireEvent.click(screen.getByText("Nueva Categoría"));

      // Fill form
      const nameInput = screen.getByPlaceholderText("Ej: Alimentación, Transporte, etc.");
      fireEvent.change(nameInput, { target: { value: "Test Category" } });

      // Submit
      const submitButton = screen.getByText("Agregar");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe("Error Handling", () => {
    it("handles loading states during category operations", () => {
      renderWithProviders(<CategoriesView />, {
        budgetContextValue: mockBudgetContext,
      });

      // Component should render without crashing during loading
      expect(screen.getByText("Categorías")).toBeInTheDocument();
    });

    it("handles missing funds data gracefully", () => {
      renderWithProviders(<CategoriesView />, {
        budgetContextValue: { ...mockBudgetContext, funds: undefined },
      });

      expect(screen.getByText("Categorías")).toBeInTheDocument();
    });

    it("handles missing categories data gracefully", () => {
      renderWithProviders(<CategoriesView />, {
        budgetContextValue: { ...mockBudgetContext, categories: undefined },
      });

      expect(screen.getByText("Categorías")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels and roles", () => {
      renderWithProviders(<CategoriesView />, {
        budgetContextValue: mockBudgetContext,
      });

      const addButton = screen.getByRole("button", { name: /nueva categoría/i });
      expect(addButton).toBeInTheDocument();

      const fundFilterLabel = screen.getByText("Filtrar por fondo:");
      expect(fundFilterLabel).toBeInTheDocument();
    });

    it("supports keyboard navigation", () => {
      renderWithProviders(<CategoriesView />, {
        budgetContextValue: mockBudgetContext,
      });

      const addButton = screen.getByText("Nueva Categoría");
      addButton.focus();
      expect(addButton).toHaveFocus();
    });
  });
});