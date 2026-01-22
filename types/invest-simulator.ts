/**
 * Investment Simulator Type Definitions
 * Defines types for investment scenarios, projections, and rate comparisons
 */

import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

/**
 * Supported currencies for investment simulations
 */
export const SUPPORTED_CURRENCIES = {
  USD: { code: "USD", symbol: "$", locale: "en-US", name: "US Dollar" },
  COP: { code: "COP", symbol: "$", locale: "es-CO", name: "Colombian Peso" },
  EUR: { code: "EUR", symbol: "€", locale: "de-DE", name: "Euro" },
  MXN: { code: "MXN", symbol: "$", locale: "es-MX", name: "Mexican Peso" },
  ARS: { code: "ARS", symbol: "$", locale: "es-AR", name: "Argentine Peso" },
  GBP: { code: "GBP", symbol: "£", locale: "en-GB", name: "British Pound" },
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

/**
 * Compounding frequency options
 */
export const COMPOUNDING_FREQUENCIES = {
  daily: { code: "daily", label: "Diario", periodsPerYear: 365 },
  monthly: { code: "monthly", label: "Mensual", periodsPerYear: 12 },
} as const;

export type CompoundingFrequency = keyof typeof COMPOUNDING_FREQUENCIES;

/**
 * InvestmentScenario - Represents an investment configuration for simulation
 */
export type InvestmentScenario = {
  id: string;
  name: string;
  initialAmount: number; // Monto inicial
  monthlyContribution: number; // Aporte mensual
  termMonths: number; // Plazo en meses
  annualRate: number; // Tasa EA (Efectivo Anual) como porcentaje (ej: 8.25 para 8.25%)
  compoundingFrequency: CompoundingFrequency; // Frecuencia de capitalización
  currency: CurrencyCode;
  notes?: string; // Comentarios o notas sobre la simulación
  createdAt: string;
  updatedAt: string;
};

/**
 * InvestmentPeriodDetail - Detail for each period (day or month)
 */
export type InvestmentPeriodDetail = {
  periodNumber: number; // Número de periodo (día o mes)
  date: string; // Fecha del periodo
  openingBalance: number; // Saldo inicial del periodo
  contribution: number; // Aporte del periodo
  interestEarned: number; // Intereses generados en el periodo
  closingBalance: number; // Saldo final del periodo
  cumulativeContributions: number; // Aportes acumulados
  cumulativeInterest: number; // Intereses acumulados
};

/**
 * InvestmentSummary - Summary statistics for an investment scenario
 */
export type InvestmentSummary = {
  finalBalance: number; // Monto final proyectado
  totalContributions: number; // Total depositado (inicial + aportes)
  totalInterestEarned: number; // Total de rendimientos/intereses
  initialAmount: number; // Monto inicial
  totalMonthlyContributions: number; // Total de aportes mensuales
  annualRate: number; // Tasa EA utilizada
  effectiveMonthlyRate: number; // Tasa mensual efectiva
  effectiveDailyRate: number; // Tasa diaria efectiva (si aplica)
  termMonths: number; // Plazo en meses
  compoundingFrequency: CompoundingFrequency;
};

/**
 * RateComparison - Comparison data for different interest rates
 */
export type RateComparison = {
  id: string;
  investmentScenarioId: string;
  rate: number; // Tasa EA como porcentaje
  label?: string; // Etiqueta opcional (ej: "Banco X", "CDT")
  createdAt: string;
};

/**
 * RateComparisonResult - Calculated result for a rate comparison
 */
export type RateComparisonResult = {
  rate: number;
  label?: string;
  finalBalance: number;
  totalInterestEarned: number;
  differenceFromBase: number; // Diferencia vs tasa base del escenario
  isBaseRate: boolean; // Es la tasa base del escenario
};

/**
 * InvestmentProjectionResponse - API response for investment projection
 */
export type InvestmentProjectionResponse = {
  investmentScenarioId: string;
  summary: InvestmentSummary;
  schedule: InvestmentPeriodDetail[];
  rateComparisons?: RateComparisonResult[];
};

/**
 * InvestmentScenarioListResponse - API response for list of investment scenarios
 */
export type InvestmentScenarioListResponse = {
  scenarios: (InvestmentScenario & { projectedFinalBalance?: number })[];
  totalCount: number;
};

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * InvestmentScenarioSchema - Full validation for investment scenario data
 */
export const InvestmentScenarioSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(1, "El nombre de la inversión es obligatorio")
    .max(255, "El nombre de la inversión es demasiado largo"),
  initialAmount: z
    .number()
    .min(0, "El monto inicial no puede ser negativo")
    .max(999999999999, "El monto inicial es demasiado grande"),
  monthlyContribution: z
    .number()
    .min(0, "El aporte mensual no puede ser negativo")
    .max(999999999999, "El aporte mensual es demasiado grande"),
  termMonths: z
    .number()
    .int("El plazo debe ser un número entero")
    .positive("El plazo debe ser positivo")
    .max(600, "El plazo no puede exceder 600 meses (50 años)"),
  annualRate: z
    .number()
    .min(0, "La tasa de interés no puede ser negativa")
    .max(100, "La tasa de interés no puede exceder 100%"),
  compoundingFrequency: z.enum(["daily", "monthly"]),
  currency: z.enum(["USD", "COP", "EUR", "MXN", "ARS", "GBP"]),
  notes: z.string().max(2000, "Los comentarios son demasiado largos").optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * CreateInvestmentScenarioSchema - Validation for creating a new investment scenario
 */
export const CreateInvestmentScenarioSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre de la inversión es obligatorio")
    .max(255, "El nombre de la inversión es demasiado largo"),
  initialAmount: z
    .number()
    .min(0, "El monto inicial no puede ser negativo")
    .max(999999999999, "El monto inicial es demasiado grande"),
  monthlyContribution: z
    .number()
    .min(0, "El aporte mensual no puede ser negativo")
    .max(999999999999, "El aporte mensual es demasiado grande")
    .default(0),
  termMonths: z
    .number()
    .int("El plazo debe ser un número entero")
    .positive("El plazo debe ser positivo")
    .max(600, "El plazo no puede exceder 600 meses (50 años)"),
  annualRate: z
    .number()
    .min(0, "La tasa de interés no puede ser negativa")
    .max(100, "La tasa de interés no puede exceder 100%"),
  compoundingFrequency: z.enum(["daily", "monthly"]).default("monthly"),
  currency: z.enum(["USD", "COP", "EUR", "MXN", "ARS", "GBP"]).default("COP"),
  notes: z.string().max(2000, "Los comentarios son demasiado largos").optional(),
});

/**
 * UpdateInvestmentScenarioSchema - Validation for updating an investment scenario
 */
export const UpdateInvestmentScenarioSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre de la inversión es obligatorio")
    .max(255, "El nombre de la inversión es demasiado largo")
    .optional(),
  initialAmount: z
    .number()
    .min(0, "El monto inicial no puede ser negativo")
    .max(999999999999, "El monto inicial es demasiado grande")
    .optional(),
  monthlyContribution: z
    .number()
    .min(0, "El aporte mensual no puede ser negativo")
    .max(999999999999, "El aporte mensual es demasiado grande")
    .optional(),
  termMonths: z
    .number()
    .int("El plazo debe ser un número entero")
    .positive("El plazo debe ser positivo")
    .max(600, "El plazo no puede exceder 600 meses (50 años)")
    .optional(),
  annualRate: z
    .number()
    .min(0, "La tasa de interés no puede ser negativa")
    .max(100, "La tasa de interés no puede exceder 100%")
    .optional(),
  compoundingFrequency: z.enum(["daily", "monthly"]).optional(),
  currency: z.enum(["USD", "COP", "EUR", "MXN", "ARS", "GBP"]).optional(),
  notes: z.string().max(2000, "Los comentarios son demasiado largos").optional().nullable(),
});

/**
 * RateComparisonSchema - Full validation for rate comparison data
 */
export const RateComparisonSchema = z.object({
  id: z.string().uuid(),
  investmentScenarioId: z.string().uuid(),
  rate: z
    .number()
    .min(0, "La tasa no puede ser negativa")
    .max(100, "La tasa no puede exceder 100%"),
  label: z.string().max(100, "La etiqueta es demasiado larga").optional(),
  createdAt: z.string(),
});

/**
 * CreateRateComparisonSchema - Validation for creating a new rate comparison
 */
export const CreateRateComparisonSchema = z.object({
  rate: z
    .number()
    .min(0, "La tasa no puede ser negativa")
    .max(100, "La tasa no puede exceder 100%"),
  label: z.string().max(100, "La etiqueta es demasiado larga").optional(),
});

/**
 * UpdateRateComparisonSchema - Validation for updating a rate comparison
 */
export const UpdateRateComparisonSchema = z.object({
  rate: z
    .number()
    .min(0, "La tasa no puede ser negativa")
    .max(100, "La tasa no puede exceder 100%")
    .optional(),
  label: z.string().max(100, "La etiqueta es demasiado larga").optional(),
});

// ============================================================================
// Error Messages
// ============================================================================

/**
 * INVEST_ERROR_MESSAGES - Error messages for investment simulator operations
 */
export const INVEST_ERROR_MESSAGES = {
  SCENARIO_NOT_FOUND: "El escenario de inversión no existe",
  SCENARIO_NAME_REQUIRED: "El nombre de la inversión es obligatorio",
  INITIAL_AMOUNT_REQUIRED: "El monto inicial es obligatorio",
  INITIAL_AMOUNT_INVALID: "El monto inicial no es válido",
  MONTHLY_CONTRIBUTION_INVALID: "El aporte mensual no es válido",
  ANNUAL_RATE_REQUIRED: "La tasa de interés es obligatoria",
  ANNUAL_RATE_INVALID: "La tasa de interés no es válida",
  TERM_REQUIRED: "El plazo es obligatorio",
  TERM_MUST_BE_POSITIVE: "El plazo debe ser positivo",
  COMPOUNDING_FREQUENCY_INVALID: "La frecuencia de capitalización no es válida",
  RATE_COMPARISON_NOT_FOUND: "La comparación de tasa no existe",
  DUPLICATE_NAME: "Ya existe una inversión con este nombre",
  DUPLICATE_RATE: "Ya existe una comparación con esta tasa",
  TABLES_NOT_FOUND: "Las tablas de inversión no existen. Ejecute la migración.",
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format currency amount based on currency code
 */
export function formatCurrency(amount: number, currencyCode: CurrencyCode): string {
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage with specified decimal places
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get compounding frequency label
 */
export function getCompoundingLabel(frequency: CompoundingFrequency): string {
  return COMPOUNDING_FREQUENCIES[frequency].label;
}
