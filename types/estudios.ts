import { z } from 'zod';

// Payment method type definition - Requirements 1.2, 3.1
export const PaymentMethodEnum = z.enum(['cash', 'credit', 'debit']);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

// Payment methods array validation schema
export const PaymentMethodsArraySchema = z
  .array(PaymentMethodEnum)
  .min(1, 'Debe seleccionar al menos un método de pago')
  .refine(
    (methods) => new Set(methods).size === methods.length,
    'No se permiten métodos de pago duplicados'
  )
  .nullable();

// Estudio interface
export interface Estudio {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Grouper interface
export interface Grouper {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

// EstudioGrouperResponse interface with payment methods support - Requirements 1.2, 2.1, 3.1
export interface EstudioGrouperResponse {
  id: number;
  name: string;
  is_assigned?: boolean;
  percentage?: number;
  payment_methods?: PaymentMethod[] | null; // New field for payment method filtering
}

// Estudio grouper relationship interface
export interface EstudioGrouper {
  id: number;
  estudio_id: number;
  grouper_id: number;
  percentage?: number;
  payment_methods?: PaymentMethod[] | null;
  created_at: string;
  updated_at: string;
}

// API request/response interfaces

// Request to update grouper percentage and payment methods
export interface UpdateEstudioGrouperRequest {
  percentage?: number | null;
  payment_methods?: PaymentMethod[] | null;
}

// Response for grouper list endpoint
export interface EstudioGroupersListResponse {
  assignedGroupers: EstudioGrouperResponse[];
  availableGroupers: EstudioGrouperResponse[];
}

// Response for individual grouper update
export interface UpdateEstudioGrouperResponse {
  success: boolean;
  grouper: EstudioGrouperResponse;
  message: string;
}

// Response for adding groupers to estudio
export interface AddGroupersToEstudioResponse {
  success: boolean;
  added: number;
  skipped: number;
  alreadyAssigned?: number;
}

// Response for removing grouper from estudio
export interface RemoveGrouperFromEstudioResponse {
  success: boolean;
  removedGrouper: {
    id: number;
    name: string;
  };
}

// Dashboard API response types with payment method filtering - Requirements 2.1, 2.2
export interface DashboardGrouperResult {
  grouper_id: number;
  grouper_name: string;
  total_amount: string;
  budget_amount?: string;
  // Metadata about payment method filtering applied
  payment_methods_applied?: PaymentMethod[] | null;
}

// Enhanced dashboard groupers response with filtering metadata
export interface DashboardGroupersResponse {
  data: DashboardGrouperResult[];
  metadata: {
    estudio_id?: number;
    period_id: string;
    payment_method_filtering_applied: boolean;
    projection_mode: boolean;
    includes_budgets: boolean;
  };
}

// Validation schemas

export const EstudioSchema = z.object({
  id: z.number().int().positive(),
  name: z
    .string()
    .min(1, 'El nombre del estudio es obligatorio')
    .max(255, 'El nombre del estudio es demasiado largo'),
  description: z
    .string()
    .max(500, 'La descripción es demasiado larga')
    .optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const GrouperSchema = z.object({
  id: z.number().int().positive(),
  name: z
    .string()
    .min(1, 'El nombre del agrupador es obligatorio')
    .max(255, 'El nombre del agrupador es demasiado largo'),
  created_at: z.string(),
  updated_at: z.string(),
});

export const EstudioGrouperSchema = z.object({
  id: z.number().int().positive(),
  estudio_id: z.number().int().positive(),
  grouper_id: z.number().int().positive(),
  percentage: z
    .number()
    .min(0, 'El porcentaje no puede ser negativo')
    .max(100, 'El porcentaje no puede ser mayor a 100')
    .nullable()
    .optional(),
  payment_methods: PaymentMethodsArraySchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export const EstudioGrouperResponseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  is_assigned: z.boolean().optional(),
  percentage: z
    .number()
    .min(0, 'El porcentaje no puede ser negativo')
    .max(100, 'El porcentaje no puede ser mayor a 100')
    .nullable()
    .optional(),
  payment_methods: PaymentMethodsArraySchema,
});

export const UpdateEstudioGrouperRequestSchema = z.object({
  percentage: z
    .number()
    .min(0, 'El porcentaje no puede ser negativo')
    .max(100, 'El porcentaje no puede ser mayor a 100')
    .nullable()
    .optional(),
  payment_methods: PaymentMethodsArraySchema.optional(),
});

// Type guards and utility functions

export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return ['cash', 'credit', 'debit'].includes(method);
}

export function validatePaymentMethods(
  methods: unknown
): methods is PaymentMethod[] | null {
  if (methods === null || methods === undefined) {
    return true;
  }

  if (!Array.isArray(methods)) {
    return false;
  }

  if (methods.length === 0) {
    return false; // Empty array not allowed, use null for "all methods"
  }

  return methods.every(isValidPaymentMethod);
}

export function hasPaymentMethodFiltering(
  grouper: EstudioGrouperResponse
): boolean {
  return (
    grouper.payment_methods !== null &&
    grouper.payment_methods !== undefined &&
    Array.isArray(grouper.payment_methods) &&
    grouper.payment_methods.length > 0
  );
}

// Constants

export const VALID_PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'credit',
  'debit',
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  credit: 'Crédito',
  debit: 'Débito',
};

// Error messages
export const ESTUDIO_ERROR_MESSAGES = {
  ESTUDIO_NOT_FOUND: 'El estudio especificado no existe',
  GROUPER_NOT_FOUND: 'El agrupador especificado no existe',
  RELATIONSHIP_NOT_FOUND: 'La relación estudio-agrupador no existe',
  RELATIONSHIP_EXISTS: 'El agrupador ya está asignado a este estudio',
  INVALID_PERCENTAGE: 'El porcentaje debe ser un número entre 0 y 100',
  INVALID_PAYMENT_METHODS: 'Los métodos de pago deben ser un array válido',
  EMPTY_PAYMENT_METHODS_ARRAY:
    'El array de métodos de pago no puede estar vacío. Use null para incluir todos los métodos',
  DUPLICATE_PAYMENT_METHODS: 'No se permiten métodos de pago duplicados',
  INVALID_PAYMENT_METHOD_VALUES:
    'Métodos de pago inválidos. Valores válidos: cash, credit, debit',
  PAYMENT_METHODS_REQUIRED: 'Debe seleccionar al menos un método de pago',
} as const;
