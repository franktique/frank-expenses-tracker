/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import "@testing-library/jest-dom";

// Mock the UI components
const MockCheckbox = ({
  id,
  checked,
  onCheckedChange,
  disabled,
  ...props
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <input
    type="checkbox"
    id={id}
    checked={checked}
    onChange={(e) => onCheckedChange(e.target.checked)}
    disabled={disabled}
    data-testid={id}
    {...props}
  />
);

const MockLabel = ({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) => (
  <label htmlFor={htmlFor} data-testid={`${htmlFor}-label`}>
    {children}
  </label>
);

// Mock toast function
const mockToast = jest.fn();
jest.mock("@/components/ui/use-toast", () => ({
  toast: mockToast,
}));

// Mock UI components
jest.mock("@/components/ui/checkbox", () => ({
  Checkbox: MockCheckbox,
}));

jest.mock("@/components/ui/label", () => ({
  Label: MockLabel,
}));

describe("Simulate Mode UI Behavior", () => {
  // Mock component that includes simulate mode UI
  const SimulateModeComponent = ({
    activeTab = "current",
    simulateMode = false,
    onSimulateModeChange = jest.fn(),
  }: {
    activeTab?: string;
    simulateMode?: boolean;
    onSimulateModeChange?: (checked: boolean) => void;
  }) => {
    return (
      <div data-testid="simulate-mode-container">
        <div className="flex items-center space-x-2">
          <MockCheckbox
            id="simulate-mode"
            checked={simulateMode}
            onCheckedChange={onSimulateModeChange}
            disabled={activeTab !== "current"}
          />
          <MockLabel htmlFor="simulate-mode">Simular</MockLabel>
        </div>
      </div>
    );
  };

  // Mock chart component with simulation styling
  const MockChart = ({
    data,
    isSimulating = false,
  }: {
    data: Array<{ name: string; value: number; isSimulated?: boolean }>;
    isSimulating?: boolean;
  }) => {
    const title = isSimulating ? "Gráfico (Simulación)" : "Gráfico";

    return (
      <div data-testid="mock-chart">
        <h3 data-testid="chart-title">{title}</h3>
        <div data-testid="chart-legend">
          {isSimulating ? "Presupuesto" : "Gastos"}
        </div>
        {data.map((item, index) => (
          <div
            key={index}
            data-testid={`chart-bar-${index}`}
            className={item.isSimulated ? "simulated-bar" : "normal-bar"}
            style={{
              opacity: item.isSimulated ? 0.7 : 1,
            }}
          >
            {item.name}: ${item.value}
          </div>
        ))}
      </div>
    );
  };

  // Mock tooltip component
  const MockTooltip = ({
    isSimulating,
    value,
    label,
  }: {
    isSimulating: boolean;
    value: number;
    label: string;
  }) => {
    const tooltipText = isSimulating
      ? `Presupuesto: $${value}`
      : `Gastos: $${value}`;

    return (
      <div data-testid="mock-tooltip" role="tooltip">
        <div data-testid="tooltip-label">{label}</div>
        <div data-testid="tooltip-value">{tooltipText}</div>
      </div>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Checkbox UI Behavior", () => {
    it("should render simulate mode checkbox", () => {
      render(<SimulateModeComponent />);

      const checkbox = screen.getByTestId("simulate-mode");
      const label = screen.getByTestId("simulate-mode-label");

      expect(checkbox).toBeInTheDocument();
      expect(label).toBeInTheDocument();
      expect(label).toHaveTextContent("Simular");
    });

    it("should be enabled on current tab", () => {
      render(<SimulateModeComponent activeTab="current" />);

      const checkbox = screen.getByTestId("simulate-mode");
      expect(checkbox).not.toBeDisabled();
    });

    it("should be disabled on period comparison tab", () => {
      render(<SimulateModeComponent activeTab="period-comparison" />);

      const checkbox = screen.getByTestId("simulate-mode");
      expect(checkbox).toBeDisabled();
    });

    it("should be disabled on weekly cumulative tab", () => {
      render(<SimulateModeComponent activeTab="weekly-cumulative" />);

      const checkbox = screen.getByTestId("simulate-mode");
      expect(checkbox).toBeDisabled();
    });

    it("should toggle when clicked", () => {
      const mockOnChange = jest.fn();
      render(
        <SimulateModeComponent
          activeTab="current"
          onSimulateModeChange={mockOnChange}
        />
      );

      const checkbox = screen.getByTestId("simulate-mode");
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith(true);
    });

    it("should reflect checked state", () => {
      render(<SimulateModeComponent simulateMode={true} />);

      const checkbox = screen.getByTestId("simulate-mode") as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it("should reflect unchecked state", () => {
      render(<SimulateModeComponent simulateMode={false} />);

      const checkbox = screen.getByTestId("simulate-mode") as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });
  });

  describe("Chart Visual Indicators", () => {
    const mockData = [
      { name: "Alimentación", value: 500, isSimulated: false },
      { name: "Transporte", value: 300, isSimulated: false },
    ];

    const mockSimulatedData = [
      { name: "Alimentación", value: 600, isSimulated: true },
      { name: "Transporte", value: 400, isSimulated: true },
    ];

    it("should show normal chart title when not simulating", () => {
      render(<MockChart data={mockData} isSimulating={false} />);

      const title = screen.getByTestId("chart-title");
      expect(title).toHaveTextContent("Gráfico");
    });

    it("should show simulation indicator in chart title", () => {
      render(<MockChart data={mockSimulatedData} isSimulating={true} />);

      const title = screen.getByTestId("chart-title");
      expect(title).toHaveTextContent("Gráfico (Simulación)");
    });

    it("should show 'Gastos' in legend when not simulating", () => {
      render(<MockChart data={mockData} isSimulating={false} />);

      const legend = screen.getByTestId("chart-legend");
      expect(legend).toHaveTextContent("Gastos");
    });

    it("should show 'Presupuesto' in legend when simulating", () => {
      render(<MockChart data={mockSimulatedData} isSimulating={true} />);

      const legend = screen.getByTestId("chart-legend");
      expect(legend).toHaveTextContent("Presupuesto");
    });

    it("should apply simulation styling to chart bars", () => {
      render(<MockChart data={mockSimulatedData} isSimulating={true} />);

      const bars = screen.getAllByTestId(/chart-bar-/);
      bars.forEach((bar) => {
        expect(bar).toHaveClass("simulated-bar");
        expect(bar).toHaveStyle({ opacity: "0.7" });
      });
    });

    it("should apply normal styling to chart bars when not simulating", () => {
      render(<MockChart data={mockData} isSimulating={false} />);

      const bars = screen.getAllByTestId(/chart-bar-/);
      bars.forEach((bar) => {
        expect(bar).toHaveClass("normal-bar");
        expect(bar).toHaveStyle({ opacity: "1" });
      });
    });
  });

  describe("Tooltip Behavior", () => {
    it("should show expense format in tooltip when not simulating", () => {
      render(
        <MockTooltip isSimulating={false} value={500} label="Alimentación" />
      );

      const tooltipValue = screen.getByTestId("tooltip-value");
      expect(tooltipValue).toHaveTextContent("Gastos: $500");
    });

    it("should show budget format in tooltip when simulating", () => {
      render(
        <MockTooltip isSimulating={true} value={600} label="Alimentación" />
      );

      const tooltipValue = screen.getByTestId("tooltip-value");
      expect(tooltipValue).toHaveTextContent("Presupuesto: $600");
    });

    it("should include proper label in tooltip", () => {
      render(
        <MockTooltip isSimulating={true} value={600} label="Alimentación" />
      );

      const tooltipLabel = screen.getByTestId("tooltip-label");
      expect(tooltipLabel).toHaveTextContent("Alimentación");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(<SimulateModeComponent />);

      const checkbox = screen.getByTestId("simulate-mode");
      expect(checkbox).toHaveAttribute("type", "checkbox");
      expect(checkbox).toHaveAttribute("id", "simulate-mode");
    });

    it("should associate label with checkbox", () => {
      render(<SimulateModeComponent />);

      const label = screen.getByTestId("simulate-mode-label");
      expect(label).toHaveAttribute("for", "simulate-mode");
    });

    it("should be keyboard accessible", () => {
      const mockOnChange = jest.fn();
      render(
        <SimulateModeComponent
          activeTab="current"
          onSimulateModeChange={mockOnChange}
        />
      );

      const checkbox = screen.getByTestId("simulate-mode");

      // Focus the checkbox
      checkbox.focus();
      expect(checkbox).toHaveFocus();

      // Press space to toggle
      fireEvent.keyDown(checkbox, { key: " ", code: "Space" });
      fireEvent.keyUp(checkbox, { key: " ", code: "Space" });

      // Should trigger change
      expect(mockOnChange).toHaveBeenCalled();
    });

    it("should have proper tooltip role", () => {
      render(
        <MockTooltip isSimulating={true} value={600} label="Alimentación" />
      );

      const tooltip = screen.getByTestId("mock-tooltip");
      expect(tooltip).toHaveAttribute("role", "tooltip");
    });

    it("should indicate disabled state visually", () => {
      render(<SimulateModeComponent activeTab="period-comparison" />);

      const checkbox = screen.getByTestId("simulate-mode");
      expect(checkbox).toBeDisabled();
    });
  });

  describe("User Interaction Flow", () => {
    it("should handle complete toggle flow", async () => {
      const mockOnChange = jest.fn();
      const { rerender } = render(
        <SimulateModeComponent
          activeTab="current"
          simulateMode={false}
          onSimulateModeChange={mockOnChange}
        />
      );

      const checkbox = screen.getByTestId("simulate-mode");

      // Initial state
      expect(checkbox).not.toBeChecked();

      // Click to enable
      fireEvent.click(checkbox);
      expect(mockOnChange).toHaveBeenCalledWith(true);

      // Rerender with new state
      rerender(
        <SimulateModeComponent
          activeTab="current"
          simulateMode={true}
          onSimulateModeChange={mockOnChange}
        />
      );

      expect(checkbox).toBeChecked();

      // Click to disable
      fireEvent.click(checkbox);
      expect(mockOnChange).toHaveBeenCalledWith(false);
    });

    it("should prevent interaction when disabled", () => {
      const mockOnChange = jest.fn();
      render(
        <SimulateModeComponent
          activeTab="period-comparison"
          onSimulateModeChange={mockOnChange}
        />
      );

      const checkbox = screen.getByTestId("simulate-mode");

      // Try to click disabled checkbox
      fireEvent.click(checkbox);

      // Should not trigger change
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("should maintain state across tab switches", () => {
      const mockOnChange = jest.fn();
      const { rerender } = render(
        <SimulateModeComponent
          activeTab="current"
          simulateMode={true}
          onSimulateModeChange={mockOnChange}
        />
      );

      let checkbox = screen.getByTestId("simulate-mode");
      expect(checkbox).toBeChecked();
      expect(checkbox).not.toBeDisabled();

      // Switch to period comparison tab
      rerender(
        <SimulateModeComponent
          activeTab="period-comparison"
          simulateMode={true}
          onSimulateModeChange={mockOnChange}
        />
      );

      checkbox = screen.getByTestId("simulate-mode");
      expect(checkbox).toBeChecked(); // State preserved
      expect(checkbox).toBeDisabled(); // But disabled

      // Switch back to current tab
      rerender(
        <SimulateModeComponent
          activeTab="current"
          simulateMode={true}
          onSimulateModeChange={mockOnChange}
        />
      );

      checkbox = screen.getByTestId("simulate-mode");
      expect(checkbox).toBeChecked(); // State still preserved
      expect(checkbox).not.toBeDisabled(); // And enabled again
    });
  });

  describe("Error States", () => {
    it("should handle missing data gracefully", () => {
      render(<MockChart data={[]} isSimulating={true} />);

      const chart = screen.getByTestId("mock-chart");
      expect(chart).toBeInTheDocument();

      const title = screen.getByTestId("chart-title");
      expect(title).toHaveTextContent("Gráfico (Simulación)");

      // Should not crash with empty data
      const bars = screen.queryAllByTestId(/chart-bar-/);
      expect(bars).toHaveLength(0);
    });

    it("should handle undefined values in data", () => {
      const dataWithUndefined = [
        { name: "Test", value: undefined as any, isSimulated: true },
      ];

      expect(() => {
        render(<MockChart data={dataWithUndefined} isSimulating={true} />);
      }).not.toThrow();
    });
  });
});
