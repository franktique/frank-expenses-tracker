import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CategoriesView } from "../categories-view";
import { BudgetProvider } from "@/context/budget-context";
import { Fund, Category } from "@/types/funds";

// Mock the budget context
const mockCategories: Category[] = [
  {
    id: "1",
    name: "Alimentación",
    fund_id: "fund1",
    fund_name: "Disponible",
    associated_funds: [
      {
        id: "fund1",
        name: "Disponible",
        description: "",
        initial_balance: 1000,
        current_balance: 800,
        start_date: "2024-01-01",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "fund2",
        name: "Emergencias",
        description: "",
        initial_balance: 500,
        current_balance: 500,
        start_date: "2024-01-01",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    ],
  },
  {
    id: "2",
    name: "Transporte",
    fund_id: "fund1",
    fund_name: "Disponible",
    associated_funds: [
      {
        id: "fund1",
        name: "Disponible",
        description: "",
        initial_balance: 1000,
        current_balance: 800,
        start_date: "2024-01-01",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    ],
  },
];

const mockFunds: Fund[] = [
  {
    id: "fund1",
    name: "Disponible",
    description: "",
    initial_balance: 1000,
    current_balance: 800,
    start_date: "2024-01-01",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "fund2",
    name: "Emergencias",
    description: "",
    initial_balance: 500,
    current_balance: 500,
    start_date: "2024-01-01",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "fund3",
    name: "Vacaciones",
    description: "",
    initial_balance: 300,
    current_balance: 300,
    start_date: "2024-01-01",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
];

const mockBudgetContext = {
  categories: mockCategories,
  funds: mockFunds,
  periods: [],
  budgets: [],
  incomes: [],
  expenses: [],
  activePeriod: null,
  selectedFund: null,
  fundFilter: null,
  isLoading: false,
  error: null,
  isDbInitialized: true,
  dbConnectionError: false,
  connectionErrorDetails: null,
  setupDatabase: jest.fn(),
  addCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  addPeriod: jest.fn(),
  updatePeriod: jest.fn(),
  deletePeriod: jest.fn(),
  openPeriod: jest.fn(),
  closePeriod: jest.fn(),
  addBudget: jest.fn(),
  updateBudget: jest.fn(),
  deleteBudget: jest.fn(),
  addIncome: jest.fn(),
  updateIncome: jest.fn(),
  deleteIncome: jest.fn(),
  addExpense: jest.fn(),
  updateExpense: jest.fn(),
  deleteExpense: jest.fn(),
  addFund: jest.fn(),
  updateFund: jest.fn(),
  deleteFund: jest.fn(),
  recalculateFundBalance: jest.fn(),
  setSelectedFund: jest.fn(),
  setFundFilter: jest.fn(),
  getFilteredCategories: jest.fn(),
  getFilteredIncomes: jest.fn(),
  getFilteredExpenses: jest.fn(),
  getDashboardData: jest.fn(),
  getCategoryById: jest.fn(),
  getPeriodById: jest.fn(),
  getFundById: jest.fn(),
  getDefaultFund: jest.fn(),
  refreshData: jest.fn(),
  refreshFunds: jest.fn(),
  validateActivePeriodCache: jest.fn(),
};

// Mock fetch
global.fetch = jest.fn();

jest.mock("@/context/budget-context", () => ({
  useBudget: () => mockBudgetContext,
  BudgetProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe("CategoriesView Multi-Fund Support", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("displays multiple funds as badges for categories", () => {
    render(<CategoriesView />);

    // Check that Alimentación shows multiple fund badges
    const disponibleBadges = screen.getAllByText("Disponible");
    expect(disponibleBadges.length).toBe(2); // One for each category
    expect(screen.getByText("Emergencias")).toBeInTheDocument();

    // Check that both categories are displayed
    expect(screen.getByText("Alimentación")).toBeInTheDocument();
    expect(screen.getByText("Transporte")).toBeInTheDocument();
  });

  it("opens add dialog with MultiFundSelector", async () => {
    render(<CategoriesView />);

    // Click add category button
    const addButton = screen.getByText("Nueva Categoría");
    fireEvent.click(addButton);

    // Check that dialog opens with MultiFundSelector
    await waitFor(() => {
      expect(screen.getByText("Agregar Categoría")).toBeInTheDocument();
      expect(
        screen.getByText("Fondos asociados (opcional)")
      ).toBeInTheDocument();
      expect(screen.getByText("Seleccionar fondos...")).toBeInTheDocument();
    });
  });

  it("opens edit dialog with current funds selected", async () => {
    render(<CategoriesView />);

    // Click edit button for first category
    const editButtons = screen.getAllByText("Editar");
    fireEvent.click(editButtons[0]);

    // Check that dialog opens with current funds
    await waitFor(() => {
      expect(screen.getByText("Editar Categoría")).toBeInTheDocument();
      expect(
        screen.getByText("Fondos asociados (opcional)")
      ).toBeInTheDocument();
    });
  });

  it("filters categories by fund correctly", () => {
    render(<CategoriesView />);

    // Both categories should be visible initially
    expect(screen.getByText("Alimentación")).toBeInTheDocument();
    expect(screen.getByText("Transporte")).toBeInTheDocument();
  });

  it("shows validation warning for category deletion", async () => {
    // Mock fetch to return expenses for category
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: "1", category_id: "1" }]),
    });

    render(<CategoriesView />);

    // Click delete button
    const deleteButtons = screen.getAllByText("Eliminar");
    fireEvent.click(deleteButtons[0]);

    // Click delete in dialog
    await waitFor(() => {
      const deleteButton = screen.getByRole("button", { name: "Eliminar" });
      fireEvent.click(deleteButton);
    });

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByText("Confirmar eliminación")).toBeInTheDocument();
    });
  });
});
