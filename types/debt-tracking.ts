/**
 * Debt Tracking Type Definitions
 * Defines types for tracking real active debts and obligations
 */

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

export type TipoTasa = 'EA' | 'EM';

export interface DebtObligation {
  id: string;
  name: string;
  credit_card_id: string | null;
  category_id: string | null;
  monto_original: number;
  plazo_original: number;
  fecha_inicio: string | null; // ISO date YYYY-MM-DD
  cuotas_pendientes: number;
  tasa_interes: number; // as percentage, e.g. 24.5 for 24.5%
  tipo_tasa: TipoTasa;
  saldo_actual: number;
  pago_mensual: number;
  valor_seguro: number; // fixed insurance component included in pago_mensual
  dia_pago: number | null; // 1-31
  last_updated_period_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  credit_card?: {
    id: string;
    bank_name: string;
    franchise: string;
    last_four_digits: string;
  } | null;
  category?: {
    id: string;
    name: string;
  } | null;
}

export interface DebtProjectionRow {
  paymentNumber: number;
  date: string; // YYYY-MM-DD
  paymentAmount: number;
  principalPortion: number;
  interestPortion: number;
  insurancePortion: number;
  remainingBalance: number;
  extraPayment?: number;
}

export type ReductionMode = 'reducir_cuota' | 'reducir_plazo';

export interface DebtProjectionRequest {
  reductionMode: ReductionMode;
  extraPayments: Record<number, number>; // paymentNumber -> extra amount
}

export interface DebtProjectionSummary {
  totalPayments: number;
  totalPrincipal: number;
  totalInterest: number;
  totalInsurance: number;
  totalExtraPayments: number;
  payoffDate: string;
  monthlyPayment: number;
  baseMonthlyPayment: number; // PMT (capital + interest, without insurance)
  insurancePerMonth: number;
}

export interface DebtProjectionResponse {
  rows: DebtProjectionRow[];
  summary: DebtProjectionSummary;
}

export interface CreditCardDebtGroup {
  credit_card: {
    id: string;
    bank_name: string;
    franchise: string;
    last_four_digits: string;
  };
  debts: DebtObligation[];
  totals: {
    saldo_total: number;
    capital_mensual: number;
    intereses_mensual: number;
    seguro_mensual: number;
    pago_mensual_total: number;
  };
}

export interface CategoryPaymentDetection {
  category_id: string;
  category_name: string;
  expense_count: number;
  expense_total: number;
  debts: DebtObligation[];
}

export interface DetectCategoryPaymentsResponse {
  period_id: string;
  detections: CategoryPaymentDetection[];
}

export interface ApplyPeriodPaymentsRequest {
  period_id: string;
  debt_ids: string[];
}

export interface ApplyPeriodPaymentsResponse {
  updated: Array<{
    debt_id: string;
    previous_saldo: number;
    new_saldo: number;
    previous_cuotas: number;
    new_cuotas: number;
  }>;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const CreateDebtSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(255, 'El nombre es demasiado largo'),
  credit_card_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  monto_original: z
    .number()
    .positive('El monto original debe ser positivo')
    .max(999999999999, 'El monto es demasiado grande'),
  plazo_original: z
    .number()
    .int('El plazo debe ser un número entero')
    .positive('El plazo debe ser positivo')
    .max(600, 'El plazo no puede exceder 600 meses'),
  fecha_inicio: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), 'Fecha inválida')
    .nullable()
    .optional(),
  cuotas_pendientes: z
    .number()
    .int('Las cuotas pendientes deben ser un número entero')
    .min(0, 'Las cuotas pendientes no pueden ser negativas')
    .max(600, 'Las cuotas pendientes no pueden exceder 600'),
  tasa_interes: z
    .number()
    .positive('La tasa de interés debe ser positiva')
    .max(1000, 'La tasa de interés parece muy alta'),
  tipo_tasa: z.enum(['EA', 'EM']).default('EA'),
  saldo_actual: z
    .number()
    .min(0, 'El saldo actual no puede ser negativo')
    .max(999999999999, 'El saldo es demasiado grande'),
  pago_mensual: z
    .number()
    .min(0, 'El pago mensual no puede ser negativo')
    .max(999999999999, 'El pago mensual es demasiado grande'),
  valor_seguro: z
    .number()
    .min(0, 'El valor del seguro no puede ser negativo')
    .max(999999999999, 'El valor del seguro es demasiado grande')
    .default(0),
  dia_pago: z
    .number()
    .int('El día de pago debe ser un número entero')
    .min(1, 'El día de pago debe ser entre 1 y 31')
    .max(31, 'El día de pago debe ser entre 1 y 31')
    .nullable()
    .optional(),
});

export const UpdateDebtSchema = CreateDebtSchema.partial();

export type CreateDebtInput = z.infer<typeof CreateDebtSchema>;
export type UpdateDebtInput = z.infer<typeof UpdateDebtSchema>;
