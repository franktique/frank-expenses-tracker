import { z } from 'zod';
import {
  PaymentMethodEnum,
  type PaymentMethod,
  VALID_PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from './estudios';

// Re-export PaymentMethod types and constants for backward compatibility
export {
  PaymentMethodEnum,
  type PaymentMethod,
  VALID_PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
};

// Fund interface and validation schema
export interface Fund {
  id: string;
  name: string;
  description?: string;
  initial_balance: number;
  current_balance: number;
  start_date: string;
  created_at: string;
  updated_at: string;
}

export const FundSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(1, 'El nombre del fondo es obligatorio')
    .max(255, 'El nombre del fondo es demasiado largo'),
  description: z
    .string()
    .max(500, 'La descripción es demasiado larga')
    .optional(),
  initial_balance: z
    .number()
    .min(0, 'El balance inicial no puede ser negativo')
    .default(0),
  current_balance: z.number(),
  start_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Fecha de inicio inválida'),
  created_at: z.string(),
  updated_at: z.string(),
});

// Fund creation schema (for API requests)
export const CreateFundSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre del fondo es obligatorio')
    .max(255, 'El nombre del fondo es demasiado largo'),
  description: z
    .string()
    .max(500, 'La descripción es demasiado larga')
    .optional(),
  initial_balance: z
    .number()
    .min(0, 'El balance inicial no puede ser negativo')
    .default(0),
  start_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Fecha de inicio inválida'),
});

// Fund update schema (for API requests)
export const UpdateFundSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre del fondo es obligatorio')
    .max(255, 'El nombre del fondo es demasiado largo')
    .optional(),
  description: z
    .string()
    .max(500, 'La descripción es demasiado larga')
    .optional(),
  initial_balance: z
    .number()
    .min(0, 'El balance inicial no puede ser negativo')
    .optional(),
  // Note: start_date is not included as it cannot be modified after creation
});

// Tipo Gasto (expense type) definitions
export const TIPO_GASTO_VALUES = {
  FIJO: 'F',
  VARIABLE: 'V',
  SEMI_FIJO: 'SF',
  EVENTUAL: 'E',
} as const;

export const TIPO_GASTO_LABELS = {
  F: 'Fijo',
  V: 'Variable',
  SF: 'Semi Fijo',
  E: 'Eventual',
} as const;

export type TipoGasto =
  (typeof TIPO_GASTO_VALUES)[keyof typeof TIPO_GASTO_VALUES];

// Tipo Gasto sort order definitions for custom 3-cycle sorting
export const TIPO_GASTO_SORT_ORDERS = {
  // State 1: Fijo → Semi-Fijo → Variable → Eventual
  STATE_1: {
    F: 1, // Fijo
    SF: 2, // Semi-Fijo
    V: 3, // Variable
    E: 4, // Eventual
  } as const,
  // State 2: Variable → Semi-Fijo → Fijo → Eventual
  STATE_2: {
    V: 1, // Variable
    SF: 2, // Semi-Fijo
    F: 3, // Fijo
    E: 4, // Eventual
  } as const,
} as const;

// Recurrence frequency types (must be defined before CategorySchema)
export const RECURRENCE_FREQUENCIES = {
  WEEKLY: 'weekly',
  BI_WEEKLY: 'bi-weekly',
} as const;

export type RecurrenceFrequency =
  | typeof RECURRENCE_FREQUENCIES.WEEKLY
  | typeof RECURRENCE_FREQUENCIES.BI_WEEKLY
  | null;

export const RECURRENCE_LABELS = {
  weekly: 'Semanal (cada 7 días)',
  'bi-weekly': 'Quincenal (cada 14 días)',
} as const;

export const RecurrenceFrequencyEnum = z
  .enum(['weekly', 'bi-weekly'])
  .nullable()
  .optional();

// Enhanced Category interface with fund support
export interface Category {
  id: string;
  name: string;
  fund_id?: string;
  fund_name?: string; // Populated in joins
  associated_funds?: Fund[]; // New field for multiple fund relationships
  tipo_gasto?: TipoGasto; // Expense type: F (Fijo), V (Variable), SF (Semi Fijo)
  default_day?: number | null; // Preferred day of month for category expenses (1-31). When recurrence_frequency is set, this becomes the first payment day
  recurrence_frequency?: RecurrenceFrequency; // Payment frequency for this category
}

// Category-Fund relationship interface
export interface CategoryFundRelationship {
  id: string;
  category_id: string;
  fund_id: string;
  created_at: string;
  updated_at: string;
}

export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(1, 'El nombre de la categoría es obligatorio')
    .max(255, 'El nombre de la categoría es demasiado largo'),
  fund_id: z.string().uuid().optional(),
  fund_name: z.string().optional(),
  tipo_gasto: z
    .enum(['F', 'V', 'SF', 'E'], {
      errorMap: () => ({
        message:
          'El tipo de gasto debe ser F (Fijo), V (Variable), SF (Semi Fijo) o E (Eventual)',
      }),
    })
    .optional(),
  recurrence_frequency: RecurrenceFrequencyEnum,
});

// Category creation schema
export const CreateCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre de la categoría es obligatorio')
    .max(255, 'El nombre de la categoría es demasiado largo'),
  fund_id: z.string().uuid().optional(),
  fund_ids: z.array(z.string().uuid()).optional(), // New field for multiple fund relationships
  tipo_gasto: z
    .enum(['F', 'V', 'SF', 'E'], {
      errorMap: () => ({
        message:
          'El tipo de gasto debe ser F (Fijo), V (Variable), SF (Semi Fijo) o E (Eventual)',
      }),
    })
    .optional(),
  default_day: z
    .number()
    .int('El día debe ser un número entero')
    .min(1, 'El día debe estar entre 1 y 31')
    .max(31, 'El día debe estar entre 1 y 31')
    .nullable()
    .optional(), // Preferred day of month (1-31)
  recurrence_frequency: RecurrenceFrequencyEnum,
});

// Category update schema
export const UpdateCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre de la categoría es obligatorio')
    .max(255, 'El nombre de la categoría es demasiado largo')
    .optional(),
  fund_id: z.string().uuid().optional(),
  fund_ids: z.array(z.string().uuid()).optional(), // New field for multiple fund relationships
  tipo_gasto: z
    .enum(['F', 'V', 'SF', 'E'], {
      errorMap: () => ({
        message:
          'El tipo de gasto debe ser F (Fijo), V (Variable), SF (Semi Fijo) o E (Eventual)',
      }),
    })
    .optional(),
  default_day: z
    .number()
    .int('El día debe ser un número entero')
    .min(1, 'El día debe estar entre 1 y 31')
    .max(31, 'El día debe estar entre 1 y 31')
    .nullable()
    .optional(), // Preferred day of month (1-31)
  recurrence_frequency: RecurrenceFrequencyEnum,
});

// Category-Fund relationship schemas
export const CategoryFundRelationshipSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid(),
  fund_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const UpdateCategoryFundsSchema = z.object({
  fund_ids: z.array(z.string().uuid()).min(0, 'Fund IDs array is required'),
});

// Enhanced Income interface with fund support
export interface Income {
  id: string;
  period_id: string;
  date: string;
  description: string;
  amount: number;
  event?: string;
  fund_id?: string;
  fund_name?: string; // Populated in joins
}

export const IncomeSchema = z.object({
  id: z.string().uuid(),
  period_id: z.string().uuid(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Fecha inválida'),
  description: z
    .string()
    .min(1, 'La descripción es obligatoria')
    .max(500, 'La descripción es demasiado larga'),
  amount: z.number().positive('El monto debe ser positivo'),
  event: z.string().max(255, 'El evento es demasiado largo').optional(),
  fund_id: z.string().uuid().optional(),
  fund_name: z.string().optional(),
});

// Income creation schema
export const CreateIncomeSchema = z.object({
  period_id: z.string().uuid(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Fecha inválida'),
  description: z
    .string()
    .min(1, 'La descripción es obligatoria')
    .max(500, 'La descripción es demasiado larga'),
  amount: z.number().positive('El monto debe ser positivo'),
  event: z.string().max(255, 'El evento es demasiado largo').optional(),
  fund_id: z.string().uuid().optional(),
});

// Income update schema
export const UpdateIncomeSchema = z.object({
  period_id: z.string().uuid().optional(),
  date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Fecha inválida')
    .optional(),
  description: z
    .string()
    .min(1, 'La descripción es obligatoria')
    .max(500, 'La descripción es demasiado larga')
    .optional(),
  amount: z.number().positive('El monto debe ser positivo').optional(),
  event: z.string().max(255, 'El evento es demasiado largo').optional(),
  fund_id: z.string().uuid().optional(),
});

// Enhanced Expense interface with fund and credit card support
export interface Expense {
  id: string;
  category_id: string;
  period_id: string;
  date: string;
  event?: string;
  payment_method: PaymentMethod;
  description: string;
  amount: number;
  source_fund_id?: string; // Optional source fund (fondos UI being removed)
  source_fund_name?: string; // Populated in joins
  destination_fund_id?: string;
  destination_fund_name?: string; // Populated in joins
  credit_card_id?: string; // Optional credit card association
  credit_card_info?: {
    bank_name: string;
    franchise: string;
    last_four_digits: string;
    is_active?: boolean; // Credit card active status
  }; // Populated in joins when credit card is associated
  pending?: boolean; // New field for pending status
}

export const ExpenseSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid(),
  period_id: z.string().uuid(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Fecha inválida'),
  event: z.string().max(255, 'El evento es demasiado largo').optional(),
  payment_method: PaymentMethodEnum,
  description: z
    .string()
    .min(1, 'La descripción es obligatoria')
    .max(500, 'La descripción es demasiado larga'),
  amount: z.number().positive('El monto debe ser positivo'),
  source_fund_id: z.string().uuid().optional(), // Optional source fund (fondos UI being removed)
  source_fund_name: z.string().optional(),
  destination_fund_id: z.string().uuid().optional(),
  destination_fund_name: z.string().optional(),
  credit_card_id: z.string().uuid().optional(), // Optional credit card field
  credit_card_info: z
    .object({
      bank_name: z.string(),
      franchise: z.string(),
      last_four_digits: z.string(),
    })
    .optional(), // Populated in joins when credit card is associated
  pending: z.boolean().optional(), // New field for pending status
});

// Expense creation schema
export const CreateExpenseSchema = z.object({
  category_id: z.string().uuid(),
  period_id: z.string().uuid(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Fecha inválida'),
  event: z.string().max(255, 'El evento es demasiado largo').optional(),
  payment_method: PaymentMethodEnum,
  description: z
    .string()
    .min(1, 'La descripción es obligatoria')
    .max(500, 'La descripción es demasiado larga'),
  amount: z.number().positive('El monto debe ser positivo'),
  source_fund_id: z.string().uuid().optional(), // Optional source fund (fondos UI being removed)
  destination_fund_id: z.string().uuid().optional(),
  credit_card_id: z.string().uuid().nullable().optional(), // Optional credit card field
  pending: z.boolean().optional(), // New field for pending status
});

// Expense update schema
export const UpdateExpenseSchema = z.object({
  category_id: z.string().uuid().optional(),
  date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Fecha inválida')
    .optional(),
  event: z.string().max(255, 'El evento es demasiado largo').optional(),
  payment_method: PaymentMethodEnum.optional(),
  description: z
    .string()
    .min(1, 'La descripción es obligatoria')
    .max(500, 'La descripción es demasiado larga')
    .optional(),
  amount: z.number().positive('El monto debe ser positivo').optional(),
  source_fund_id: z.string().uuid().optional(), // Optional source fund field for updates
  destination_fund_id: z.string().uuid().optional(),
  credit_card_id: z.string().uuid().nullable().optional(), // Optional credit card field for updates
  pending: z.boolean().optional(), // New field for pending status
});

// Existing interfaces that don't need fund support but are included for completeness
export interface Period {
  id: string;
  name: string;
  month: number;
  year: number;
  is_open: boolean;
  isOpen: boolean;
}

export const PeriodSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(1, 'El nombre del período es obligatorio')
    .max(255, 'El nombre del período es demasiado largo'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(3000),
  is_open: z.boolean(),
  isOpen: z.boolean(),
});

export interface Budget {
  id: string;
  category_id: string;
  period_id: string;
  expected_amount: number; // TOTAL monthly amount
  payment_method: PaymentMethod;
  default_date?: Date | string | null; // Calculated date based on category default_day
  // Note: recurrence settings come from the category, not stored on budget
}

// Virtual expanded budget for display (calculated on-the-fly)
export interface ExpandedBudgetPayment {
  budgetId: string;
  categoryId: string;
  periodId: string;
  date: string; // YYYY-MM-DD
  amount: number; // Split amount
  paymentMethod: PaymentMethod;
  isRecurring: boolean;
  occurrenceNumber?: number; // 1, 2, 3...
  totalOccurrences?: number; // Total payments
}

export const BudgetSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid(),
  period_id: z.string().uuid(),
  expected_amount: z.number().min(0, 'El monto esperado no puede ser negativo'),
  payment_method: PaymentMethodEnum,
  default_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Fecha inválida')
    .nullable()
    .optional(), // Calculated date based on category default_day
  // Note: recurrence settings validated at category level
});

// Fund balance calculation types
export interface FundBalance {
  fund_id: string;
  fund_name: string;
  initial_balance: number;
  income_total: number;
  expense_total: number;
  transfer_in_total: number;
  transfer_out_total: number;
  current_balance: number;
}

export const FundBalanceSchema = z.object({
  fund_id: z.string().uuid(),
  fund_name: z.string(),
  initial_balance: z.number(),
  income_total: z.number(),
  expense_total: z.number(),
  transfer_in_total: z.number(),
  transfer_out_total: z.number(),
  current_balance: z.number(),
});

// Fund transfer types
export interface FundTransfer {
  id: string;
  source_fund_id: string;
  source_fund_name: string;
  destination_fund_id: string;
  destination_fund_name: string;
  amount: number;
  date: string;
  description: string;
  expense_id: string; // Reference to the expense that created this transfer
}

export const FundTransferSchema = z.object({
  id: z.string().uuid(),
  source_fund_id: z.string().uuid(),
  source_fund_name: z.string(),
  destination_fund_id: z.string().uuid(),
  destination_fund_name: z.string(),
  amount: z.number().positive(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Fecha inválida'),
  description: z.string(),
  expense_id: z.string().uuid(),
});

// Fund analytics types
export interface FundAnalytics {
  fund_id: string;
  fund_name: string;
  balance_trend: Array<{
    date: string;
    balance: number;
  }>;
  allocation_percentage: number;
  recent_transactions: Array<{
    id: string;
    type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
    amount: number;
    date: string;
    description: string;
  }>;
  performance_metrics: {
    total_income: number;
    total_expenses: number;
    net_change: number;
    transaction_count: number;
  };
}

// API response types
export interface FundListResponse {
  funds: Fund[];
  total_count: number;
}

export interface FundDetailsResponse extends Fund {
  balance_history: Array<{
    date: string;
    balance: number;
  }>;
  recent_transactions: Array<{
    id: string;
    type: string;
    amount: number;
    date: string;
    description: string;
  }>;
}

// Error types
export interface FundError {
  code: string;
  message: string;
  details?: string;
}

// Fund operation result types
export interface FundOperationResult {
  success: boolean;
  fund?: Fund;
  error?: FundError;
}

export interface FundBalanceRecalculationResult {
  success: boolean;
  fund_id: string;
  old_balance: number;
  new_balance: number;
  calculation_details: {
    initial_balance: number;
    total_income: number;
    total_expenses: number;
    total_transfers_in: number;
    total_transfers_out: number;
  };
  error?: FundError;
}

// Default fund constants
// @deprecated Fund functionality is being removed. Use DEFAULT_FUND_ID for compatibility.
export const DEFAULT_FUND_NAME = 'Disponible';
export const DEFAULT_FUND_DESCRIPTION =
  'Fondo por defecto para categorías sin asignación específica';

// Default fund ID to use throughout the app (Phase 1: fondos removal)
// This ID is used when the app requires a fund_id but fondos UI is removed
export const DEFAULT_FUND_ID = 'Cta Ahorros';

// Fund validation error messages
export const FUND_ERROR_MESSAGES = {
  FUND_NOT_FOUND: 'El fondo especificado no existe',
  FUND_NAME_REQUIRED: 'El nombre del fondo es obligatorio',
  FUND_NAME_DUPLICATE: 'Ya existe un fondo con este nombre',
  FUND_DELETE_RESTRICTED:
    'No se puede eliminar un fondo con categorías o transacciones asociadas',
  FUND_BALANCE_CALCULATION_ERROR: 'Error al calcular el balance del fondo',
  CATEGORY_FUND_REQUIRED: 'Debe seleccionar un fondo para la categoría',
  EXPENSE_FUND_FILTER_REQUIRED:
    'Debe seleccionar un fondo para filtrar los gastos',
  TRANSFER_SAME_FUND_ERROR: 'No se puede transferir dinero al mismo fondo',
  FUND_START_DATE_FUTURE: 'La fecha de inicio no puede ser en el futuro',
  FUND_INITIAL_BALANCE_NEGATIVE: 'El balance inicial no puede ser negativo',
  FUND_NAME_TOO_LONG: 'El nombre del fondo es demasiado largo',
  FUND_DESCRIPTION_TOO_LONG: 'La descripción del fondo es demasiado larga',
} as const;

// Category-Fund relationship error messages
export const CATEGORY_FUND_ERROR_MESSAGES = {
  RELATIONSHIP_EXISTS: 'La relación entre esta categoría y fondo ya existe',
  EXPENSES_EXIST:
    'No se puede eliminar la relación porque existen {count} gastos registrados',
  INVALID_FUND_FOR_CATEGORY:
    'El fondo seleccionado no está asociado con esta categoría',
  MIGRATION_FAILED: 'Error durante la migración de relaciones categoría-fondo',
  CATEGORY_NOT_FOUND: 'La categoría especificada no existe',
  RELATIONSHIP_NOT_FOUND: 'La relación categoría-fondo no existe',
  CANNOT_DELETE_LAST_RELATIONSHIP:
    'No se puede eliminar la última relación de fondo para una categoría con gastos',
  SOME_FUNDS_NOT_EXIST: 'Algunos fondos especificados no existen',
} as const;

// Source fund validation error messages
export const SOURCE_FUND_ERROR_MESSAGES = {
  SOURCE_FUND_REQUIRED: 'Debe seleccionar un fondo origen para el gasto',
  SOURCE_FUND_INVALID_FOR_CATEGORY:
    'El fondo origen seleccionado no está asociado con esta categoría',
  SOURCE_FUND_NOT_FOUND: 'El fondo origen especificado no existe',
  MIGRATION_SOURCE_FUND_MISSING:
    'No se pudo determinar el fondo origen para el gasto',
} as const;

// Simulation Income types and schemas
export interface SimulationIncome {
  id: number;
  simulation_id: number;
  description: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export const SimulationIncomeSchema = z.object({
  id: z.number(),
  simulation_id: z.number(),
  description: z
    .string()
    .min(1, 'La descripción es obligatoria')
    .max(255, 'La descripción es demasiado larga'),
  amount: z.number().min(0, 'El monto no puede ser negativo'),
  created_at: z.string(),
  updated_at: z.string(),
});

// Simulation income creation schema (for API requests)
export const CreateSimulationIncomeSchema = z.object({
  description: z
    .string()
    .min(1, 'La descripción es obligatoria')
    .max(255, 'La descripción es demasiado larga'),
  amount: z.number().positive('El monto debe ser positivo'),
});

// Simulation income update schema (for API requests)
export const UpdateSimulationIncomeSchema = z.object({
  description: z
    .string()
    .min(1, 'La descripción es obligatoria')
    .max(255, 'La descripción es demasiado larga')
    .optional(),
  amount: z.number().positive('El monto debe ser positivo').optional(),
});

// Simulation income validation error messages
export const SIMULATION_INCOME_ERROR_MESSAGES = {
  INCOME_NOT_FOUND: 'El ingreso simulado no existe',
  DESCRIPTION_REQUIRED: 'La descripción es obligatoria',
  AMOUNT_REQUIRED: 'El monto es obligatorio',
  AMOUNT_MUST_BE_POSITIVE: 'El monto debe ser positivo',
  SIMULATION_NOT_FOUND: 'La simulación no existe',
  DELETE_FAILED: 'No se pudo eliminar el ingreso simulado',
} as const;

// Tipo Gasto (expense type) error messages
export const TIPO_GASTO_ERROR_MESSAGES = {
  INVALID_TYPE:
    'El tipo de gasto debe ser F (Fijo), V (Variable) o SF (Semi Fijo)',
  TYPE_REQUIRED: 'El tipo de gasto es obligatorio',
  TYPE_NOT_FOUND: 'El tipo de gasto especificado no existe',
} as const;

// All-Periods Overspend Data Types
export interface PeriodOverspendData {
  periodId: string;
  periodName: string;
  month: number;
  year: number;
  planeado: number;
  actual: number;
  overspend: number;
}

export interface CategoryOverspendRow {
  categoryId: string;
  categoryName: string;
  tipoGasto?: string;
  periods: PeriodOverspendData[];
  totalPlaneado: number;
  totalActual: number;
  totalOverspend: number;
}

export interface AllPeriodsOverspendResponse {
  overspendByCategory: CategoryOverspendRow[];
  summary: {
    totalPlaneado: number;
    totalActual: number;
    totalOverspend: number;
    overspendByPaymentMethod: {
      cash: number;
      debit: number;
      credit: number;
    };
  };
}

// Projected Budget Execution types
export interface BudgetExecutionData {
  date: string; // YYYY-MM-DD for daily view
  amount: number; // Total budget for this date
  weekNumber?: number; // Week number (1-53) for weekly view
  weekStart?: string; // Start date of week (YYYY-MM-DD)
  weekEnd?: string; // End date of week (YYYY-MM-DD)
  dayOfWeek?: number; // 0-6 (for display purposes)
}

export type BudgetExecutionViewMode = 'daily' | 'weekly';

// Budget detail for a specific date/week (used in detail view)
export interface BudgetDetail {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  date: string; // Specific date (YYYY-MM-DD)
  paymentMethod: string;
}

export interface BudgetExecutionResponse {
  periodId: string;
  periodName: string;
  viewMode: BudgetExecutionViewMode;
  data: BudgetExecutionData[];
  summary: {
    totalBudget: number;
    averagePerDay: number;
    peakDate: string;
    peakAmount: number;
  };
  budgetDetails: Record<string, BudgetDetail[]>; // Map of date/week to budget details
}
