import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  CreateDuplicateReviewSchema,
  type DuplicateReview,
  type ReviewDetailLine,
  type ReviewExpenseView,
} from '@/types/duplicate-reviews';

type Row = Record<string, any>;
const q = (strings: TemplateStringsArray, ...values: unknown[]) =>
  sql(strings, ...values) as unknown as Promise<Row[]>;

const dateOnly = (value: unknown): string =>
  value instanceof Date
    ? value.toISOString().split('T')[0]
    : String(value).split('T')[0];

const cardLabel = (
  bank: string | null,
  franchise: string | null,
  last4: string | null
) => (bank ? `${bank} ${franchise ?? ''} •••• ${last4 ?? ''}`.trim() : null);

/**
 * GET /api/expense-duplicate-reviews?status=pending|applied|dismissed
 * Devuelve cada revisión con el gasto existente y el propuesto (móvil) ya
 * resueltos a nombres, para mostrarlos lado a lado.
 */
export async function GET(request: NextRequest) {
  try {
    const status = new URL(request.url).searchParams.get('status') ?? 'pending';

    const reviews = await q`
      SELECT id, expense_id, proposed, status, created_at, resolved_at
      FROM expense_duplicate_reviews
      WHERE status = ${status}
      ORDER BY created_at DESC
    `;
    if (reviews.length === 0) return NextResponse.json([]);

    const expenseIds = reviews.map((r) => r.expense_id as string);
    const expenses = await q`
      SELECT
        e.id, e.date, e.description, e.amount, e.category_id, e.payment_method,
        e.credit_card_id, e.store_name, e.is_verified,
        c.name AS category_name, p.name AS period_name,
        cc.bank_name, cc.franchise, cc.last_four_digits
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      JOIN periods p ON e.period_id = p.id
      LEFT JOIN credit_cards cc ON e.credit_card_id = cc.id
      WHERE e.id = ANY(${expenseIds}::uuid[])
    `;
    const existingDetails = await q`
      SELECT ed.expense_id, ed.item_id, ed.amount, ed.quantity, ed.unit,
             ci.name AS item_name, sg.name AS subgroup_name
      FROM expense_details ed
      JOIN category_items ci ON ed.item_id = ci.id
      JOIN category_subgroups sg ON ci.subgroup_id = sg.id
      WHERE ed.expense_id = ANY(${expenseIds}::uuid[])
      ORDER BY sg.display_order, sg.name, ci.display_order, ci.name
    `;

    const proposedItemIds = [
      ...new Set(
        reviews.flatMap((r) =>
          (
            (r.proposed as { details?: { item_id: string }[] }).details ?? []
          ).map((d) => d.item_id)
        )
      ),
    ];
    const itemNames = proposedItemIds.length
      ? await q`
          SELECT ci.id, ci.name AS item_name, sg.name AS subgroup_name
          FROM category_items ci
          JOIN category_subgroups sg ON ci.subgroup_id = sg.id
          WHERE ci.id = ANY(${proposedItemIds}::uuid[])
        `
      : [];
    const itemNameById = new Map(itemNames.map((i) => [i.id as string, i]));

    const categoryIds = [
      ...new Set(
        reviews.map((r) => (r.proposed as { category_id: string }).category_id)
      ),
    ];
    const categories = await q`
      SELECT id, name FROM categories WHERE id = ANY(${categoryIds}::uuid[])
    `;
    const categoryNameById = new Map(
      categories.map((c) => [c.id as string, c.name as string])
    );

    const cardIds = [
      ...new Set(
        reviews
          .map(
            (r) =>
              (r.proposed as { credit_card_id?: string | null }).credit_card_id
          )
          .filter((id): id is string => !!id)
      ),
    ];
    const cards = cardIds.length
      ? await q`
          SELECT id, bank_name, franchise, last_four_digits
          FROM credit_cards WHERE id = ANY(${cardIds}::uuid[])
        `
      : [];
    const cardById = new Map(cards.map((c) => [c.id as string, c]));

    const result: DuplicateReview[] = [];
    for (const review of reviews) {
      const e = expenses.find((x) => x.id === review.expense_id);
      if (!e) continue;
      const p = review.proposed as {
        category_id: string;
        date: string;
        description: string;
        amount: number;
        payment_method: string;
        credit_card_id?: string | null;
        store_name?: string | null;
        details?: {
          item_id: string;
          amount: number;
          quantity?: number | null;
          unit?: string | null;
        }[];
      };

      const existingLines: ReviewDetailLine[] = existingDetails
        .filter((d) => d.expense_id === e.id)
        .map((d) => ({
          item_id: d.item_id,
          item_name: d.item_name,
          subgroup_name: d.subgroup_name,
          amount: Number(d.amount),
          quantity: d.quantity === null ? null : Number(d.quantity),
          unit: d.unit,
        }));

      const proposedLines: ReviewDetailLine[] = (p.details ?? []).map((d) => {
        const meta = itemNameById.get(d.item_id);
        return {
          item_id: d.item_id,
          item_name: (meta?.item_name as string) ?? 'Ítem',
          subgroup_name: (meta?.subgroup_name as string) ?? null,
          amount: Number(d.amount),
          quantity: d.quantity ?? null,
          unit: d.unit ?? null,
        };
      });

      const card = p.credit_card_id
        ? cardById.get(p.credit_card_id)
        : undefined;
      const proposedView: ReviewExpenseView = {
        date: dateOnly(p.date),
        description: p.description,
        amount: Number(p.amount),
        category_id: p.category_id,
        category_name: categoryNameById.get(p.category_id) ?? null,
        payment_method: p.payment_method,
        credit_card_id: p.credit_card_id ?? null,
        credit_card_label: card
          ? cardLabel(card.bank_name, card.franchise, card.last_four_digits)
          : null,
        store_name: p.store_name ?? null,
        details: proposedLines,
      };

      result.push({
        id: review.id,
        expense_id: review.expense_id,
        status: review.status,
        created_at: review.created_at,
        resolved_at: review.resolved_at,
        existing: {
          date: dateOnly(e.date),
          description: e.description,
          amount: Number(e.amount),
          category_id: e.category_id,
          category_name: e.category_name,
          payment_method: e.payment_method,
          credit_card_id: e.credit_card_id,
          credit_card_label: cardLabel(
            e.bank_name,
            e.franchise,
            e.last_four_digits
          ),
          store_name: e.store_name,
          period_name: e.period_name,
          is_verified: e.is_verified,
          details: existingLines,
        },
        proposed: proposedView,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing duplicate reviews:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/** POST /api/expense-duplicate-reviews — lo usa el móvil para encolar. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = CreateDuplicateReviewSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }
    const { expense_id, proposed } = validation.data;

    const [expense] = await sql`
      SELECT id FROM expenses WHERE id = ${expense_id}
    `;
    if (!expense) {
      return NextResponse.json(
        { error: 'Gasto no encontrado' },
        { status: 404 }
      );
    }

    const [created] = await sql`
      INSERT INTO expense_duplicate_reviews (expense_id, proposed)
      VALUES (${expense_id}, ${JSON.stringify(proposed)}::jsonb)
      RETURNING id, expense_id, status, created_at
    `;
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating duplicate review:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
