import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { PeriodsView } from "../periods-view";
import { renderWithProviders, mockFetch, mockFetchError } from "./utils/test-utils";
import { mockPeriods } from "./fixtures/test-data";
import { BudgetContextType } from "./utils/test-utils";

// Mock the useToast hook
const mockToast = jest.fn();
jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock utility functions
jest.mock("@/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
  formatDate: (date: Date, options?: any) => {
    if (options?.month === "long" && options?.year === "numeric") {
      return date.toLocaleDateString("es", options);
    }
    return date.toLocaleDateString("es-CO");
  },
}));

// Mock Calendar component
jest.mock("@/components/ui/calendar", () => ({
  Calendar: ({ selected, onSelect }: any) => (
    <div data-testid="calendar">
      <button onClick={() => onSelect(new Date(2024, 0, 15))}>
        Select Date
      </button>
      <span>Selected: {selected?.toISOString()}</span>
    </div>
  ),
}));

// Mock timer functions for debouncing tests
jest.useFakeTimers();

describe("PeriodsView", () => {
  const mockBudgetContext: Partial<BudgetContextType> = {
    periods: mockPeriods,
    activePeriod: mockPeriods[0], // January 2024 (open period)
    addPeriod: jest.fn(),
    updatePeriod: jest.fn(),
    deletePeriod: jest.fn(),
    openPeriod: jest.fn(),
    closePeriod: jest.fn(),
    refreshData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    mockFetch({ success: true });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe("Initial Rendering", () => {
    it("renders the periods view with header", () => {
      renderWithProviders(<PeriodsView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByText("Periodos")).toBeInTheDocument();
      expect(screen.getByText("Nuevo Periodo")).toBeInTheDocument();
      expect(screen.getByText("Actualizar")).toBeInTheDocument();
    });

    it("renders periods table with headers", () => {
      renderWithProviders(<PeriodsView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByText("Nombre")).toBeInTheDocument();
      expect(screen.getByText("Mes/Año")).toBeInTheDocument();
      expect(screen.getByText("Estado")).toBeInTheDocument();
      expect(screen.getByText("Acciones")).toBeInTheDocument();
    });

    it("displays periods data correctly", () => {
      renderWithProviders(<PeriodsView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByText("Enero 2024")).toBeInTheDocument();
      expect(screen.getByText("Febrero 2024")).toBeInTheDocument();
      expect(screen.getByText("Activo")).toBeInTheDocument();
      expect(screen.getByText("Inactivo")).toBeInTheDocument();
    });

    it("shows empty state when no periods exist", () => {
      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { ...mockBudgetContext, periods: [] },
      });

      expect(screen.getByText("No hay periodos. Agrega un nuevo periodo para comenzar.")).toBeInTheDocument();
    });

    it("refreshes data on component mount", async () => {
      const mockRefreshData = jest.fn().mockResolvedValue({});

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { ...mockBudgetContext, refreshData: mockRefreshData },
      });

      await waitFor(() => {
        expect(mockRefreshData).toHaveBeenCalled();
      });
    });
  });

  describe("Add Period Dialog", () => {
    it("opens add period dialog when button is clicked", () => {
      renderWithProviders(<PeriodsView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText("Nuevo Periodo"));

      expect(screen.getByText("Agregar Periodo")).toBeInTheDocument();
      expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
      expect(screen.getByLabelText("Mes y Año")).toBeInTheDocument();
    });

    it("allows entering period information", () => {
      renderWithProviders(<PeriodsView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText("Nuevo Periodo"));

      const nameInput = screen.getByLabelText("Nombre");
      fireEvent.change(nameInput, { target: { value: "Marzo 2024" } });

      expect(nameInput).toHaveValue("Marzo 2024");
    });

    it("allows selecting date from calendar", () => {
      renderWithProviders(<PeriodsView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText("Nuevo Periodo"));

      // Open calendar
      fireEvent.click(screen.getByText("Selecciona un mes"));

      expect(screen.getByTestId("calendar")).toBeInTheDocument();

      // Select a date
      fireEvent.click(screen.getByText("Select Date"));

      // Calendar should close and date should be selected
      expect(screen.queryByTestId("calendar")).not.toBeInTheDocument();
    });

    it("creates period successfully", async () => {
      const mockAddPeriod = jest.fn().mockResolvedValue({});

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { ...mockBudgetContext, addPeriod: mockAddPeriod },
      });

      fireEvent.click(screen.getByText("Nuevo Periodo"));

      // Fill form
      fireEvent.change(screen.getByLabelText("Nombre"), {
        target: { value: "Marzo 2024" },
      });

      // Submit
      fireEvent.click(screen.getByText("Guardar"));

      await waitFor(() => {
        expect(mockAddPeriod).toHaveBeenCalledWith(
          "Marzo 2024",
          expect.any(Number), // month
          expect.any(Number)  // year
        );
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Periodo agregado",
        description: "El periodo ha sido agregado exitosamente",
      });
    });

    it("validates required fields", async () => {
      renderWithProviders(<PeriodsView />, {
        budgetContextValue: mockBudgetContext,
      });

      fireEvent.click(screen.getByText("Nuevo Periodo"));
      fireEvent.click(screen.getByText("Guardar"));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Todos los campos son obligatorios",
          variant: "destructive",
        });
      });
    });

    it("handles creation errors", async () => {
      const mockAddPeriod = jest.fn().mockRejectedValue(new Error("Period already exists"));

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { ...mockBudgetContext, addPeriod: mockAddPeriod },
      });

      fireEvent.click(screen.getByText("Nuevo Periodo"));

      fireEvent.change(screen.getByLabelText("Nombre"), {
        target: { value: "Test Period" },
      });

      fireEvent.click(screen.getByText("Guardar"));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "No se pudo agregar el periodo: Period already exists",
          variant: "destructive",
        });
      });
    });
  });

  describe("Period Editing", () => {
    it("opens edit dialog when edit button is clicked", () => {
      renderWithProviders(<PeriodsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const editButtons = screen.getAllByText("Editar");
      fireEvent.click(editButtons[0]);

      expect(screen.getByText("Editar Periodo")).toBeInTheDocument();
      expect(screen.getByText("Actualiza los detalles del periodo")).toBeInTheDocument();
    });

    it("populates edit form with existing period data", () => {
      renderWithProviders(<PeriodsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const editButtons = screen.getAllByText("Editar");
      fireEvent.click(editButtons[0]);

      expect(screen.getByDisplayValue("Enero 2024")).toBeInTheDocument();
    });

    it("updates period successfully", async () => {
      const mockUpdatePeriod = jest.fn().mockResolvedValue({});

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { ...mockBudgetContext, updatePeriod: mockUpdatePeriod },
      });

      const editButtons = screen.getAllByText("Editar");
      fireEvent.click(editButtons[0]);

      fireEvent.change(screen.getByDisplayValue("Enero 2024"), {
        target: { value: "Enero 2024 Actualizado" },
      });

      fireEvent.click(screen.getByText("Guardar"));

      await waitFor(() => {
        expect(mockUpdatePeriod).toHaveBeenCalledWith(
          "period-1",
          "Enero 2024 Actualizado",
          expect.any(Number),
          expect.any(Number)
        );
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Periodo actualizado",
        description: "El periodo ha sido actualizado exitosamente",
      });
    });

    it("validates edit form data", async () => {
      renderWithProviders(<PeriodsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const editButtons = screen.getAllByText("Editar");
      fireEvent.click(editButtons[0]);

      // Clear required fields
      fireEvent.change(screen.getByDisplayValue("Enero 2024"), {
        target: { value: "" },
      });

      fireEvent.click(screen.getByText("Guardar"));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Todos los campos son obligatorios",
          variant: "destructive",
        });
      });
    });
  });

  describe("Period Deletion", () => {
    it("opens delete dialog when delete button is clicked", () => {
      renderWithProviders(<PeriodsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const deleteButtons = screen.getAllByText("Eliminar");
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText("Eliminar Periodo")).toBeInTheDocument();
      expect(screen.getByText(/Esta acción no se puede deshacer/)).toBeInTheDocument();
    });

    it("deletes period successfully", async () => {
      const mockDeletePeriod = jest.fn().mockResolvedValue({});

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { ...mockBudgetContext, deletePeriod: mockDeletePeriod },
      });

      const deleteButtons = screen.getAllByText("Eliminar");
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getAllByText("Eliminar")[1]); // Confirm button

      await waitFor(() => {
        expect(mockDeletePeriod).toHaveBeenCalledWith("period-1");
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Periodo eliminado",
        description: "El periodo ha sido eliminado exitosamente",
      });
    });

    it("handles deletion errors", async () => {
      const mockDeletePeriod = jest.fn().mockRejectedValue(new Error("Cannot delete active period"));

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { ...mockBudgetContext, deletePeriod: mockDeletePeriod },
      });

      const deleteButtons = screen.getAllByText("Eliminar");
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getAllByText("Eliminar")[1]);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "No se pudo eliminar el periodo: Cannot delete active period",
          variant: "destructive",
        });
      });
    });
  });

  describe("Period Activation/Deactivation", () => {
    it("shows activation confirmation when another period is active", () => {
      renderWithProviders(<PeriodsView />, {
        budgetContextValue: mockBudgetContext,
      });

      // Try to activate inactive period (Febrero 2024)
      const activateButtons = screen.getAllByText("Activar");
      fireEvent.click(activateButtons[0]);

      expect(screen.getByText("Confirmar Activación de Periodo")).toBeInTheDocument();
      expect(screen.getByText(/Ya hay un periodo activo/)).toBeInTheDocument();
    });

    it("activates period directly when no active period", async () => {
      const mockOpenPeriod = jest.fn().mockResolvedValue({});

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { 
          ...mockBudgetContext, 
          activePeriod: null,
          openPeriod: mockOpenPeriod 
        },
      });

      const activateButtons = screen.getAllByText("Activar");
      fireEvent.click(activateButtons[0]);

      await waitFor(() => {
        expect(mockOpenPeriod).toHaveBeenCalledWith("period-1");
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Periodo activado",
        description: "El periodo ha sido establecido como activo exitosamente",
      });
    });

    it("confirms and activates period", async () => {
      const mockOpenPeriod = jest.fn().mockResolvedValue({});

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { ...mockBudgetContext, openPeriod: mockOpenPeriod },
      });

      // Try to activate inactive period
      const activateButtons = screen.getAllByText("Activar");
      fireEvent.click(activateButtons[0]);

      // Confirm activation
      fireEvent.click(screen.getByText("Confirmar"));

      await waitFor(() => {
        expect(mockOpenPeriod).toHaveBeenCalledWith("period-2");
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Periodo activado",
        description: "El periodo ha sido establecido como activo exitosamente",
      });
    });

    it("cancels activation confirmation", () => {
      renderWithProviders(<PeriodsView />, {
        budgetContextValue: mockBudgetContext,
      });

      // Try to activate inactive period
      const activateButtons = screen.getAllByText("Activar");
      fireEvent.click(activateButtons[0]);

      // Cancel activation
      fireEvent.click(screen.getByText("Cancelar"));

      expect(screen.queryByText("Confirmar Activación de Periodo")).not.toBeInTheDocument();
    });

    it("deactivates period successfully", async () => {
      const mockClosePeriod = jest.fn().mockResolvedValue({});

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { ...mockBudgetContext, closePeriod: mockClosePeriod },
      });

      const deactivateButton = screen.getByText("Desactivar");
      fireEvent.click(deactivateButton);

      await waitFor(() => {
        expect(mockClosePeriod).toHaveBeenCalledWith("period-1");
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Periodo desactivado",
        description: "El periodo ha sido desactivado exitosamente",
      });
    });

    it("shows loading states during activation/deactivation", async () => {
      const mockOpenPeriod = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { ...mockBudgetContext, openPeriod: mockOpenPeriod },
      });

      const activateButtons = screen.getAllByText("Activar");
      fireEvent.click(activateButtons[0]);

      // Confirm activation
      fireEvent.click(screen.getByText("Confirmar"));

      expect(screen.getByText("Activando...")).toBeInTheDocument();

      // Buttons should be disabled
      expect(screen.getByText("Activando...")).toBeDisabled();
    });

    it("prevents rapid successive operations with debouncing", async () => {
      const mockOpenPeriod = jest.fn().mockResolvedValue({});

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { 
          ...mockBudgetContext, 
          activePeriod: null,
          openPeriod: mockOpenPeriod 
        },
      });

      const activateButtons = screen.getAllByText("Activar");
      
      // First operation
      fireEvent.click(activateButtons[0]);
      
      await waitFor(() => {
        expect(mockOpenPeriod).toHaveBeenCalledTimes(1);
      });

      // Second operation within debounce window
      fireEvent.click(activateButtons[0]);

      expect(mockToast).toHaveBeenCalledWith({
        title: "Operación muy rápida",
        description: "Espera un momento antes de realizar otra operación",
        variant: "destructive",
      });

      expect(mockOpenPeriod).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe("Error Handling", () => {
    it("handles activation errors with specific error types", async () => {
      const mockOpenPeriod = jest.fn().mockRejectedValue(new Error("fetch failed"));

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { 
          ...mockBudgetContext, 
          activePeriod: null,
          openPeriod: mockOpenPeriod 
        },
      });

      const activateButtons = screen.getAllByText("Activar");
      fireEvent.click(activateButtons[0]);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error de red",
          description: "No se pudo conectar al servidor. Verifica tu conexión a internet.",
          variant: "destructive",
        });
      });
    });

    it("handles timeout errors", async () => {
      const mockOpenPeriod = jest.fn().mockRejectedValue(new Error("Operation timed out"));

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { 
          ...mockBudgetContext, 
          activePeriod: null,
          openPeriod: mockOpenPeriod 
        },
      });

      const activateButtons = screen.getAllByText("Activar");
      fireEvent.click(activateButtons[0]);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Tiempo de espera agotado",
          description: "La operación tardó demasiado tiempo. Intenta nuevamente.",
          variant: "destructive",
        });
      });
    });

    it("handles deactivation errors with specific error codes", async () => {
      const error = new Error("Database error");
      (error as any).code = "DATABASE_CONNECTION_ERROR";
      const mockClosePeriod = jest.fn().mockRejectedValue(error);

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { ...mockBudgetContext, closePeriod: mockClosePeriod },
      });

      const deactivateButton = screen.getByText("Desactivar");
      fireEvent.click(deactivateButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error de conexión",
          description: "No se pudo conectar a la base de datos. Verifica tu conexión e intenta nuevamente.",
          variant: "destructive",
        });
      });
    });

    it("shows retry notification for failed operations", async () => {
      const mockOpenPeriod = jest.fn().mockRejectedValue(new Error("fetch failed"));

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { 
          ...mockBudgetContext, 
          activePeriod: null,
          openPeriod: mockOpenPeriod 
        },
      });

      const activateButtons = screen.getAllByText("Activar");
      fireEvent.click(activateButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Operación fallida: Activar/)).toBeInTheDocument();
        expect(screen.getByText("Reintentar")).toBeInTheDocument();
        expect(screen.getByText("Descartar")).toBeInTheDocument();
      });
    });

    it("retries failed operations", async () => {
      const mockOpenPeriod = jest.fn()
        .mockRejectedValueOnce(new Error("fetch failed"))
        .mockResolvedValueOnce({});

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { 
          ...mockBudgetContext, 
          activePeriod: null,
          openPeriod: mockOpenPeriod 
        },
      });

      const activateButtons = screen.getAllByText("Activar");
      fireEvent.click(activateButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Reintentar")).toBeInTheDocument();
      });

      // Retry the operation
      fireEvent.click(screen.getByText("Reintentar"));

      await waitFor(() => {
        expect(mockOpenPeriod).toHaveBeenCalledTimes(2);
        expect(mockToast).toHaveBeenCalledWith({
          title: "Periodo activado",
          description: "El periodo ha sido establecido como activo exitosamente",
        });
      });
    });

    it("dismisses retry notification", async () => {
      const mockOpenPeriod = jest.fn().mockRejectedValue(new Error("fetch failed"));

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { 
          ...mockBudgetContext, 
          activePeriod: null,
          openPeriod: mockOpenPeriod 
        },
      });

      const activateButtons = screen.getAllByText("Activar");
      fireEvent.click(activateButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Descartar")).toBeInTheDocument();
      });

      // Dismiss the notification
      fireEvent.click(screen.getByText("Descartar"));

      expect(screen.queryByText(/Operación fallida/)).not.toBeInTheDocument();
    });
  });

  describe("Data Refresh", () => {
    it("refreshes data when refresh button is clicked", async () => {
      const mockRefreshData = jest.fn().mockResolvedValue({});

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { ...mockBudgetContext, refreshData: mockRefreshData },
      });

      fireEvent.click(screen.getByText("Actualizar"));

      await waitFor(() => {
        expect(mockRefreshData).toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith({
          title: "Datos actualizados",
          description: "Los períodos han sido actualizados correctamente",
        });
      });
    });

    it("shows loading state during refresh", async () => {
      const mockRefreshData = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { ...mockBudgetContext, refreshData: mockRefreshData },
      });

      fireEvent.click(screen.getByText("Actualizar"));

      expect(screen.getByText("Actualizando...")).toBeInTheDocument();
      expect(screen.getByText("Actualizando...")).toBeDisabled();
    });

    it("handles refresh errors", async () => {
      const mockRefreshData = jest.fn().mockRejectedValue(new Error("Network error"));

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { ...mockBudgetContext, refreshData: mockRefreshData },
      });

      fireEvent.click(screen.getByText("Actualizar"));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error al actualizar",
          description: "Network error",
          variant: "destructive",
        });
      });
    });

    it("refreshes data automatically after activation errors", async () => {
      const mockOpenPeriod = jest.fn().mockRejectedValue(new Error("fetch failed"));
      const mockRefreshData = jest.fn().mockResolvedValue({});

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { 
          ...mockBudgetContext, 
          activePeriod: null,
          openPeriod: mockOpenPeriod,
          refreshData: mockRefreshData
        },
      });

      const activateButtons = screen.getAllByText("Activar");
      fireEvent.click(activateButtons[0]);

      await waitFor(() => {
        expect(mockOpenPeriod).toHaveBeenCalled();
      });

      // Fast forward timers for the setTimeout
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockRefreshData).toHaveBeenCalled();
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels and roles", () => {
      renderWithProviders(<PeriodsView />, {
        budgetContextValue: mockBudgetContext,
      });

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /nuevo periodo/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /actualizar/i })).toBeInTheDocument();

      const actionButtons = screen.getAllByRole("button", { name: /activar|desactivar|editar|eliminar/i });
      expect(actionButtons.length).toBeGreaterThan(0);
    });

    it("supports keyboard navigation", () => {
      renderWithProviders(<PeriodsView />, {
        budgetContextValue: mockBudgetContext,
      });

      const newPeriodButton = screen.getByText("Nuevo Periodo");
      newPeriodButton.focus();
      expect(newPeriodButton).toHaveFocus();

      const refreshButton = screen.getByText("Actualizar");
      refreshButton.focus();
      expect(refreshButton).toHaveFocus();
    });

    it("disables buttons during operations", async () => {
      const mockOpenPeriod = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      renderWithProviders(<PeriodsView />, {
        budgetContextValue: { ...mockBudgetContext, openPeriod: mockOpenPeriod },
      });

      const activateButtons = screen.getAllByText("Activar");
      fireEvent.click(activateButtons[0]);

      // Confirm activation
      fireEvent.click(screen.getByText("Confirmar"));

      // All action buttons should be disabled
      const editButtons = screen.getAllByText("Editar");
      const deleteButtons = screen.getAllByText("Eliminar");

      editButtons.forEach(button => expect(button).toBeDisabled());
      deleteButtons.forEach(button => expect(button).toBeDisabled());
    });
  });

  describe("Error Boundary Scenarios", () => {
    it("handles missing context data gracefully", () => {
      renderWithProviders(<PeriodsView />, {
        budgetContextValue: {
          ...mockBudgetContext,
          periods: undefined,
        },
      });

      expect(screen.getByText("Periodos")).toBeInTheDocument();
    });

    it("handles empty periods array", () => {
      renderWithProviders(<PeriodsView />, {
        budgetContextValue: {
          ...mockBudgetContext,
          periods: [],
        },
      });

      expect(screen.getByText("No hay periodos. Agrega un nuevo periodo para comenzar.")).toBeInTheDocument();
    });
  });
});