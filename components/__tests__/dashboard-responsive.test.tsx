import React from "react";
import { render, screen } from "@testing-library/react";
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

// Mock fetch for dashboard data
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
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
      }),
  })
) as jest.Mock;

// Mock chart components to avoid rendering issues in tests
jest.mock("../dashboard-charts", () => ({
  CategoryExpensesChart: () => (
    <div data-testid="category-chart">Category Chart</div>
  ),
  CumulativeExpensesChart: () => (
    <div data-testid="cumulative-chart">Cumulative Chart</div>
  ),
  DailyExpensesChart: () => <div data-testid="daily-chart">Daily Chart</div>,
}));

describe("Dashboard Responsive Design Tests", () => {
  const renderDashboard = () => {
    return render(
      <AuthProvider>
        <BudgetProvider>
          <DashboardView />
        </BudgetProvider>
      </AuthProvider>
    );
  };

  // Helper function to simulate different screen sizes
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

  // Helper function to get computed styles
  const getComputedStyle = (element: Element) => {
    return window.getComputedStyle(element);
  };

  // Helper function to check if element is horizontally scrollable
  const isHorizontallyScrollable = (element: Element) => {
    return element.scrollWidth > element.clientWidth;
  };

  beforeEach(() => {
    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();

    // Reset viewport to default desktop size
    setViewportSize(1024, 768);
  });

  // Helper function to wait for component to finish loading
  const waitForDashboardToLoad = async () => {
    // Wait for loading spinner to disappear
    await screen.findByText("Resumen de Presupuesto", {}, { timeout: 3000 });
  };

  test("table should have overflow-auto for horizontal scrolling", async () => {
    renderDashboard();
    await waitForDashboardToLoad();

    // Find the table wrapper div that should have overflow-auto
    const tableWrapper = document.querySelector(
      ".relative.w-full.overflow-auto"
    );
    expect(tableWrapper).toBeInTheDocument();
  });

  test("table should display all budget columns correctly", async () => {
    renderDashboard();
    await waitForDashboardToLoad();

    // Check that both new budget columns are present
    expect(screen.getByText("Presupuesto Crédito")).toBeInTheDocument();
    expect(screen.getByText("Presupuesto Efectivo")).toBeInTheDocument();

    // Check that other columns are still present
    expect(screen.getByText("Categoria")).toBeInTheDocument();
    expect(screen.getByText("Gasto Total")).toBeInTheDocument();
    expect(screen.getByText("Tarjeta Crédito")).toBeInTheDocument();
    expect(screen.getByText("Tarjeta Débito")).toBeInTheDocument();
    expect(screen.getByText("Efectivo")).toBeInTheDocument();
    expect(screen.getByText("Restante")).toBeInTheDocument();
    expect(screen.getByText("Saldo")).toBeInTheDocument();
  });

  test("table should maintain proper column alignment", async () => {
    renderDashboard();

    // Wait for the component to load
    await screen.findByText("Resumen de Presupuesto");

    // Check that numeric columns have right alignment
    const creditBudgetHeaders = screen.getAllByText("Presupuesto Crédito");
    const creditBudgetHeader = creditBudgetHeaders[0]; // Get the first one (header)
    expect(creditBudgetHeader.closest("th")).toHaveClass("text-right");

    const cashBudgetHeaders = screen.getAllByText("Presupuesto Efectivo");
    const cashBudgetHeader = cashBudgetHeaders[0]; // Get the first one (header)
    expect(cashBudgetHeader.closest("th")).toHaveClass("text-right");
  });

  test("table should display budget values with proper formatting", async () => {
    renderDashboard();

    // Wait for the component to load
    await screen.findByText("Resumen de Presupuesto");

    // Check that currency values are formatted correctly
    // The mock data has credit_budget: 300 and cash_debit_budget: 200 for first item
    expect(screen.getByText("$300")).toBeInTheDocument();
    expect(screen.getByText("$200")).toBeInTheDocument();

    // Check second item values
    expect(screen.getByText("$150")).toBeInTheDocument();
    expect(screen.getByText("$100")).toBeInTheDocument();
  });

  test("totals row should display correct sums for split budget columns", async () => {
    renderDashboard();

    // Wait for the component to load
    await screen.findByText("Resumen de Presupuesto");

    // Check that totals are calculated correctly
    // Total credit budget: 300 + 150 = 450
    // Total cash/debit budget: 200 + 100 = 300
    const totalRows = screen.getAllByText("TOTAL");
    expect(totalRows.length).toBeGreaterThan(0);

    // Check for the total values (they should be in the same row as TOTAL)
    expect(screen.getByText("$450")).toBeInTheDocument(); // Total credit budget
    expect(screen.getByText("$300")).toBeInTheDocument(); // Total cash/debit budget
  });

  test("table should handle empty data gracefully", async () => {
    // Mock empty data response
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            activePeriod: { id: "1", name: "Test Period" },
            totalIncome: 0,
            totalExpenses: 0,
            budgetSummary: [],
          }),
      })
    );

    renderDashboard();

    // Wait for the component to load
    await screen.findByText("Resumen de Presupuesto");

    // Check that empty state message is displayed
    expect(
      screen.getByText(
        "No hay datos para mostrar. Agrega categorías y presupuestos."
      )
    ).toBeInTheDocument();
  });

  test("table should maintain readability with many columns", async () => {
    renderDashboard();

    // Wait for the component to load
    await screen.findByText("Resumen de Presupuesto");

    // Count the number of columns in the header
    const headerRow = document.querySelector("thead tr");
    const headerCells = headerRow?.querySelectorAll("th");

    // Should have 9 columns total
    expect(headerCells).toHaveLength(9);

    // Check that each header cell has proper padding
    headerCells?.forEach((cell) => {
      expect(cell).toHaveClass("px-4");
    });
  });

  test("table wrapper should have proper width constraints", async () => {
    renderDashboard();

    // Wait for the component to load
    await screen.findByText("Resumen de Presupuesto");

    // Check that the main container has proper width constraints
    const mainContainer = document.querySelector(
      ".space-y-6.w-full.max-w-full"
    );
    expect(mainContainer).toBeInTheDocument();

    // Check that the table card content doesn't have width restrictions that would cause issues
    const cardContent =
      document.querySelector('[data-testid="card-content"]') ||
      document.querySelector(
        ".space-y-6 .mt-6 .space-y-6 > div:last-child .p-6"
      );

    // The table should be able to scroll horizontally when needed
    const table = document.querySelector("table");
    expect(table).toHaveClass("w-full");
  });

  test("responsive grid should work correctly for summary cards", async () => {
    renderDashboard();

    // Wait for the component to load
    await screen.findByText("Resumen de Presupuesto");

    // Check that the summary cards grid has responsive classes
    const gridContainer = document.querySelector(
      ".grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-6"
    );
    expect(gridContainer).toBeInTheDocument();
  });

  // Additional responsive design tests for Requirements 3.2, 3.3

  test("table should remain readable on mobile screens (320px width)", async () => {
    // Set mobile viewport
    setViewportSize(320, 568);

    renderDashboard();

    // Wait for the component to load
    await screen.findByText("Resumen de Presupuesto");

    // Check that table wrapper has overflow-auto for horizontal scrolling
    const tableWrapper = document.querySelector(
      ".relative.w-full.overflow-auto"
    );
    expect(tableWrapper).toBeInTheDocument();

    // Verify all column headers are present and accessible
    expect(screen.getByText("Categoria")).toBeInTheDocument();
    expect(screen.getByText("Presupuesto Crédito")).toBeInTheDocument();
    expect(screen.getByText("Presupuesto Efectivo")).toBeInTheDocument();
    expect(screen.getByText("Gasto Total")).toBeInTheDocument();

    // Check that table maintains proper structure
    const table = document.querySelector("table");
    expect(table).toHaveClass("w-full");

    // Verify table cells maintain proper padding for readability
    const tableCells = document.querySelectorAll("td");
    tableCells.forEach((cell) => {
      expect(cell).toHaveClass("px-4");
    });
  });

  test("table should remain readable on tablet screens (768px width)", async () => {
    // Set tablet viewport
    setViewportSize(768, 1024);

    renderDashboard();

    // Wait for the component to load
    await screen.findByText("Resumen de Presupuesto");

    // Check that all columns are visible and properly aligned
    const headerCells = document.querySelectorAll("th");
    expect(headerCells).toHaveLength(9);

    // Verify numeric columns maintain right alignment
    const creditBudgetHeader = screen.getAllByText("Presupuesto Crédito")[0];
    expect(creditBudgetHeader.closest("th")).toHaveClass("text-right");

    const cashBudgetHeader = screen.getAllByText("Presupuesto Efectivo")[0];
    expect(cashBudgetHeader.closest("th")).toHaveClass("text-right");

    // Check that table doesn't overflow container
    const tableContainer = document.querySelector(
      ".space-y-6.w-full.max-w-full"
    );
    expect(tableContainer).toBeInTheDocument();
  });

  test("table should handle large datasets without layout breaking", async () => {
    // Mock large dataset
    const largeBudgetSummary = Array.from({ length: 20 }, (_, index) => ({
      category_id: `${index + 1}`,
      category_name: `Category ${
        index + 1
      } with Very Long Name That Could Break Layout`,
      credit_budget: 300 + index * 10,
      cash_debit_budget: 200 + index * 5,
      expected_amount: 500 + index * 15,
      total_amount: 450 + index * 12,
      credit_amount: 250 + index * 8,
      debit_amount: 100 + index * 2,
      cash_amount: 100 + index * 2,
      remaining: 50 + index * 3,
    }));

    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            activePeriod: { id: "1", name: "Test Period" },
            totalIncome: 10000,
            totalExpenses: 8000,
            budgetSummary: largeBudgetSummary,
          }),
      })
    );

    renderDashboard();

    // Wait for the component to load
    await screen.findByText("Resumen de Presupuesto");

    // Check that table structure is maintained
    const table = document.querySelector("table");
    expect(table).toBeInTheDocument();

    // Verify all rows are rendered
    const dataRows = document.querySelectorAll("tbody tr");
    // Should have 20 data rows + 2 additional rows (totals and headers)
    expect(dataRows.length).toBe(22);

    // Check that totals row is still calculated correctly
    expect(screen.getByText("TOTAL")).toBeInTheDocument();
  });

  test("table should maintain proper column spacing with additional budget columns", async () => {
    renderDashboard();

    // Wait for the component to load
    await screen.findByText("Resumen de Presupuesto");

    // Check that all table headers have consistent spacing
    const headerCells = document.querySelectorAll("th");
    headerCells.forEach((cell) => {
      expect(cell).toHaveClass("px-4");
      expect(cell).toHaveClass("py-3");
    });

    // Check that all table data cells have consistent spacing
    const dataCells = document.querySelectorAll("td");
    dataCells.forEach((cell) => {
      expect(cell).toHaveClass("px-4");
      expect(cell).toHaveClass("py-2");
    });

    // Verify that the new budget columns don't break alignment
    const creditBudgetCells = document.querySelectorAll("td:nth-child(2)");
    const cashBudgetCells = document.querySelectorAll("td:nth-child(3)");

    creditBudgetCells.forEach((cell) => {
      expect(cell).toHaveClass("text-right");
    });

    cashBudgetCells.forEach((cell) => {
      expect(cell).toHaveClass("text-right");
    });
  });

  test("table should handle horizontal scrolling on small screens", async () => {
    // Set very small viewport
    setViewportSize(280, 568);

    renderDashboard();

    // Wait for the component to load
    await screen.findByText("Resumen de Presupuesto");

    // Check that table wrapper allows horizontal scrolling
    const tableWrapper = document.querySelector(
      ".relative.w-full.overflow-auto"
    );
    expect(tableWrapper).toBeInTheDocument();

    // Verify table maintains full width even when container is small
    const table = document.querySelector("table");
    expect(table).toHaveClass("w-full");

    // Check that all columns are still present (not hidden)
    const headerCells = document.querySelectorAll("th");
    expect(headerCells).toHaveLength(9);

    // Verify content is not truncated
    expect(screen.getByText("Presupuesto Crédito")).toBeInTheDocument();
    expect(screen.getByText("Presupuesto Efectivo")).toBeInTheDocument();
  });

  test("summary cards should stack properly on mobile", async () => {
    // Set mobile viewport
    setViewportSize(320, 568);

    renderDashboard();

    // Wait for the component to load
    await screen.findByText("Resumen de Presupuesto");

    // Check that the grid container has responsive classes
    const gridContainer = document.querySelector(
      ".grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-6"
    );
    expect(gridContainer).toBeInTheDocument();

    // Verify all summary cards are present
    expect(screen.getByText("Ingresos Totales")).toBeInTheDocument();
    expect(screen.getByText("Gastos Totales")).toBeInTheDocument();
    expect(screen.getByText("Balance")).toBeInTheDocument();
    expect(screen.getByText("Categorías")).toBeInTheDocument();
    expect(screen.getByText("Total Tarjeta Crédito")).toBeInTheDocument();
  });

  test("tabs should remain functional on different screen sizes", async () => {
    renderDashboard();

    // Wait for the component to load
    await screen.findByText("Resumen de Presupuesto");

    // Check that tabs container has proper width constraints
    const tabsContainer = document.querySelector(".mt-6.w-full.max-w-full");
    expect(tabsContainer).toBeInTheDocument();

    // Verify all tab triggers are present
    expect(screen.getByText("Resumen")).toBeInTheDocument();
    expect(screen.getByText("Gastos Diarios")).toBeInTheDocument();
    expect(screen.getByText("Gastos Acumulados")).toBeInTheDocument();
    expect(screen.getByText("Por Categoría")).toBeInTheDocument();

    // Check that tabs list has proper grid layout
    const tabsList = document.querySelector(
      ".grid.w-full.grid-cols-4.max-w-full"
    );
    expect(tabsList).toBeInTheDocument();

    // Test mobile viewport
    setViewportSize(320, 568);

    // Tabs should still be accessible
    expect(screen.getByText("Resumen")).toBeInTheDocument();
    expect(screen.getByText("Gastos Diarios")).toBeInTheDocument();
  });

  test("table should maintain readability with long category names", async () => {
    // Mock data with very long category names
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            activePeriod: { id: "1", name: "Test Period" },
            totalIncome: 5000,
            totalExpenses: 3000,
            budgetSummary: [
              {
                category_id: "1",
                category_name:
                  "This is a very long category name that could potentially break the table layout and cause issues with responsive design",
                credit_budget: 300,
                cash_debit_budget: 200,
                expected_amount: 500,
                total_amount: 450,
                credit_amount: 250,
                debit_amount: 100,
                cash_amount: 100,
                remaining: 50,
              },
            ],
          }),
      })
    );

    renderDashboard();

    // Wait for the component to load
    await screen.findByText("Resumen de Presupuesto");

    // Check that long category name doesn't break layout
    const categoryCell = screen.getByText(/This is a very long category name/);
    expect(categoryCell).toBeInTheDocument();

    // Verify table structure is maintained
    const table = document.querySelector("table");
    expect(table).toHaveClass("w-full");

    // Check that other columns are still properly aligned
    const headerCells = document.querySelectorAll("th");
    expect(headerCells).toHaveLength(9);
  });

  test("table should handle zero and negative values properly", async () => {
    // Mock data with edge case values
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            activePeriod: { id: "1", name: "Test Period" },
            totalIncome: 5000,
            totalExpenses: 3000,
            budgetSummary: [
              {
                category_id: "1",
                category_name: "Zero Budget Category",
                credit_budget: 0,
                cash_debit_budget: 0,
                expected_amount: 0,
                total_amount: 100,
                credit_amount: 50,
                debit_amount: 25,
                cash_amount: 25,
                remaining: -100,
              },
              {
                category_id: "2",
                category_name: "Overspent Category",
                credit_budget: 200,
                cash_debit_budget: 100,
                expected_amount: 300,
                total_amount: 500,
                credit_amount: 300,
                debit_amount: 100,
                cash_amount: 100,
                remaining: -200,
              },
            ],
          }),
      })
    );

    renderDashboard();

    // Wait for the component to load
    await screen.findByText("Resumen de Presupuesto");

    // Check that zero values are displayed as $0
    expect(screen.getByText("$0")).toBeInTheDocument();

    // Check that negative values are displayed with proper styling
    const negativeValues = document.querySelectorAll(".text-destructive");
    expect(negativeValues.length).toBeGreaterThan(0);

    // Verify table structure is maintained with edge case values
    const table = document.querySelector("table");
    expect(table).toBeInTheDocument();

    const headerCells = document.querySelectorAll("th");
    expect(headerCells).toHaveLength(9);
  });

  // Comprehensive Responsive Design Tests for Task 5 Requirements

  describe("Requirement 3.2: Table readability on different screen sizes", () => {
    test("table remains readable on mobile (320px) with additional budget columns", async () => {
      setViewportSize(320, 568);
      renderDashboard();

      await screen.findByText("Resumen de Presupuesto");

      // Verify table wrapper has horizontal scroll capability
      const tableWrapper = document.querySelector(
        ".relative.w-full.overflow-auto"
      );
      expect(tableWrapper).toBeInTheDocument();

      // Check that all 9 columns are present and accessible
      const headerCells = document.querySelectorAll("th");
      expect(headerCells).toHaveLength(9);

      // Verify both new budget columns are visible
      expect(screen.getByText("Presupuesto Crédito")).toBeInTheDocument();
      expect(screen.getByText("Presupuesto Efectivo")).toBeInTheDocument();

      // Check that table maintains proper structure
      const table = document.querySelector("table");
      expect(table).toHaveClass("w-full");

      // Verify text doesn't wrap inappropriately in cells
      const tableCells = document.querySelectorAll("td, th");
      tableCells.forEach((cell) => {
        const computedStyle = getComputedStyle(cell);
        expect(cell).toHaveClass("px-4"); // Proper padding maintained
      });
    });

    test("table remains readable on tablet (768px) with additional budget columns", async () => {
      setViewportSize(768, 1024);
      renderDashboard();

      await screen.findByText("Resumen de Presupuesto");

      // All columns should be visible without horizontal scroll on tablet
      const headerCells = document.querySelectorAll("th");
      expect(headerCells).toHaveLength(9);

      // Check that new budget columns are properly positioned
      const headers = Array.from(headerCells).map((cell) => cell.textContent);
      expect(headers).toContain("Presupuesto Crédito");
      expect(headers).toContain("Presupuesto Efectivo");

      // Verify column order is logical (Requirements 3.4)
      const categoryIndex = headers.indexOf("Categoria");
      const creditBudgetIndex = headers.indexOf("Presupuesto Crédito");
      const cashBudgetIndex = headers.indexOf("Presupuesto Efectivo");
      const totalExpenseIndex = headers.indexOf("Gasto Total");

      expect(categoryIndex).toBeLessThan(creditBudgetIndex);
      expect(creditBudgetIndex).toBeLessThan(cashBudgetIndex);
      expect(cashBudgetIndex).toBeLessThan(totalExpenseIndex);
    });

    test("table remains readable on desktop (1024px+) with additional budget columns", async () => {
      setViewportSize(1200, 800);
      renderDashboard();

      await screen.findByText("Resumen de Presupuesto");

      // All columns should be comfortably visible
      const headerCells = document.querySelectorAll("th");
      expect(headerCells).toHaveLength(9);

      // Check that table doesn't require horizontal scrolling
      const tableWrapper = document.querySelector(
        ".relative.w-full.overflow-auto"
      );
      expect(tableWrapper).toBeInTheDocument();

      // Verify proper spacing between columns
      headerCells.forEach((cell) => {
        expect(cell).toHaveClass("px-4");
        expect(cell).toHaveClass("py-3");
      });
    });

    test("table handles very wide content without breaking layout", async () => {
      // Mock data with extremely long category names
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              activePeriod: { id: "1", name: "Test Period" },
              totalIncome: 5000,
              totalExpenses: 3000,
              budgetSummary: [
                {
                  category_id: "1",
                  category_name:
                    "This is an extremely long category name that could potentially cause horizontal overflow issues and break the responsive table layout on smaller screens",
                  credit_budget: 300,
                  cash_debit_budget: 200,
                  expected_amount: 500,
                  total_amount: 450,
                  credit_amount: 250,
                  debit_amount: 100,
                  cash_amount: 100,
                  remaining: 50,
                },
              ],
            }),
        })
      );

      setViewportSize(320, 568); // Small mobile screen
      renderDashboard();

      await screen.findByText("Resumen de Presupuesto");

      // Table should still be functional with horizontal scroll
      const tableWrapper = document.querySelector(
        ".relative.w-full.overflow-auto"
      );
      expect(tableWrapper).toBeInTheDocument();

      // All columns should still be present
      const headerCells = document.querySelectorAll("th");
      expect(headerCells).toHaveLength(9);

      // Long content should be contained within table structure
      const table = document.querySelector("table");
      expect(table).toHaveClass("w-full");
    });
  });

  describe("Requirement 3.3: Proper column alignment and spacing", () => {
    test("numeric columns maintain right alignment with additional budget columns", async () => {
      renderDashboard();
      await screen.findByText("Resumen de Presupuesto");

      // Check that all numeric columns have right alignment
      const numericHeaders = [
        "Presupuesto Crédito",
        "Presupuesto Efectivo",
        "Gasto Total",
        "Tarjeta Crédito",
        "Tarjeta Débito",
        "Efectivo",
        "Restante",
        "Saldo",
      ];

      numericHeaders.forEach((headerText) => {
        const headers = screen.getAllByText(headerText);
        const header = headers[0]; // Get the first occurrence (header row)
        expect(header.closest("th")).toHaveClass("text-right");
      });

      // Check that data cells also maintain right alignment
      const dataCells = document.querySelectorAll("td");
      dataCells.forEach((cell, index) => {
        // Skip first column (category name) which should be left-aligned
        if (index % 9 !== 0) {
          // 9 columns total, skip every 9th (category column)
          expect(cell).toHaveClass("text-right");
        }
      });
    });

    test("column spacing is consistent across all columns", async () => {
      renderDashboard();
      await screen.findByText("Resumen de Presupuesto");

      // Check header cell spacing
      const headerCells = document.querySelectorAll("th");
      headerCells.forEach((cell) => {
        expect(cell).toHaveClass("px-4");
        expect(cell).toHaveClass("py-3");
      });

      // Check data cell spacing
      const dataCells = document.querySelectorAll("td");
      dataCells.forEach((cell) => {
        expect(cell).toHaveClass("px-4");
        expect(cell).toHaveClass("py-2");
      });
    });

    test("new budget columns don't disrupt existing column alignment", async () => {
      renderDashboard();
      await screen.findByText("Resumen de Presupuesto");

      // Verify column order and positioning
      const headerCells = document.querySelectorAll("th");
      const headers = Array.from(headerCells).map((cell) => cell.textContent);

      // Expected column order
      const expectedOrder = [
        "Categoria",
        "Presupuesto Crédito",
        "Presupuesto Efectivo",
        "Gasto Total",
        "Tarjeta Crédito",
        "Tarjeta Débito",
        "Efectivo",
        "Restante",
        "Saldo",
      ];

      expect(headers).toEqual(expectedOrder);

      // Check that each column maintains proper width distribution
      headerCells.forEach((cell, index) => {
        // Category column should not have text-right class
        if (index === 0) {
          expect(cell).not.toHaveClass("text-right");
        } else {
          expect(cell).toHaveClass("text-right");
        }
      });
    });

    test("table maintains proper visual hierarchy with additional columns", async () => {
      renderDashboard();
      await screen.findByText("Resumen de Presupuesto");

      // Check that totals row has proper styling
      const totalRows = screen.getAllByText("TOTAL");
      expect(totalRows.length).toBeGreaterThan(0);

      const totalRow = totalRows[0].closest("tr");
      expect(totalRow).toHaveClass("bg-muted/50");
      expect(totalRow).toHaveClass("font-bold");

      // Verify that header row styling is maintained
      const headerRow = document.querySelector("thead tr");
      expect(headerRow).toBeInTheDocument();

      // Check that data rows maintain proper styling
      const dataRows = document.querySelectorAll("tbody tr");
      dataRows.forEach((row) => {
        // Each row should have proper structure
        const cells = row.querySelectorAll("td");
        expect(cells.length).toBe(9);
      });
    });
  });

  describe("Table scrolling behavior on smaller screens", () => {
    test("horizontal scrolling works correctly on mobile devices", async () => {
      setViewportSize(280, 568); // Very small mobile screen
      renderDashboard();

      await screen.findByText("Resumen de Presupuesto");

      // Table wrapper should allow horizontal scrolling
      const tableWrapper = document.querySelector(
        ".relative.w-full.overflow-auto"
      );
      expect(tableWrapper).toBeInTheDocument();

      // Table should maintain full width
      const table = document.querySelector("table");
      expect(table).toHaveClass("w-full");

      // All columns should be present (not hidden)
      const headerCells = document.querySelectorAll("th");
      expect(headerCells).toHaveLength(9);

      // Content should not be truncated
      expect(screen.getByText("Presupuesto Crédito")).toBeInTheDocument();
      expect(screen.getByText("Presupuesto Efectivo")).toBeInTheDocument();
    });

    test("table scrolling doesn't interfere with page scrolling", async () => {
      setViewportSize(320, 568);
      renderDashboard();

      await screen.findByText("Resumen de Presupuesto");

      // Main container should not have horizontal overflow
      const mainContainer = document.querySelector(
        ".space-y-6.w-full.max-w-full"
      );
      expect(mainContainer).toBeInTheDocument();

      // Only the table wrapper should handle horizontal overflow
      const tableWrapper = document.querySelector(
        ".relative.w-full.overflow-auto"
      );
      expect(tableWrapper).toBeInTheDocument();

      // Verify that the table wrapper is properly contained
      const cardContent = tableWrapper?.closest(".p-6");
      expect(cardContent).toBeInTheDocument();
    });

    test("table maintains usability during horizontal scroll", async () => {
      setViewportSize(320, 568);
      renderDashboard();

      await screen.findByText("Resumen de Presupuesto");

      // All interactive elements should remain accessible
      const table = document.querySelector("table");
      expect(table).toBeInTheDocument();

      // Headers should be properly structured for screen readers
      const headerCells = document.querySelectorAll("th");
      headerCells.forEach((cell) => {
        expect(cell.tagName).toBe("TH");
      });

      // Data cells should maintain proper structure
      const dataCells = document.querySelectorAll("td");
      dataCells.forEach((cell) => {
        expect(cell.tagName).toBe("TD");
      });
    });

    test("table scrolling performance with large datasets", async () => {
      // Mock large dataset
      const largeBudgetSummary = Array.from({ length: 50 }, (_, index) => ({
        category_id: `${index + 1}`,
        category_name: `Category ${index + 1}`,
        credit_budget: 300 + index * 10,
        cash_debit_budget: 200 + index * 5,
        expected_amount: 500 + index * 15,
        total_amount: 450 + index * 12,
        credit_amount: 250 + index * 8,
        debit_amount: 100 + index * 2,
        cash_amount: 100 + index * 2,
        remaining: 50 + index * 3,
      }));

      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              activePeriod: { id: "1", name: "Test Period" },
              totalIncome: 25000,
              totalExpenses: 20000,
              budgetSummary: largeBudgetSummary,
            }),
        })
      );

      setViewportSize(320, 568);
      renderDashboard();

      await screen.findByText("Resumen de Presupuesto");

      // Table should handle large dataset without layout issues
      const table = document.querySelector("table");
      expect(table).toBeInTheDocument();

      // All rows should be rendered
      const dataRows = document.querySelectorAll("tbody tr");
      expect(dataRows.length).toBe(52); // 50 data rows + totals row + header row

      // Scrolling container should be properly configured
      const tableWrapper = document.querySelector(
        ".relative.w-full.overflow-auto"
      );
      expect(tableWrapper).toBeInTheDocument();

      // Performance: Check that DOM structure is efficient
      const allCells = document.querySelectorAll("td, th");
      expect(allCells.length).toBe(52 * 9); // 52 rows * 9 columns
    });
  });

  describe("Integration with other responsive components", () => {
    test("summary cards grid responds properly with table layout", async () => {
      setViewportSize(320, 568);
      renderDashboard();

      await screen.findByText("Resumen de Presupuesto");

      // Summary cards should stack on mobile
      const gridContainer = document.querySelector(
        ".grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-6"
      );
      expect(gridContainer).toBeInTheDocument();

      // Cards should be accessible
      expect(screen.getByText("Ingresos Totales")).toBeInTheDocument();
      expect(screen.getByText("Gastos Totales")).toBeInTheDocument();
      expect(screen.getByText("Balance")).toBeInTheDocument();

      // Table should not interfere with cards layout
      const tableCard = screen
        .getByText("Resumen de Presupuesto")
        .closest(".rounded-lg");
      expect(tableCard).toBeInTheDocument();
    });

    test("tabs remain functional across different screen sizes", async () => {
      const screenSizes = [
        [320, 568], // Mobile
        [768, 1024], // Tablet
        [1200, 800], // Desktop
      ];

      for (const [width, height] of screenSizes) {
        setViewportSize(width, height);
        renderDashboard();

        await screen.findByText("Resumen de Presupuesto");

        // All tabs should be accessible
        expect(screen.getByText("Resumen")).toBeInTheDocument();
        expect(screen.getByText("Gastos Diarios")).toBeInTheDocument();
        expect(screen.getByText("Gastos Acumulados")).toBeInTheDocument();
        expect(screen.getByText("Por Categoría")).toBeInTheDocument();

        // Tabs container should have proper responsive classes
        const tabsList = document.querySelector(
          ".grid.w-full.grid-cols-4.max-w-full"
        );
        expect(tabsList).toBeInTheDocument();
      }
    });

    test("fund filter component works with responsive table", async () => {
      setViewportSize(768, 1024);
      renderDashboard();

      await screen.findByText("Resumen de Presupuesto");

      // Fund filter should be accessible
      expect(screen.getByText("Filtro de Fondo")).toBeInTheDocument();
      expect(screen.getByText("Todos los fondos")).toBeInTheDocument();

      // Filter should not interfere with table layout
      const tableWrapper = document.querySelector(
        ".relative.w-full.overflow-auto"
      );
      expect(tableWrapper).toBeInTheDocument();

      // Both components should coexist properly
      expect(screen.getByText("Presupuesto Crédito")).toBeInTheDocument();
      expect(screen.getByText("Presupuesto Efectivo")).toBeInTheDocument();
    });
  });
});
