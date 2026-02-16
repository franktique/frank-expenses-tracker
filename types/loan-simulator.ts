/**
 * Loan Simulator Type Definitions
 * Defines types for loan scenarios, amortization schedules, and extra payments
 */

import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

/**
 * Supported currencies for loan simulations
 */
export const SUPPORTED_CURRENCIES = {
  USD: { code: 'USD', symbol: '$', locale: 'en-US', name: 'US Dollar' },
  COP: { code: 'COP', symbol: '$', locale: 'es-CO', name: 'Colombian Peso' },
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE', name: 'Euro' },
  MXN: { code: 'MXN', symbol: '$', locale: 'es-MX', name: 'Mexican Peso' },
  ARS: { code: 'ARS', symbol: '$', locale: 'es-AR', name: 'Argentine Peso' },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB', name: 'British Pound' },
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

/**
 * LoanScenario - Represents a loan configuration for simulation
 */
export type LoanScenario = {
  id: string;
  name: string;
  principal: number;
  interestRate: number; // EA (Effective Annual) rate as percentage
  termMonths: number;
  startDate: string; // ISO date string (YYYY-MM-DD)
  currency: CurrencyCode; // Currency for the loan (default: USD)
  createdAt: string;
  updatedAt: string;
};

/**
 * AmortizationPayment - Single payment in the amortization schedule
 */
export type AmortizationPayment = {
  paymentNumber: number;
  date: string;
  paymentAmount: number;
  principalPortion: number;
  interestPortion: number;
  remainingBalance: number;
  isExtraPayment?: boolean;
  extraAmount?: number;
};

/**
 * ExtraPayment - Additional payment applied to a specific payment number
 */
export type ExtraPayment = {
  id: string;
  loanScenarioId: string;
  paymentNumber: number;
  amount: number;
  description?: string;
  createdAt: string;
};

/**
 * LoanComparison - Comparison data for different interest rates
 */
export type LoanComparison = {
  interestRate: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
};

/**
 * LoanSummary - Summary statistics for a loan scenario
 */
export type LoanSummary = {
  monthlyPayment: number;
  totalPrincipal: number;
  totalInterest: number;
  totalPayment: number;
  payoffDate: string;
  termMonths: number;
};

/**
 * PaymentScheduleResponse - API response for payment schedule
 */
export type PaymentScheduleResponse = {
  loanScenarioId: string;
  summary: LoanSummary;
  payments: AmortizationPayment[];
  extraPayments: ExtraPayment[];
  originalSummary?: LoanSummary; // Original summary before extra payments
  monthsSaved?: number; // Months saved due to extra payments
  interestSaved?: number; // Interest saved due to extra payments
};

/**
 * LoanScenarioListResponse - API response for list of loan scenarios
 */
export type LoanScenarioListResponse = {
  scenarios: LoanScenario[];
  totalCount: number;
};

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * LoanScenarioSchema - Validation for loan scenario data
 */
export const LoanScenarioSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(1, 'El nombre del préstamo es obligatorio')
    .max(255, 'El nombre del préstamo es demasiado largo'),
  principal: z
    .number()
    .positive('El monto del préstamo debe ser positivo')
    .max(999999999999, 'El monto del préstamo es demasiado grande'),
  interestRate: z
    .number()
    .positive('La tasa de interés debe ser positiva')
    .max(100, 'La tasa de interés no puede exceder 100%'),
  termMonths: z
    .number()
    .int('El plazo debe ser un número entero')
    .positive('El plazo debe ser positivo')
    .max(480, 'El plazo no puede exceder 480 meses (40 años)'),
  startDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Fecha de inicio inválida'),
  currency: z.enum(['USD', 'COP', 'EUR', 'MXN', 'ARS', 'GBP']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * CreateLoanScenarioSchema - Validation for creating a new loan scenario
 */
export const CreateLoanScenarioSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre del préstamo es obligatorio')
    .max(255, 'El nombre del préstamo es demasiado largo'),
  principal: z
    .number()
    .positive('El monto del préstamo debe ser positivo')
    .max(999999999.99, 'El monto del préstamo es demasiado grande'),
  interestRate: z
    .number()
    .positive('La tasa de interés debe ser positiva')
    .max(100, 'La tasa de interés no puede exceder 100%'),
  termMonths: z
    .number()
    .int('El plazo debe ser un número entero')
    .positive('El plazo debe ser positivo')
    .max(480, 'El plazo no puede exceder 480 meses (40 años)'),
  startDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Fecha de inicio inválida'),
  currency: z.enum(['USD', 'COP', 'EUR', 'MXN', 'ARS', 'GBP']).default('USD'),
});

/**
 * UpdateLoanScenarioSchema - Validation for updating a loan scenario
 */
export const UpdateLoanScenarioSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre del préstamo es obligatorio')
    .max(255, 'El nombre del préstamo es demasiado largo')
    .optional(),
  principal: z
    .number()
    .positive('El monto del préstamo debe ser positivo')
    .max(999999999.99, 'El monto del préstamo es demasiado grande')
    .optional(),
  interestRate: z
    .number()
    .positive('La tasa de interés debe ser positiva')
    .max(100, 'La tasa de interés no puede exceder 100%')
    .optional(),
  termMonths: z
    .number()
    .int('El plazo debe ser un número entero')
    .positive('El plazo debe ser positivo')
    .max(480, 'El plazo no puede exceder 480 meses (40 años)')
    .optional(),
  startDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Fecha de inicio inválida')
    .optional(),
});

/**
 * ExtraPaymentSchema - Validation for extra payment data
 */
export const ExtraPaymentSchema = z.object({
  id: z.string().uuid(),
  loanScenarioId: z.string().uuid(),
  paymentNumber: z
    .number()
    .int('El número de pago debe ser un número entero')
    .positive('El número de pago debe ser positivo'),
  amount: z
    .number()
    .positive('El monto del pago extra debe ser positivo')
    .max(999999999.99, 'El monto del pago extra es demasiado grande'),
  description: z
    .string()
    .max(500, 'La descripción es demasiado larga')
    .optional(),
  createdAt: z.string(),
});

/**
 * CreateExtraPaymentSchema - Validation for creating a new extra payment
 */
export const CreateExtraPaymentSchema = z.object({
  paymentNumber: z
    .number()
    .int('El número de pago debe ser un número entero')
    .positive('El número de pago debe ser positivo'),
  amount: z
    .number()
    .positive('El monto del pago extra debe ser positivo')
    .max(999999999.99, 'El monto del pago extra es demasiado grande'),
  description: z
    .string()
    .max(500, 'La descripción es demasiado larga')
    .optional(),
});

/**
 * UpdateExtraPaymentSchema - Validation for updating an extra payment
 */
export const UpdateExtraPaymentSchema = z.object({
  paymentNumber: z
    .number()
    .int('El número de pago debe ser un número entero')
    .positive('El número de pago debe ser positivo')
    .optional(),
  amount: z
    .number()
    .positive('El monto del pago extra debe ser positivo')
    .max(999999999.99, 'El monto del pago extra es demasiado grande')
    .optional(),
  description: z
    .string()
    .max(500, 'La descripción es demasiado larga')
    .optional(),
});

// ============================================================================
// Error Messages
// ============================================================================

/**
 * LOAN_ERROR_MESSAGES - Error messages for loan simulator operations
 */
export const LOAN_ERROR_MESSAGES = {
  SCENARIO_NOT_FOUND: 'El escenario de préstamo no existe',
  SCENARIO_NAME_REQUIRED: 'El nombre del préstamo es obligatorio',
  PRINCIPAL_REQUIRED: 'El monto del préstamo es obligatorio',
  PRINCIPAL_MUST_BE_POSITIVE: 'El monto del préstamo debe ser positivo',
  INTEREST_RATE_REQUIRED: 'La tasa de interés es obligatoria',
  INTEREST_RATE_MUST_BE_POSITIVE: 'La tasa de interés debe ser positiva',
  TERM_REQUIRED: 'El plazo es obligatorio',
  TERM_MUST_BE_POSITIVE: 'El plazo debe ser positivo',
  START_DATE_REQUIRED: 'La fecha de inicio es obligatoria',
  EXTRA_PAYMENT_NOT_FOUND: 'El pago extra no existe',
  INVALID_PAYMENT_NUMBER: 'El número de pago es inválido',
  DUPLICATE_NAME: 'Ya existe un préstamo con este nombre',
} as const;
