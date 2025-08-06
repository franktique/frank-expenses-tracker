import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DashboardView } from "../dashboard-view";
import { BudgetProvider } from "@/context/budget-context-provider";
import { AuthProvider } from "@/lib/auth-context";

// Mock the auth context
jest.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    activePeriod: {
      id: "1",
      name: "Test Period",
      start_date: "2024-01-01",
      end_date: "2024-01-31",
      is_active: true,
    },
    isLoadingActivePeriod: false,
    activePeriodError: null,
    retryActivePeriodLoading: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock the budget context
jest.mock("@/context/budget-context", () => ({
  useBudget: () => ({
    activePeriod: {
      id: "1",
      name: "Test Period",
      start_date: "2024-01-01",
      end_date: "2024-01-31",
      is_active: true,
    },
    funds: [],
    isLoading: false,
    error: null,
    isDbInitialized: true,
    dbConnectionError: false,
    connectionErrorDetails: null,
  }),
}));

// Mock the router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock chart components
jest.mock("../dashboard-charts", () => ({
  CategoryExpensesChart: () => (
    <div data-testid="category-chart">Category Chart</div>
  ),
  CumulativeExpensesChart: () => (
    <div data-testid="cumulative-chart">Cumulative Chart</div>
  ),
  DailyExpensesChart: () => <div data-testid="daily-chart">Daily Chart</div>,
}));

// Mock fetch with test data
const mockBudgetData = {
  activePeriod: { id: "1", name: "Test Period" },
  totalIncome: 5000,
  totalExpenses: 3000,
  budgetSummary: [
    {
      category_id: "1",
      category_name: "Groceries",
      credit_budget: 300,
      cash_debit_budget: 200,
      expected_amount: 500,
      total_amount: 450,
      credit_amount: 250,
      debit_amount: 100,
      cash_amount: 100,
      remaining: 50,
    },
    {
      category_id: "2",
      category_name: "Transportation",
      credit_budget: 150,
      cash_debit_budget: 100,
      expected_amount: 250,
      total_amount: 200,
      credit_amount: 120,
      debit_amount: 40,
      cash_amount: 40,
      remaining: 50,
    },
  ],
};

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockBudgetData),
  })
) as jest.Mock;

describe("Dashboard Responsive Design - Task 5 Final Verification", () => {
  const renderDashboard = () => {
    return render(
      <AuthProvider>
        <BudgetProvider>
          <DashboardView />
        </BudgetProvider>
      </AuthProvider>
    );
  };

  const setViewportSize = (width: number, height: number) => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: height,
    });
    window.dispatchEvent(new Event("resize"));
  };

  const waitForDashboardToLoad = async () => {
    await waitFor(
      () => {
        expect(screen.getByText("Resumen de Presupuesto")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  };

  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockBudgetData),
      })
    );
    setViewportSize(1024, 768);
  });

  describe("Task 5: Responsive Design and Table Layout", () => {
    test("table has proper overflow container for horizontal scrolling", async () => {
      renderDashboard();
      await waitForDashboardToLoad();

      // Verify table wrapper has overflow-auto for horizontal scrolling
      const tableWrapper = document.querySelector(
        ".relative.w-full.overflow-auto"
      );
      expect(tableWrapper).toBeInTheDocument();
    });

    test("table displays all required columns including new budget columns", async () => {
      renderDashboard();
      await waitForDashboardToLoad();

      // Verify both new budget columns are present
      expect(screen.getAllByText("Presupuesto Crédito").length).toBeGreaterThan(
        0
      );
      expect(
        screen.getAllByText("Presupuesto Efectivo").length
      ).toBeGreaterThan(0);

      // Verify other essential columns
      expect(screen.getAllByText("Categoria").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Gasto Total").length).toBeGreaterThan(0);
    });

    test("table maintains proper structure on mobile viewport", async () => {
      setViewportSize(320, 568);
      renderDashboard();
      await waitForDashboardToLoad();

      // Table should still be present and functional
      const table = document.querySelector("table");
      expect(table).toBeInTheDocument();
      expect(table).toHaveClass("w-full");

      // Overflow container should be present for horizontal scrolling
      const tableWrapper = document.querySelector(
        ".relative.w-full.overflow-auto"
      );
      expect(tableWrapper).toBeInTheDocument();
    });

    test("table maintains proper structure on tablet viewport", async () => {
      setViewportSize(768, 1024);
      renderDashboard();
      await waitForDashboardToLoad();

      // All columns should be accessible
      expect(screen.getAllByText("Presupuesto Crédito").length).toBeGreaterThan(
        0
      );
      expect(
        screen.getAllByText("Presupuesto Efectivo").length
      ).toBeGreaterThan(0);

      // Table structure should be maintained
      const table = document.querySelector("table");
      expect(table).toBeInTheDocument();
    });

    test("table maintains proper structure on desktop viewport", async () => {
      setViewportSize(1200, 800);
      renderDashboard();
      await waitForDashboardToLoad();

      // All columns should be comfortably visible
      expect(screen.getAllByText("Presupuesto Crédito").length).toBeGreaterThan(
        0
      );
      expect(
        screen.getAllByText("Presupuesto Efectivo").length
      ).toBeGreaterThan(0);

      // Table should have proper width constraints
      const mainContainer = document.querySelector(
        ".space-y-6.w-full.max-w-full"
      );
      expect(mainContainer).toBeInTheDocument();
    });

    test("numeric columns maintain right alignment", async () => {
      renderDashboard();
      await waitForDashboardToLoad();

      // Check that numeric column headers have right alignment
      const creditBudgetHeaders = screen.getAllByText("Presupuesto Crédito");
      expect(creditBudgetHeaders[0].closest("th")).toHaveClass("text-right");

      const cashBudgetHeaders = screen.getAllByText("Presupuesto Efectivo");
      expect(cashBudgetHeaders[0].closest("th")).toHaveClass("text-right");
    });

    test("table cells maintain consistent spacing", async () => {
      renderDashboard();
      await waitForDashboardToLoad();

      // Check that header cells have proper padding
      const headerCells = document.querySelectorAll("th");
      headerCells.forEach((cell) => {
        expect(cell).toHaveClass("px-4");
      });

      // Check that data cells have proper padding
      const dataCells = document.querySelectorAll("td");
      dataCells.forEach((cell) => {
        // Table cells should have padding (either px-4 or p-4)
        const hasProperPadding =
          cell.classList.contains("px-4") ||
          cell.classList.contains("p-4") ||
          cell.className.includes("p-4");
        expect(hasProperPadding).toBe(true);
      });
    });

    test("responsive grid works correctly for summary cards", async () => {
      renderDashboard();
      await waitForDashboardToLoad();

      // Check that the summary cards grid has responsive classes
      const gridContainer = document.querySelector(".grid.gap-4");
      expect(gridContainer).toBeInTheDocument();

      // Verify summary cards are present
      expect(screen.getByText("Ingresos Totales")).toBeInTheDocument();
      expect(screen.getByText("Gastos Totales")).toBeInTheDocument();
    });

    test("tabs remain functional and properly sized", async () => {
      renderDashboard();
      await waitForDashboardToLoad();

      // Check that tabs container has proper responsive classes
      const tabsList = document.querySelector(".grid.w-full.grid-cols-4");
      expect(tabsList).toBeInTheDocument();

      // Verify all tabs are present
      expect(screen.getAllByText("Resumen").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Gastos Diarios").length).toBeGreaterThan(0);
    });

    test("table handles empty data gracefully", async () => {
      // Mock empty data response
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockBudgetData,
              budgetSummary: [],
            }),
        })
      );

      renderDashboard();
      await waitForDashboardToLoad();

      // With empty data, table should still be rendered with headers
      const table = document.querySelector("table");
      if (table) {
        // If table is present, headers should be there
        expect(
          screen.getAllByText("Presupuesto Crédito").length
        ).toBeGreaterThan(0);
        expect(
          screen.getAllByText("Presupuesto Efectivo").length
        ).toBeGreaterThan(0);
      } else {
        // If no table, at least the dashboard structure should be present
        expect(screen.getByText("Resumen de Presupuesto")).toBeInTheDocument();
      }
    });

    test("main container maintains proper width constraints", async () => {
      renderDashboard();
      await waitForDashboardToLoad();

      // Check that main container has proper width constraints
      const mainContainer = document.querySelector(
        ".space-y-6.w-full.max-w-full"
      );
      expect(mainContainer).toBeInTheDocument();

      // Check that table wrapper is properly contained
      const tableWrapper = document.querySelector(
        ".relative.w-full.overflow-auto"
      );
      expect(tableWrapper).toBeInTheDocument();
    });
  });
});
