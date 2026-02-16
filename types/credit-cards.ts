import { z } from 'zod';

// Credit Card franchise enum
export type CreditCardFranchise =
  | 'visa'
  | 'mastercard'
  | 'american_express'
  | 'discover'
  | 'other';

// Credit Card franchise enum for Zod validation
export const CreditCardFranchiseEnum = z.enum([
  'visa',
  'mastercard',
  'american_express',
  'discover',
  'other',
]);

// Credit Card interface
export interface CreditCard {
  id: string;
  bank_name: string;
  franchise: CreditCardFranchise;
  last_four_digits: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Credit Card validation schema
export const CreditCardSchema = z.object({
  id: z.string().uuid(),
  bank_name: z
    .string()
    .min(1, 'El nombre del banco es obligatorio')
    .max(255, 'El nombre del banco es demasiado largo'),
  franchise: CreditCardFranchiseEnum,
  last_four_digits: z
    .string()
    .regex(/^[0-9]{4}$/, 'Deben ser exactamente 4 dígitos'),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Credit Card creation schema (for API requests)
export const CreateCreditCardSchema = z.object({
  bank_name: z
    .string()
    .min(1, 'El nombre del banco es obligatorio')
    .max(255, 'El nombre del banco es demasiado largo'),
  franchise: CreditCardFranchiseEnum,
  last_four_digits: z
    .string()
    .regex(/^[0-9]{4}$/, 'Deben ser exactamente 4 dígitos'),
  is_active: z.boolean().optional().default(true),
});

// Credit Card update schema (for API requests)
export const UpdateCreditCardSchema = z.object({
  bank_name: z
    .string()
    .min(1, 'El nombre del banco es obligatorio')
    .max(255, 'El nombre del banco es demasiado largo')
    .optional(),
  franchise: CreditCardFranchiseEnum.optional(),
  last_four_digits: z
    .string()
    .regex(/^[0-9]{4}$/, 'Deben ser exactamente 4 dígitos')
    .optional(),
  is_active: z.boolean().optional(),
});

// Credit Card status update schema (for status toggle operations)
export const UpdateCreditCardStatusSchema = z.object({
  is_active: z.boolean(),
});

// Credit Card display information (for UI components)
export interface CreditCardInfo {
  bank_name: string;
  franchise: CreditCardFranchise;
  last_four_digits: string;
  is_active: boolean;
}

// Credit Card error messages
export const CREDIT_CARD_ERROR_MESSAGES = {
  CREDIT_CARD_NOT_FOUND: 'La tarjeta de crédito especificada no existe',
  BANK_NAME_REQUIRED: 'El nombre del banco es obligatorio',
  BANK_NAME_TOO_LONG: 'El nombre del banco es demasiado largo',
  FRANCHISE_REQUIRED: 'La franquicia de la tarjeta es obligatoria',
  FRANCHISE_INVALID: 'La franquicia seleccionada no es válida',
  LAST_FOUR_DIGITS_REQUIRED: 'Los últimos 4 dígitos son obligatorios',
  LAST_FOUR_DIGITS_INVALID: 'Los últimos 4 dígitos deben ser números',
  LAST_FOUR_DIGITS_LENGTH: 'Deben ser exactamente 4 dígitos',
  DUPLICATE_CREDIT_CARD: 'Ya existe una tarjeta con estos datos',
  CREDIT_CARD_IN_USE:
    'No se puede eliminar la tarjeta porque está asociada a gastos',
  CREDIT_CARD_DELETE_CONFIRMATION:
    '¿Está seguro de que desea eliminar esta tarjeta de crédito?',
  CREDIT_CARD_CREATE_SUCCESS: 'Tarjeta de crédito creada exitosamente',
  CREDIT_CARD_UPDATE_SUCCESS: 'Tarjeta de crédito actualizada exitosamente',
  CREDIT_CARD_DELETE_SUCCESS: 'Tarjeta de crédito eliminada exitosamente',
  CREDIT_CARD_STATUS_UPDATE_SUCCESS:
    'Estado de la tarjeta actualizado exitosamente',
  CREDIT_CARD_ACTIVATED: 'Tarjeta de crédito activada',
  CREDIT_CARD_DEACTIVATED: 'Tarjeta de crédito desactivada',
} as const;

// Credit Card franchise labels for UI display
export const CREDIT_CARD_FRANCHISE_LABELS: Record<CreditCardFranchise, string> =
  {
    visa: 'Visa',
    mastercard: 'Mastercard',
    american_express: 'American Express',
    discover: 'Discover',
    other: 'Otra',
  };

// API response types
export interface CreditCardListResponse {
  credit_cards: CreditCard[];
  total_count: number;
}

export interface CreditCardOperationResult {
  success: boolean;
  credit_card?: CreditCard;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}
