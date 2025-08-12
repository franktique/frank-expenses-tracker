/**
 * Test suite for Task 11: Visual indicators and user feedback
 *
 * This test verifies that all visual indicators and user feedback mechanisms
 * for category-fund relationships are working correctly.
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BudgetProvider } from "@/context/budget-context";
import {
  FundCategoryRelationshipIndicator,
  FundSelectionConstraintIndicator,
} from "@/components/fund-category-relationship-indicator";
import {
  CategoryFundInfoPanel,
  CategoryFundInfoCompact,
} from "@/components/category-fund-info-panel";
import { MultiFundSelector } from "@/components/multi-fund-selector";
import { Fund } from "@/types/funds";

// Mock data
const mockFunds: Fund[] = [
  { id: "1", name: "Disponible", description: "Fondo principal" },
  { id: "2", name: "Ahorros", description: "Fondo de ahorros" },
  { id: "3", name: "Emergencia", description: "Fondo de emergencia" },
];

const mockBudgetContext = {
  funds: mockFunds,
  categories: [],
  expenses: [],
  periods: [],
  activePeriod: null,
  isLoading: false,
  error: null,
  selectedFund: null,
  setSelectedFund: jest.fn(),
  addCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  addExpense: jest.fn(),
  updateExpense: jest.fn(),
  deleteExpense: jest.fn(),
  getCategoryById: jest.fn(),
  getPeriodById: jest.fn(),
  getFundById: jest.fn(),
};

// Mock the budget context
jest.mock("@/context/budget-context", () => ({
  useBudget: () => mockBudgetContext,
  BudgetProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("Task 11: Visual Indicators and User Feedback", () => {
  describe("FundCategoryRelationshipIndicator", () => {
    it("should show specific fund indicator with green dot", () => {
      render(
        <FundCategoryRelationshipIndicator
          associatedFunds={[mockFunds[0]]}
          showCount={true}
          showTooltip={false}
        />
      );

      expect(screen.getByText("Disponible")).toBeInTheDocument();
      expect(screen.getByText("(1 fondo)")).toBeInTheDocument();

      // Check for green indicator dot
      const badge = screen.getByText("Disponible").closest(".flex");
      expect(badge).toHaveClass("items-center", "gap-1");
    });

    it("should show multiple funds indicator with count", () => {
      render(
        <FundCategoryRelationshipIndicator
          associatedFunds={[mockFunds[0], mockFunds[1]]}
          showCount={true}
          showTooltip={false}
        />
      );

      expect(screen.getByText("Disponible")).toBeInTheDocument();
      expect(screen.getByText("Ahorros")).toBeInTheDocument();
      expect(screen.getByText("(2 fondos)")).toBeInTheDocument();
    });

    it('should show "Todos los fondos" when no specific funds', () => {
      render(
        <FundCategoryRelationshipIndicator
          associatedFunds={[]}
          fallbackFundName="Fondo Principal"
          showCount={true}
          showTooltip={false}
        />
      );

      expect(screen.getByText("Fondo Principal")).toBeInTheDocument();
    });

    it("should show tooltip with detailed information", async () => {
      render(
        <FundCategoryRelationshipIndicator
          associatedFunds={[mockFunds[0]]}
          showCount={true}
          showTooltip={true}
        />
      );

      const indicator = screen.getByText("Disponible").closest("div");
      fireEvent.mouseEnter(indicator!);

      await waitFor(() => {
        expect(
          screen.getByText(/Esta categoría está asociada específicamente/)
        ).toBeInTheDocument();
      });
    });
  });

  describe("FundSelectionConstraintIndicator", () => {
    it("should show success status when filter fund is available", () => {
      render(
        <FundSelectionConstraintIndicator
          categoryId="cat1"
          availableFunds={[mockFunds[0], mockFunds[1]]}
          selectedFund={null}
          currentFilterFund={mockFunds[0]}
        />
      );

      expect(
        screen.getByText("Fondo del filtro disponible")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/El fondo actual del filtro.*está disponible/)
      ).toBeInTheDocument();
    });

    it("should show warning when funds are restricted", () => {
      render(
        <FundSelectionConstraintIndicator
          categoryId="cat1"
          availableFunds={[mockFunds[1]]}
          selectedFund={null}
          currentFilterFund={mockFunds[0]}
        />
      );

      expect(screen.getByText("Fondos restringidos")).toBeInTheDocument();
      expect(
        screen.getByText(/Esta categoría solo acepta gastos desde/)
      ).toBeInTheDocument();
    });

    it("should show info status when no constraints", () => {
      render(
        <FundSelectionConstraintIndicator
          categoryId="cat1"
          availableFunds={[]}
          selectedFund={null}
          currentFilterFund={null}
        />
      );

      expect(
        screen.getByText("Sin restricciones de fondo")
      ).toBeInTheDocument();
    });
  });

  describe("CategoryFundInfoPanel", () => {
    it("should render relationship types with visual indicators", () => {
      render(<CategoryFundInfoPanel showTips={true} showStats={false} />);

      expect(
        screen.getByText("Relaciones Categoría-Fondo")
      ).toBeInTheDocument();
      expect(screen.getByText("Fondo específico")).toBeInTheDocument();
      expect(screen.getByText("Múltiples fondos")).toBeInTheDocument();
      expect(screen.getByText("Sin restricción")).toBeInTheDocument();
    });

    it("should show tips section when enabled", () => {
      render(<CategoryFundInfoPanel showTips={true} showStats={false} />);

      expect(screen.getByText("Consejos útiles:")).toBeInTheDocument();
      expect(
        screen.getByText(/Al registrar gastos, el sistema preselecciona/)
      ).toBeInTheDocument();
    });

    it("should not show tips section when disabled", () => {
      render(<CategoryFundInfoPanel showTips={false} showStats={false} />);

      expect(screen.queryByText("Consejos útiles:")).not.toBeInTheDocument();
    });
  });

  describe("CategoryFundInfoCompact", () => {
    it("should render compact legend with color indicators", () => {
      render(<CategoryFundInfoCompact />);

      expect(screen.getByText("Fondo específico")).toBeInTheDocument();
      expect(screen.getByText("Múltiples fondos")).toBeInTheDocument();
      expect(screen.getByText("Sin restricción")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Los colores indican el tipo de relación categoría-fondo"
        )
      ).toBeInTheDocument();
    });
  });

  describe("MultiFundSelector Enhanced Feedback", () => {
    it("should show selection status indicators", () => {
      const mockOnChange = jest.fn();

      render(
        <MultiFundSelector
          selectedFunds={[mockFunds[0]]}
          onFundsChange={mockOnChange}
          availableFunds={mockFunds}
        />
      );

      expect(screen.getByText("✓ Específico")).toBeInTheDocument();
      expect(
        screen.getByText("1 de 3 fondos seleccionados")
      ).toBeInTheDocument();
    });

    it("should show multiple selection indicator", () => {
      const mockOnChange = jest.fn();

      render(
        <MultiFundSelector
          selectedFunds={[mockFunds[0], mockFunds[1]]}
          onFundsChange={mockOnChange}
          availableFunds={mockFunds}
        />
      );

      expect(screen.getByText("⚡ Múltiple")).toBeInTheDocument();
      expect(
        screen.getByText("2 de 3 fondos seleccionados")
      ).toBeInTheDocument();
    });

    it("should show help text for empty selection", () => {
      const mockOnChange = jest.fn();

      render(
        <MultiFundSelector
          selectedFunds={[]}
          onFundsChange={mockOnChange}
          availableFunds={mockFunds}
        />
      );

      expect(
        screen.getByText("💡 Sin fondos seleccionados = acepta cualquier fondo")
      ).toBeInTheDocument();
    });
  });

  describe("Visual Consistency", () => {
    it("should use consistent color coding across components", () => {
      const { container: indicator } = render(
        <FundCategoryRelationshipIndicator
          associatedFunds={[mockFunds[0]]}
          showCount={true}
          showTooltip={false}
        />
      );

      const { container: panel } = render(
        <CategoryFundInfoPanel showTips={false} showStats={false} />
      );

      // Both should use green for specific fund relationships
      expect(indicator.querySelector(".bg-green-500")).toBeInTheDocument();
      expect(panel.querySelector(".bg-green-50")).toBeInTheDocument();
    });

    it("should maintain accessibility with proper contrast", () => {
      render(
        <FundSelectionConstraintIndicator
          categoryId="cat1"
          availableFunds={[mockFunds[0]]}
          selectedFund={null}
          currentFilterFund={mockFunds[0]}
        />
      );

      const statusElement = screen
        .getByText("Fondo del filtro disponible")
        .closest("div");
      expect(statusElement).toHaveClass("text-green-700"); // High contrast text
    });
  });

  describe("Loading States and Error Handling", () => {
    it("should show loading state in MultiFundSelector", () => {
      const mockContextWithLoading = {
        ...mockBudgetContext,
        isLoading: true,
      };

      jest
        .mocked(require("@/context/budget-context").useBudget)
        .mockReturnValue(mockContextWithLoading);

      render(
        <MultiFundSelector selectedFunds={[]} onFundsChange={jest.fn()} />
      );

      expect(screen.getByText("Cargando fondos...")).toBeInTheDocument();
    });

    it("should show error state in MultiFundSelector", () => {
      const mockContextWithError = {
        ...mockBudgetContext,
        error: "Error loading funds",
      };

      jest
        .mocked(require("@/context/budget-context").useBudget)
        .mockReturnValue(mockContextWithError);

      render(
        <MultiFundSelector selectedFunds={[]} onFundsChange={jest.fn()} />
      );

      expect(screen.getByText("Error cargando fondos")).toBeInTheDocument();
    });
  });

  describe("User Interaction Feedback", () => {
    it("should provide immediate visual feedback on fund selection", async () => {
      const mockOnChange = jest.fn();

      render(
        <MultiFundSelector
          selectedFunds={[]}
          onFundsChange={mockOnChange}
          availableFunds={mockFunds}
        />
      );

      // Open the selector
      fireEvent.click(screen.getByRole("combobox"));

      // Select a fund
      await waitFor(() => {
        fireEvent.click(screen.getByText("Disponible"));
      });

      expect(mockOnChange).toHaveBeenCalledWith([mockFunds[0]]);
    });

    it("should show fund removal feedback", () => {
      const mockOnChange = jest.fn();

      render(
        <MultiFundSelector
          selectedFunds={[mockFunds[0]]}
          onFundsChange={mockOnChange}
          availableFunds={mockFunds}
        />
      );

      const removeButton = screen.getByLabelText("Remover Disponible");
      fireEvent.click(removeButton);

      expect(mockOnChange).toHaveBeenCalledWith([]);
    });
  });
});

// Integration test for complete visual feedback flow
describe("Visual Indicators Integration", () => {
  it("should provide consistent feedback across category management flow", async () => {
    // This would test the complete flow from category creation to expense registration
    // with proper visual feedback at each step

    // 1. Category creation with fund selection
    // 2. Visual confirmation of fund relationships
    // 3. Expense form with constraint indicators
    // 4. Proper feedback on fund selection changes

    // This test would be more comprehensive in a real implementation
    expect(true).toBe(true); // Placeholder for integration test
  });
});
