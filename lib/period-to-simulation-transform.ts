/**
 * Utilities for transforming period data to simulation format
 */

// Type definitions for period data
export interface PeriodIncome {
  description: string;
  total_amount: number;
  count: number;
}

export interface PeriodBudget {
  category_id: string;
  category_name: string;
  efectivo_amount: number;
  credito_amount: number;
}

export interface PeriodData {
  period: {
    id: string;
    name: string;
    month: number;
    year: number;
  };
  incomes: PeriodIncome[];
  budgets: PeriodBudget[];
  totals: {
    total_income: number;
    total_budget_efectivo: number;
    total_budget_credito: number;
    total_budget: number;
  };
}

// Type definitions for simulation data
export interface SimulationIncome {
  description: string;
  amount: number;
}

export interface SimulationBudget {
  category_id: string | number;
  efectivo_amount: number;
  credito_amount: number;
}

/**
 * Transforms period incomes to simulation income format
 * Period incomes are already aggregated by description
 *
 * @param periodIncomes - Array of period incomes
 * @returns Array of simulation incomes
 */
export function transformIncomesToSimulation(
  periodIncomes: PeriodIncome[]
): SimulationIncome[] {
  return periodIncomes.map((income) => ({
    description: income.description,
    amount: Number(income.total_amount),
  }));
}

/**
 * Transforms period budgets to simulation budget format
 * Period budgets are already grouped by category with efectivo/credito split
 *
 * @param periodBudgets - Array of period budgets
 * @returns Array of simulation budgets
 */
export function transformBudgetsToSimulation(
  periodBudgets: PeriodBudget[]
): SimulationBudget[] {
  return periodBudgets.map((budget) => ({
    category_id: budget.category_id,
    efectivo_amount: Number(budget.efectivo_amount) || 0,
    credito_amount: Number(budget.credito_amount) || 0,
  }));
}

/**
 * Validates that a period has data to copy
 *
 * @param periodData - Period data object
 * @returns Object with validation result and message
 */
export function validatePeriodHasData(periodData: PeriodData): {
  valid: boolean;
  message?: string;
} {
  const hasIncomes = periodData.incomes && periodData.incomes.length > 0;
  const hasBudgets = periodData.budgets && periodData.budgets.length > 0;

  if (!hasIncomes && !hasBudgets) {
    return {
      valid: false,
      message: "El período no contiene datos para copiar",
    };
  }

  if (!hasIncomes) {
    return {
      valid: true,
      message: "Advertencia: El período no contiene ingresos",
    };
  }

  if (!hasBudgets) {
    return {
      valid: true,
      message: "Advertencia: El período no contiene presupuestos",
    };
  }

  return {
    valid: true,
  };
}

/**
 * Generates a summary of what will be copied
 *
 * @param periodData - Period data object
 * @returns Summary object
 */
export function generateCopySummary(periodData: PeriodData): {
  period_name: string;
  period_date: string;
  income_entries: number;
  budget_categories: number;
  total_income: number;
  total_budget: number;
} {
  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  return {
    period_name: periodData.period.name,
    period_date: `${monthNames[periodData.period.month]} ${periodData.period.year}`,
    income_entries: periodData.incomes.length,
    budget_categories: periodData.budgets.length,
    total_income: periodData.totals.total_income,
    total_budget: periodData.totals.total_budget,
  };
}

/**
 * Calculates the difference between two amounts for comparison
 *
 * @param current - Current amount
 * @param new_amount - New amount
 * @returns Difference and percentage change
 */
export function calculateDifference(
  current: number,
  new_amount: number
): {
  difference: number;
  percentage: number;
  direction: "increase" | "decrease" | "none";
} {
  const difference = new_amount - current;
  const percentage = current === 0 ? 0 : (difference / current) * 100;

  let direction: "increase" | "decrease" | "none" = "none";
  if (difference > 0) direction = "increase";
  else if (difference < 0) direction = "decrease";

  return {
    difference,
    percentage,
    direction,
  };
}

/**
 * Formats currency for display
 *
 * @param amount - Amount to format
 * @returns Formatted string
 */
export function formatCurrencyDisplay(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generates a user-friendly message about the copy operation
 *
 * @param summary - Copy summary object
 * @param mode - Copy mode (merge or replace)
 * @returns Formatted message
 */
export function generateCopyMessage(
  summary: ReturnType<typeof generateCopySummary>,
  mode: "merge" | "replace"
): string {
  const action = mode === "replace" ? "reemplazarán" : "agregarán a";
  const incomeText =
    summary.income_entries === 1
      ? "1 entrada de ingreso"
      : `${summary.income_entries} entradas de ingresos`;
  const budgetText =
    summary.budget_categories === 1
      ? "1 categoría presupuestada"
      : `${summary.budget_categories} categorías presupuestadas`;

  let message = `Se ${action} los datos existentes:\n\n`;
  message += `• ${incomeText} (Total: ${formatCurrencyDisplay(summary.total_income)})\n`;
  message += `• ${budgetText} (Total: ${formatCurrencyDisplay(summary.total_budget)})\n\n`;
  message += `Período origen: ${summary.period_name} (${summary.period_date})`;

  return message;
}

/**
 * Validates category IDs exist in the simulation's category list
 *
 * @param budgets - Array of period budgets
 * @param validCategoryIds - Set of valid category IDs
 * @returns Object with validation result and invalid category IDs
 */
export function validateCategoryIds(
  budgets: PeriodBudget[],
  validCategoryIds: Set<string>
): {
  valid: boolean;
  invalidCategoryIds: string[];
  validBudgets: PeriodBudget[];
} {
  const invalidCategoryIds: string[] = [];
  const validBudgets: PeriodBudget[] = [];

  budgets.forEach((budget) => {
    if (validCategoryIds.has(budget.category_id)) {
      validBudgets.push(budget);
    } else {
      invalidCategoryIds.push(budget.category_id);
    }
  });

  return {
    valid: invalidCategoryIds.length === 0,
    invalidCategoryIds,
    validBudgets,
  };
}

/**
 * Estimates the impact of copying period data on existing simulation data
 *
 * @param existingTotals - Current simulation totals
 * @param periodTotals - Period data totals
 * @param mode - Copy mode
 * @returns Impact analysis
 */
export function estimateImpact(
  existingTotals: {
    total_income: number;
    total_budget: number;
  },
  periodTotals: {
    total_income: number;
    total_budget: number;
  },
  mode: "merge" | "replace"
): {
  income_impact: ReturnType<typeof calculateDifference>;
  budget_impact: ReturnType<typeof calculateDifference>;
  will_replace: boolean;
} {
  const will_replace = mode === "replace";

  const newIncomeTotal = will_replace
    ? periodTotals.total_income
    : existingTotals.total_income + periodTotals.total_income;

  const newBudgetTotal = will_replace
    ? periodTotals.total_budget
    : existingTotals.total_budget + periodTotals.total_budget;

  return {
    income_impact: calculateDifference(
      existingTotals.total_income,
      newIncomeTotal
    ),
    budget_impact: calculateDifference(
      existingTotals.total_budget,
      newBudgetTotal
    ),
    will_replace,
  };
}
