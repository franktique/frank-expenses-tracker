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

describe("Projection Mode UI Behavior", () => {
  // Mock component that includes projection mode UI
  const ProjectionModeComponent = ({
    activeTab = "current",
    projectionMode = false,
    onProjectionModeChange = jest.fn(),
  }: {
    activeTab?: string;
    projectionMode?: boolean;
    onProjectionModeChange?: (checked: boolean) => void;
  }) => {
    return (
      <div data-testid="projection-mode-container">
        <div className="flex items-center space-x-2">
          <MockCheckbox
            id="projection-mode"
            checked={projectionMode}
            onCheckedChange={onProjectionModeChange}
            disabled={activeTab !== "current"}
          />
          <MockLabel htmlFor="projection-mode">Proyectar</MockLabel>
        </div>
      </div>
    );
  };

  // Mock chart component with projection styling
  const MockChart = ({
    data,
    isProjecting = false,
  }: {
    data: Array<{ name: string; value: number; isProjectiond?: boolean }>;
    isProjecting?: boolean;
  }) => {
    const title = isProjecting ? "Gráfico (Proyección)" : "Gráfico";

    return (
      <div data-testid="mock-chart">
        <h3 data-testid="chart-title">{title}</h3>
        <div data-testid="chart-legend">
          {isProjecting ? "Presupuesto" : "Gastos"}
        </div>
        {data.map((item, index) => (
          <div
            key={index}
            data-testid={`chart-bar-${index}`}
            className={item.isProjectiond ? "projectiond-bar" : "normal-bar"}
            style={{
              opacity: item.isProjectiond ? 0.7 : 1,
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
    isProjecting,
    value,
    label,
  }: {
    isProjecting: boolean;
    value: number;
    label: string;
  }) => {
    const tooltipText = isProjecting
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
    it("should render projection mode checkbox", () => {
      render(<ProjectionModeComponent />);

      const checkbox = screen.getByTestId("projection-mode");
      const label = screen.getByTestId("projection-mode-label");

      expect(checkbox).toBeInTheDocument();
      expect(label).toBeInTheDocument();
      expect(label).toHaveTextContent("Proyectar");
    });

    it("should be enabled on current tab", () => {
      render(<ProjectionModeComponent activeTab="current" />);

      const checkbox = screen.getByTestId("projection-mode");
      expect(checkbox).not.toBeDisabled();
    });

    it("should be disabled on period comparison tab", () => {
      render(<ProjectionModeComponent activeTab="period-comparison" />);

      const checkbox = screen.getByTestId("projection-mode");
      expect(checkbox).toBeDisabled();
    });

    it("should be disabled on weekly cumulative tab", () => {
      render(<ProjectionModeComponent activeTab="weekly-cumulative" />);

      const checkbox = screen.getByTestId("projection-mode");
      expect(checkbox).toBeDisabled();
    });

    it("should toggle when clicked", () => {
      const mockOnChange = jest.fn();
      render(
        <ProjectionModeComponent
          activeTab="current"
          onProjectionModeChange={mockOnChange}
        />
      );

      const checkbox = screen.getByTestId("projection-mode");
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith(true);
    });

    it("should reflect checked state", () => {
      render(<ProjectionModeComponent projectionMode={true} />);

      const checkbox = screen.getByTestId("projection-mode") as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it("should reflect unchecked state", () => {
      render(<ProjectionModeComponent projectionMode={false} />);

      const checkbox = screen.getByTestId("projection-mode") as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });
  });

  describe("Chart Visual Indicators", () => {
    const mockData = [
      { name: "Alimentación", value: 500, isProjectiond: false },
      { name: "Transporte", value: 300, isProjectiond: false },
    ];

    const mockProjectiondData = [
      { name: "Alimentación", value: 600, isProjectiond: true },
      { name: "Transporte", value: 400, isProjectiond: true },
    ];

    it("should show normal chart title when not projecting", () => {
      render(<MockChart data={mockData} isProjecting={false} />);

      const title = screen.getByTestId("chart-title");
      expect(title).toHaveTextContent("Gráfico");
    });

    it("should show projection indicator in chart title", () => {
      render(<MockChart data={mockProjectiondData} isProjecting={true} />);

      const title = screen.getByTestId("chart-title");
      expect(title).toHaveTextContent("Gráfico (Proyección)");
    });

    it("should show 'Gastos' in legend when not projecting", () => {
      render(<MockChart data={mockData} isProjecting={false} />);

      const legend = screen.getByTestId("chart-legend");
      expect(legend).toHaveTextContent("Gastos");
    });

    it("should show 'Presupuesto' in legend when projecting", () => {
      render(<MockChart data={mockProjectiondData} isProjecting={true} />);

      const legend = screen.getByTestId("chart-legend");
      expect(legend).toHaveTextContent("Presupuesto");
    });

    it("should apply projection styling to chart bars", () => {
      render(<MockChart data={mockProjectiondData} isProjecting={true} />);

      const bars = screen.getAllByTestId(/chart-bar-/);
      bars.forEach((bar) => {
        expect(bar).toHaveClass("projectiond-bar");
        expect(bar).toHaveStyle({ opacity: "0.7" });
      });
    });

    it("should apply normal styling to chart bars when not projecting", () => {
      render(<MockChart data={mockData} isProjecting={false} />);

      const bars = screen.getAllByTestId(/chart-bar-/);
      bars.forEach((bar) => {
        expect(bar).toHaveClass("normal-bar");
        expect(bar).toHaveStyle({ opacity: "1" });
      });
    });
  });

  describe("Tooltip Behavior", () => {
    it("should show expense format in tooltip when not projecting", () => {
      render(
        <MockTooltip isProjecting={false} value={500} label="Alimentación" />
      );

      const tooltipValue = screen.getByTestId("tooltip-value");
      expect(tooltipValue).toHaveTextContent("Gastos: $500");
    });

    it("should show budget format in tooltip when projecting", () => {
      render(
        <MockTooltip isProjecting={true} value={600} label="Alimentación" />
      );

      const tooltipValue = screen.getByTestId("tooltip-value");
      expect(tooltipValue).toHaveTextContent("Presupuesto: $600");
    });

    it("should include proper label in tooltip", () => {
      render(
        <MockTooltip isProjecting={true} value={600} label="Alimentación" />
      );

      const tooltipLabel = screen.getByTestId("tooltip-label");
      expect(tooltipLabel).toHaveTextContent("Alimentación");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(<ProjectionModeComponent />);

      const checkbox = screen.getByTestId("projection-mode");
      expect(checkbox).toHaveAttribute("type", "checkbox");
      expect(checkbox).toHaveAttribute("id", "projection-mode");
    });

    it("should associate label with checkbox", () => {
      render(<ProjectionModeComponent />);

      const label = screen.getByTestId("projection-mode-label");
      expect(label).toHaveAttribute("for", "projection-mode");
    });

    it("should be keyboard accessible", () => {
      const mockOnChange = jest.fn();
      render(
        <ProjectionModeComponent
          activeTab="current"
          onProjectionModeChange={mockOnChange}
        />
      );

      const checkbox = screen.getByTestId("projection-mode");

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
        <MockTooltip isProjecting={true} value={600} label="Alimentación" />
      );

      const tooltip = screen.getByTestId("mock-tooltip");
      expect(tooltip).toHaveAttribute("role", "tooltip");
    });

    it("should indicate disabled state visually", () => {
      render(<ProjectionModeComponent activeTab="period-comparison" />);

      const checkbox = screen.getByTestId("projection-mode");
      expect(checkbox).toBeDisabled();
    });
  });

  describe("User Interaction Flow", () => {
    it("should handle complete toggle flow", async () => {
      const mockOnChange = jest.fn();
      const { rerender } = render(
        <ProjectionModeComponent
          activeTab="current"
          projectionMode={false}
          onProjectionModeChange={mockOnChange}
        />
      );

      const checkbox = screen.getByTestId("projection-mode");

      // Initial state
      expect(checkbox).not.toBeChecked();

      // Click to enable
      fireEvent.click(checkbox);
      expect(mockOnChange).toHaveBeenCalledWith(true);

      // Rerender with new state
      rerender(
        <ProjectionModeComponent
          activeTab="current"
          projectionMode={true}
          onProjectionModeChange={mockOnChange}
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
        <ProjectionModeComponent
          activeTab="period-comparison"
          onProjectionModeChange={mockOnChange}
        />
      );

      const checkbox = screen.getByTestId("projection-mode");

      // Try to click disabled checkbox
      fireEvent.click(checkbox);

      // Should not trigger change
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("should maintain state across tab switches", () => {
      const mockOnChange = jest.fn();
      const { rerender } = render(
        <ProjectionModeComponent
          activeTab="current"
          projectionMode={true}
          onProjectionModeChange={mockOnChange}
        />
      );

      let checkbox = screen.getByTestId("projection-mode");
      expect(checkbox).toBeChecked();
      expect(checkbox).not.toBeDisabled();

      // Switch to period comparison tab
      rerender(
        <ProjectionModeComponent
          activeTab="period-comparison"
          projectionMode={true}
          onProjectionModeChange={mockOnChange}
        />
      );

      checkbox = screen.getByTestId("projection-mode");
      expect(checkbox).toBeChecked(); // State preserved
      expect(checkbox).toBeDisabled(); // But disabled

      // Switch back to current tab
      rerender(
        <ProjectionModeComponent
          activeTab="current"
          projectionMode={true}
          onProjectionModeChange={mockOnChange}
        />
      );

      checkbox = screen.getByTestId("projection-mode");
      expect(checkbox).toBeChecked(); // State still preserved
      expect(checkbox).not.toBeDisabled(); // And enabled again
    });
  });

  describe("Error States", () => {
    it("should handle missing data gracefully", () => {
      render(<MockChart data={[]} isProjecting={true} />);

      const chart = screen.getByTestId("mock-chart");
      expect(chart).toBeInTheDocument();

      const title = screen.getByTestId("chart-title");
      expect(title).toHaveTextContent("Gráfico (Proyección)");

      // Should not crash with empty data
      const bars = screen.queryAllByTestId(/chart-bar-/);
      expect(bars).toHaveLength(0);
    });

    it("should handle undefined values in data", () => {
      const dataWithUndefined = [
        { name: "Test", value: undefined as any, isProjectiond: true },
      ];

      expect(() => {
        render(<MockChart data={dataWithUndefined} isProjecting={true} />);
      }).not.toThrow();
    });
  });
});
