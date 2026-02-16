import { z } from 'zod';

export interface RemainderCategoryItem {
  category_id: string;
  category_name: string;
  original_planned_budget: number;
  current_expenses: number;
  remainder_planned_budget: number; // calculated: original_planned_budget - current_expenses
  fund_id?: string;
  fund_name?: string;
  // Optional agrupador information for filtering
  agrupador_id?: number;
  agrupador_name?: string;
  estudio_id?: number;
  estudio_name?: string;
}

export interface RemainderDashboardTotals {
  totalCurrentExpenses: number;
  totalOriginalBudget: number;
  totalRemainderBudget: number;
  categoriesCount: number;
}

export interface RemainderDashboardData {
  activePeriod: {
    id: string;
    name: string;
  } | null;
  categories: RemainderCategoryItem[];
  totals: RemainderDashboardTotals;
  appliedFilters: {
    fundId?: string;
    fundName?: string;
    estudioId?: number;
    estudioName?: string;
    agrupadorIds?: number[];
    agrupadorNames?: string[];
  };
}

// Validation schemas
export const RemainderCategoryItemSchema = z.object({
  category_id: z.string().uuid(),
  category_name: z.string(),
  original_planned_budget: z.number().min(0),
  current_expenses: z.number().min(0),
  remainder_planned_budget: z.number(),
  fund_id: z.string().uuid().optional(),
  fund_name: z.string().optional(),
  agrupador_id: z.number().optional(),
  agrupador_name: z.string().optional(),
  estudio_id: z.number().optional(),
  estudio_name: z.string().optional(),
});

export const RemainderDashboardTotalsSchema = z.object({
  totalCurrentExpenses: z.number().min(0),
  totalOriginalBudget: z.number().min(0),
  totalRemainderBudget: z.number(),
  categoriesCount: z.number().min(0),
});

export const RemainderDashboardDataSchema = z.object({
  activePeriod: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
    })
    .nullable(),
  categories: z.array(RemainderCategoryItemSchema),
  totals: RemainderDashboardTotalsSchema,
  appliedFilters: z.object({
    fundId: z.string().uuid().optional(),
    fundName: z.string().optional(),
    estudioId: z.number().optional(),
    estudioName: z.string().optional(),
    agrupadorIds: z.array(z.number()).optional(),
    agrupadorNames: z.array(z.string()).optional(),
  }),
});

// Filter parameters interface for API requests
export interface RemainderDashboardFilters {
  fundId?: string;
  estudioId?: number;
  agrupadorIds?: number[];
}

export const RemainderDashboardFiltersSchema = z.object({
  fundId: z.string().uuid().optional(),
  estudioId: z.number().optional(),
  agrupadorIds: z.array(z.number()).optional(),
});

// Utility functions
export function calculateRemainderBudget(
  originalBudget: number,
  currentExpenses: number
): number {
  return originalBudget - currentExpenses;
}

export function calculateBudgetUsagePercentage(
  originalBudget: number,
  currentExpenses: number
): number {
  if (originalBudget === 0) return 0;
  return Math.min((currentExpenses / originalBudget) * 100, 100);
}

export function hasRemainingBudget(item: RemainderCategoryItem): boolean {
  return item.remainder_planned_budget > 0;
}

// Sort functions for category list
export function sortCategoriesByRemainderDesc(
  a: RemainderCategoryItem,
  b: RemainderCategoryItem
): number {
  return b.remainder_planned_budget - a.remainder_planned_budget;
}

export function sortCategoriesByName(
  a: RemainderCategoryItem,
  b: RemainderCategoryItem
): number {
  return a.category_name.localeCompare(b.category_name);
}

export function sortCategoriesByExpenses(
  a: RemainderCategoryItem,
  b: RemainderCategoryItem
): number {
  return b.current_expenses - a.current_expenses;
}

// Export functionality types
export interface RemainderDashboardExportData {
  categories: RemainderCategoryItem[];
  totals: RemainderDashboardTotals;
  periodName: string;
  exportDate: string;
  appliedFilters: RemainderDashboardData['appliedFilters'];
}
