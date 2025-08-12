import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BudgetsView } from "../budgets-view";

// Mock the useToast hook
const mockToast = jest.fn();
jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock utility functions
jest.mock("@/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
}));

// Mock data
const mockCategories = [
  { id: "cat-1", name: "Alimentación" },
  { id: "cat-2", name: "Transporte" },
  { id: "cat-3", name: "Entretenimiento" },
];

const mockPeriods = [
  { id: "period-1", name: "Enero 2024", month: 0, year: 2024, is_open: true, isOpen: true },
  { id: "period-2", name: "Febrero 2024", month: 1, year: 2024, is_open: false, isOpen: false },
];

const mockBudgets = [
  { id: "budget-1", category_id: "cat-1", period_id: "period-1", expected_amount: 300, payment_method: "debit" },
  { id: "budget-2", category_id: "cat-2", period_id: "period-1", expected_amount: 150, payment_method: "cash" },
];

// Mock the useBudget hook
const mockBudgetContext = {
  categories: mockCategories,
  periods: mockPeriods,
  budgets: mockBudgets,
  activePeriod: mockPeriods[0],
  addBudget: jest.fn(),
  updateBudget: jest.fn(),
};

jest.mock("@/context/budget-context", () => ({
  useBudget: () => mockBudgetContext,
}));

describe("BudgetsView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial Rendering", () => {
    it("renders the budgets view with header", () => {
      render(<BudgetsView />);

      expect(screen.getByText("Presupuestos")).toBeInTheDocument();
    });

    it("shows period selector", () => {
      render(<BudgetsView />);

      expect(screen.getByText(/Enero 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Activo/)).toBeInTheDocument();
    });

    it("displays budget summary", () => {
      render(<BudgetsView />);

      expect(screen.getByText("Total Presupuestado")).toBeInTheDocument();
    });

    it("shows categories table headers", () => {
      render(<BudgetsView />);

      expect(screen.getByText("Categoría")).toBeInTheDocument();
      expect(screen.getByText("Efectivo")).toBeInTheDocument();
      expect(screen.getByText("Crédito")).toBeInTheDocument();
      expect(screen.getByText("Total")).toBeInTheDocument();
      expect(screen.getByText("Acciones")).toBeInTheDocument();
    });

    it("displays categories from context", () => {
      render(<BudgetsView />);

      expect(screen.getByText("Alimentación")).toBeInTheDocument();
      expect(screen.getByText("Transporte")).toBeInTheDocument();
      expect(screen.getByText("Entretenimiento")).toBeInTheDocument();
    });
  });

  describe("Budget Display", () => {
    it("shows existing budget amounts", () => {
      render(<BudgetsView />);

      // Check that multiple $150.00 amounts exist (summary + table)
      expect(screen.getAllByText("$150.00")).toHaveLength(3); // Summary, cash column, total column
    });

    it("shows total budget calculation", () => {
      render(<BudgetsView />);

      // Total should be 300 + 150 = 450
      expect(screen.getByText("$450.00")).toBeInTheDocument();
    });

    it("shows count of categories with budget", () => {
      render(<BudgetsView />);

      expect(screen.getByText("2 categorías con presupuesto")).toBeInTheDocument();
    });
  });

  describe("Add Budget Functionality", () => {
    it("shows add buttons for categories", () => {
      render(<BudgetsView />);

      const addButtons = screen.getAllByText("Agregar");
      expect(addButtons).toHaveLength(mockCategories.length);
    });

    it("opens add dialog when add button is clicked", () => {
      render(<BudgetsView />);

      const addButtons = screen.getAllByText("Agregar");
      fireEvent.click(addButtons[0]);

      expect(screen.getByText("Establecer Presupuesto")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("component renders without crashing with valid data", () => {
      render(<BudgetsView />);

      expect(screen.getByText("Presupuestos")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper table structure", () => {
      render(<BudgetsView />);

      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("has accessible buttons", () => {
      render(<BudgetsView />);

      const addButtons = screen.getAllByRole("button", { name: /agregar/i });
      expect(addButtons.length).toBeGreaterThan(0);
    });
  });
});