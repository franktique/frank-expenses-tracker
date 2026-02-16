import { z } from 'zod';

// ============================================================================
// Rate Type Constants
// ============================================================================

/**
 * Supported interest rate types for conversion
 * EA - Efectiva Anual (Annual Effective Rate)
 * EM - Efectiva Mensual (Monthly Effective Rate)
 * ED - Efectiva Diaria (Daily Effective Rate)
 * NM - Nominal Mensual (Nominal Monthly Rate - annual rate with monthly compounding)
 * NA - Nominal Anual (Nominal Annual Rate - stated annual rate)
 */
export const RATE_TYPES = {
  EA: {
    code: 'EA',
    label: 'Efectiva Anual',
    shortLabel: 'EA',
    description:
      'Tasa efectiva anual - el rendimiento real en un año con interés compuesto',
  },
  EM: {
    code: 'EM',
    label: 'Efectiva Mensual',
    shortLabel: 'E. Mensual',
    description:
      'Tasa efectiva mensual - el rendimiento real en un mes (ej: 1.5% mensual)',
  },
  ED: {
    code: 'ED',
    label: 'Efectiva Diaria',
    shortLabel: 'E. Diaria',
    description: 'Tasa efectiva diaria - el rendimiento real en un día',
  },
  NM: {
    code: 'NM',
    label: 'Nominal Mensual',
    shortLabel: 'N. Mensual',
    description:
      'Tasa mensual que ves en extractos o facturas (ej: 1.1% mensual)',
  },
  NA: {
    code: 'NA',
    label: 'Nominal Anual',
    shortLabel: 'N. Anual',
    description: 'Tasa anual simple (tasa mensual × 12, sin capitalización)',
  },
} as const;

export type RateType = keyof typeof RATE_TYPES;

export const RATE_TYPE_VALUES = Object.keys(RATE_TYPES) as RateType[];

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * Interest rate scenario - a saved rate conversion
 */
export interface InterestRateScenario {
  id: string;
  name: string;
  inputRate: number;
  inputRateType: RateType;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Result of converting a rate to all other types
 */
export interface RateConversionResult {
  ea: number; // Efectiva Anual
  em: number; // Efectiva Mensual
  ed: number; // Efectiva Diaria
  nm: number; // Nominal Mensual (capitalización mensual)
  na: number; // Nominal Anual (simple)
}

/**
 * Extended conversion result with metadata
 */
export interface RateConversionDisplay {
  rateType: RateType;
  value: number;
  isInput: boolean;
  formula: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface InterestRateScenarioListResponse {
  scenarios: InterestRateScenarioWithConversions[];
  totalCount: number;
}

export interface InterestRateScenarioWithConversions extends InterestRateScenario {
  conversions: RateConversionResult;
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const CreateInterestRateScenarioSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(255, 'El nombre no puede exceder 255 caracteres'),
  inputRate: z
    .number()
    .min(0, 'La tasa no puede ser negativa')
    .max(1000, 'La tasa no puede exceder 1000%'),
  inputRateType: z.enum(['EA', 'EM', 'ED', 'NM', 'NA'], {
    errorMap: () => ({ message: 'Tipo de tasa inválido' }),
  }),
  notes: z
    .string()
    .max(2000, 'Las notas no pueden exceder 2000 caracteres')
    .optional(),
});

export const UpdateInterestRateScenarioSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(255, 'El nombre no puede exceder 255 caracteres')
    .optional(),
  inputRate: z
    .number()
    .min(0, 'La tasa no puede ser negativa')
    .max(1000, 'La tasa no puede exceder 1000%')
    .optional(),
  inputRateType: z
    .enum(['EA', 'EM', 'ED', 'NM', 'NA'], {
      errorMap: () => ({ message: 'Tipo de tasa inválido' }),
    })
    .optional(),
  notes: z
    .string()
    .max(2000, 'Las notas no pueden exceder 2000 caracteres')
    .optional()
    .nullable(),
});

export type CreateInterestRateScenarioInput = z.infer<
  typeof CreateInterestRateScenarioSchema
>;
export type UpdateInterestRateScenarioInput = z.infer<
  typeof UpdateInterestRateScenarioSchema
>;

// ============================================================================
// Error Messages
// ============================================================================

export const INTEREST_RATE_ERROR_MESSAGES = {
  SCENARIO_NOT_FOUND: 'Escenario de tasa no encontrado',
  DUPLICATE_NAME: 'Ya existe un escenario con ese nombre',
  TABLES_NOT_FOUND:
    'Las tablas del simulador de tasas no existen. Ejecute la migración primero.',
  VALIDATION_ERROR: 'Datos de entrada inválidos',
  INTERNAL_ERROR: 'Error interno del servidor',
  INVALID_RATE_TYPE: 'Tipo de tasa inválido',
  RATE_OUT_OF_RANGE: 'La tasa está fuera del rango permitido',
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format a rate value as percentage string
 * @param rate - Rate as decimal (e.g., 0.12 for 12%)
 * @param decimals - Number of decimal places (default: 4)
 */
export function formatRateAsPercentage(
  rate: number,
  decimals: number = 4
): string {
  return `${(rate * 100).toFixed(decimals)}%`;
}

/**
 * Format a rate value for display (without % symbol)
 * @param rate - Rate as decimal (e.g., 0.12 for 12%)
 * @param decimals - Number of decimal places (default: 4)
 */
export function formatRateValue(rate: number, decimals: number = 4): string {
  return (rate * 100).toFixed(decimals);
}

/**
 * Parse a percentage input to decimal
 * @param input - Percentage value as string or number (e.g., "12" or 12 for 12%)
 */
export function parsePercentageToDecimal(input: string | number): number {
  const value = typeof input === 'string' ? parseFloat(input) : input;
  if (isNaN(value)) return 0;
  return value / 100;
}

/**
 * Get the label for a rate type
 */
export function getRateTypeLabel(rateType: RateType): string {
  return RATE_TYPES[rateType]?.label ?? rateType;
}

/**
 * Get the short label for a rate type
 */
export function getRateTypeShortLabel(rateType: RateType): string {
  return RATE_TYPES[rateType]?.shortLabel ?? rateType;
}

/**
 * Get the description for a rate type
 */
export function getRateTypeDescription(rateType: RateType): string {
  return RATE_TYPES[rateType]?.description ?? '';
}

/**
 * Validate if a string is a valid rate type
 */
export function isValidRateType(value: string): value is RateType {
  return RATE_TYPE_VALUES.includes(value as RateType);
}
