import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/credit-cards/dashboard?period_id={id}
 *
 * Returns credit card spending vs budget projection for a given period.
 *
 * Response shape: CreditCardDashboardResponse (see /types/credit-cards.ts)
 *
 * - cards[]: for each active card that has actual expenses OR categories assigned to it,
 *            shows actual spend (from expenses.credit_card_id) and projected (from budgets
 *            where category.default_credit_card_id = card.id), broken down by category.
 * - unassigned: expenses charged to a card that is NOT set as the default for that category.
 * - no_card: expenses with no credit_card_id at all, plus projected from categories with no default card.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('period_id');

    if (!periodId) {
      return NextResponse.json(
        { error: 'period_id query parameter is required' },
        { status: 400 }
      );
    }

    // Validate period exists
    const [period] = await sql`
      SELECT id, name FROM periods WHERE id = ${periodId}
    `;
    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    // 1. Actual expenses per card + category for this period
    const actualRows = await sql`
      SELECT
        e.credit_card_id,
        e.category_id,
        c.name AS category_name,
        c.tipo_gasto,
        SUM(e.amount) AS actual
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.period_id = ${periodId}
      GROUP BY e.credit_card_id, e.category_id, c.name, c.tipo_gasto
    `;

    // 2. Projected spend (budgets) per category for this period
    const projectedRows = await sql`
      SELECT
        c.default_credit_card_id,
        b.category_id,
        c.name AS category_name,
        c.tipo_gasto,
        SUM(b.expected_amount) AS projected
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.period_id = ${periodId}
      GROUP BY c.default_credit_card_id, b.category_id, c.name, c.tipo_gasto
    `;

    // 3. All active credit cards (to include cards with projection but no expenses)
    type CardRow = {
      id: string;
      bank_name: string;
      franchise: string;
      last_four_digits: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
    const cards = await sql`
      SELECT id, bank_name, franchise, last_four_digits, is_active, created_at, updated_at
      FROM credit_cards
      WHERE is_active = true
      ORDER BY bank_name, franchise, last_four_digits
    ` as CardRow[];

    // Build lookup maps
    type CategoryDetail = {
      category_id: string;
      category_name: string;
      tipo_gasto: string | null;
      actual: number;
      projected: number;
    };

    // cardId → categoryId → detail
    const cardActualMap = new Map<string, Map<string, CategoryDetail>>();
    // categoryId → actual (no card)
    const noCardActualMap = new Map<string, { category_name: string; actual: number }>();

    for (const row of actualRows) {
      const cardId = row.credit_card_id as string | null;
      const catId = row.category_id as string;
      const detail: CategoryDetail = {
        category_id: catId,
        category_name: row.category_name,
        tipo_gasto: row.tipo_gasto,
        actual: parseFloat(row.actual) || 0,
        projected: 0,
      };

      if (cardId) {
        if (!cardActualMap.has(cardId)) cardActualMap.set(cardId, new Map());
        cardActualMap.get(cardId)!.set(catId, detail);
      } else {
        const existing = noCardActualMap.get(catId);
        noCardActualMap.set(catId, {
          category_name: row.category_name,
          actual: (existing?.actual || 0) + detail.actual,
        });
      }
    }

    // cardId → categoryId → projected
    const cardProjectedMap = new Map<string, Map<string, { category_name: string; tipo_gasto: string | null; projected: number }>>();
    // null → categoryId → projected (no default card)
    const noCardProjectedMap = new Map<string, { category_name: string; tipo_gasto: string | null; projected: number }>();

    for (const row of projectedRows) {
      const cardId = row.default_credit_card_id as string | null;
      const catId = row.category_id as string;
      const proj = parseFloat(row.projected) || 0;

      if (cardId) {
        if (!cardProjectedMap.has(cardId)) cardProjectedMap.set(cardId, new Map());
        const existing = cardProjectedMap.get(cardId)!.get(catId);
        cardProjectedMap.get(cardId)!.set(catId, {
          category_name: row.category_name,
          tipo_gasto: row.tipo_gasto,
          projected: (existing?.projected || 0) + proj,
        });
      } else {
        const existing = noCardProjectedMap.get(catId);
        noCardProjectedMap.set(catId, {
          category_name: row.category_name,
          tipo_gasto: row.tipo_gasto,
          projected: (existing?.projected || 0) + proj,
        });
      }
    }

    // Build per-card result
    const cardIds = new Set<string>([
      ...Array.from(cardActualMap.keys()),
      ...Array.from(cardProjectedMap.keys()),
      ...cards.map((c: any) => c.id),
    ]);

    const cardMap = new Map(cards.map((c: any) => [c.id, c]));

    const cardResults = [];
    for (const cardId of cardIds) {
      const card = cardMap.get(cardId);
      if (!card) continue; // skip if card doesn't exist (was deleted)

      const actualByCategory = cardActualMap.get(cardId) || new Map<string, CategoryDetail>();
      const projectedByCategory = cardProjectedMap.get(cardId) || new Map<string, { category_name: string; tipo_gasto: string | null; projected: number }>();

      const categoryIds = new Set([
        ...Array.from(actualByCategory.keys()),
        ...Array.from(projectedByCategory.keys()),
      ]);

      const categories: CategoryDetail[] = [];
      for (const catId of categoryIds) {
        const actual = actualByCategory.get(catId)?.actual || 0;
        const projected = projectedByCategory.get(catId)?.projected || 0;
        const category_name =
          actualByCategory.get(catId)?.category_name ||
          projectedByCategory.get(catId)?.category_name ||
          '';
        const tipo_gasto =
          actualByCategory.get(catId)?.tipo_gasto ||
          projectedByCategory.get(catId)?.tipo_gasto ||
          null;
        categories.push({ category_id: catId, category_name, tipo_gasto, actual, projected });
      }

      categories.sort((a, b) => a.category_name.localeCompare(b.category_name, 'es'));

      const actual_total = categories.reduce((s, c) => s + c.actual, 0);
      const projected_total = categories.reduce((s, c) => s + c.projected, 0);

      // Only include this card if it has any data
      if (actual_total > 0 || projected_total > 0) {
        cardResults.push({
          credit_card: {
            id: card.id,
            bank_name: card.bank_name,
            franchise: card.franchise,
            last_four_digits: card.last_four_digits,
            is_active: card.is_active,
            created_at: card.created_at,
            updated_at: card.updated_at,
          },
          actual_total,
          projected_total,
          categories,
        });
      }
    }

    cardResults.sort((a, b) =>
      a.credit_card.bank_name.localeCompare(b.credit_card.bank_name, 'es')
    );

    // Build "no card" section (expenses without credit_card_id + budgets for categories with no default card)
    const noCardCategoryIds = new Set([
      ...Array.from(noCardActualMap.keys()),
      ...Array.from(noCardProjectedMap.keys()),
    ]);
    const noCardCategories = [];
    for (const catId of noCardCategoryIds) {
      const actual = noCardActualMap.get(catId)?.actual || 0;
      const projected = noCardProjectedMap.get(catId)?.projected || 0;
      const category_name =
        noCardActualMap.get(catId)?.category_name ||
        noCardProjectedMap.get(catId)?.category_name ||
        '';
      noCardCategories.push({ category_id: catId, category_name, actual, projected });
    }
    noCardCategories.sort((a, b) => a.category_name.localeCompare(b.category_name, 'es'));
    const noCardActualTotal = noCardCategories.reduce((s, c) => s + c.actual, 0);

    return NextResponse.json({
      period_id: period.id,
      period_name: period.name,
      cards: cardResults,
      unassigned: { actual_total: 0, categories: [] }, // future: expenses charged to a card not matching default
      no_card: {
        actual_total: noCardActualTotal,
        categories: noCardCategories,
      },
    });
  } catch (error) {
    console.error('Error fetching credit card dashboard:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
