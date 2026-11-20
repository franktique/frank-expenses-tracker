import { z } from 'zod';
import { PaymentMethodEnum } from '@/types/funds';

export const ProposedDetailSchema = z.object({
  item_id: z.string().uuid(),
  amount: z.number().positive(),
  quantity: z.number().nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
});

/** Datos del recibo escaneado en el móvil, pendientes de validar. */
export const ProposedExpenseSchema = z.object({
  category_id: z.string().uuid(),
  period_id: z.string().uuid(),
  date: z.string().refine((d) => !isNaN(Date.parse(d)), 'Fecha inválida'),
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  payment_method: PaymentMethodEnum,
  credit_card_id: z.string().uuid().nullable().optional(),
  store_name: z.string().max(255).nullable().optional(),
  details: z.array(ProposedDetailSchema).default([]),
});

export const CreateDuplicateReviewSchema = z.object({
  expense_id: z.string().uuid(),
  proposed: ProposedExpenseSchema,
});

/** Campos que el usuario puede decidir actualizar del gasto existente. */
export const RESOLVABLE_FIELDS = [
  'date',
  'description',
  'amount',
  'category_id',
  'payment_method',
  'credit_card_id',
  'store_name',
  'details',
] as const;

export type ResolvableField = (typeof RESOLVABLE_FIELDS)[number];

export const ResolveDuplicateReviewSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('apply'),
    fields: z.array(z.enum(RESOLVABLE_FIELDS)).min(1),
  }),
  z.object({ action: z.literal('dismiss') }),
]);

export type ProposedExpense = z.infer<typeof ProposedExpenseSchema>;

export interface ReviewDetailLine {
  item_id: string;
  item_name: string;
  subgroup_name: string | null;
  amount: number;
  quantity: number | null;
  unit: string | null;
}

/** Vista de un gasto (existente o propuesto) lista para comparar. */
export interface ReviewExpenseView {
  date: string;
  description: string;
  amount: number;
  category_id: string;
  category_name: string | null;
  payment_method: string;
  credit_card_id: string | null;
  credit_card_label: string | null;
  store_name: string | null;
  details: ReviewDetailLine[];
}

export interface DuplicateReview {
  id: string;
  expense_id: string;
  status: 'pending' | 'applied' | 'dismissed';
  created_at: string;
  resolved_at: string | null;
  existing: ReviewExpenseView & {
    period_name: string | null;
    is_verified: boolean;
  };
  proposed: ReviewExpenseView;
}
