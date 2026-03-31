import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export type Cotizacion = {
  id: string;
  name: string;
  description?: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type CotizacionItem = {
  id: string;
  cotizacionId: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  quantity: number;
  notes?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CotizacionWithItems = Cotizacion & {
  items: CotizacionItem[];
  total: number;
  itemCount: number;
};

export type CotizacionListItem = Cotizacion & {
  total: number;
  itemCount: number;
};

// ============================================================================
// Zod Schemas
// ============================================================================

export const CreateCotizacionSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre de la cotización es obligatorio')
    .max(255, 'El nombre es demasiado largo'),
  description: z
    .string()
    .max(1000, 'La descripción es demasiado larga')
    .optional(),
  currency: z.string().length(3).default('COP'),
});

export const UpdateCotizacionSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre de la cotización es obligatorio')
    .max(255, 'El nombre es demasiado largo')
    .optional(),
  description: z
    .string()
    .max(1000, 'La descripción es demasiado larga')
    .optional()
    .nullable(),
  currency: z.string().length(3).optional(),
});

export const CreateCotizacionItemSchema = z.object({
  categoryId: z.string().uuid('La categoría es obligatoria'),
  amount: z
    .number()
    .min(0, 'El valor no puede ser negativo')
    .max(999999999999, 'El valor es demasiado grande'),
  quantity: z
    .number()
    .int('La cantidad debe ser un número entero')
    .positive('La cantidad debe ser positiva')
    .max(99999, 'La cantidad es demasiado grande')
    .default(1),
  notes: z.string().max(500, 'Las notas son demasiado largas').optional(),
});

export const UpdateCotizacionItemSchema = z.object({
  categoryId: z.string().uuid('La categoría es obligatoria').optional(),
  amount: z
    .number()
    .min(0, 'El valor no puede ser negativo')
    .max(999999999999, 'El valor es demasiado grande')
    .optional(),
  quantity: z
    .number()
    .int('La cantidad debe ser un número entero')
    .positive('La cantidad debe ser positiva')
    .max(99999, 'La cantidad es demasiado grande')
    .optional(),
  notes: z
    .string()
    .max(500, 'Las notas son demasiado largas')
    .optional()
    .nullable(),
});

// ============================================================================
// Error Messages
// ============================================================================

export const COTIZACION_ERROR_MESSAGES = {
  NOT_FOUND: 'La cotización no existe',
  ITEM_NOT_FOUND: 'El ítem no existe',
  NAME_REQUIRED: 'El nombre de la cotización es obligatorio',
  CATEGORY_REQUIRED: 'La categoría es obligatoria',
  TABLES_NOT_FOUND:
    'Las tablas de cotizaciones no existen. Ejecute la migración.',
} as const;

// ============================================================================
// Utility
// ============================================================================

export function formatCotizacionCurrency(
  amount: number,
  currency = 'COP'
): string {
  const localeMap: Record<string, string> = {
    COP: 'es-CO',
    USD: 'en-US',
    EUR: 'de-DE',
    MXN: 'es-MX',
  };
  return new Intl.NumberFormat(localeMap[currency] ?? 'es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
