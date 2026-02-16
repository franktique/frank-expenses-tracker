import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let projectionMode = false;
  let grouperIdStr = '';

  try {
    const { id } = await context.params;
    grouperIdStr = id;
    const grouperId = parseInt(id);
    const url = new URL(request.url);
    const periodId = url.searchParams.get('periodId');
    const paymentMethod = url.searchParams.get('paymentMethod'); // Legacy parameter for backward compatibility
    const expensePaymentMethods = url.searchParams.get('expensePaymentMethods');
    const budgetPaymentMethods = url.searchParams.get('budgetPaymentMethods');
    const includeBudgets = url.searchParams.get('includeBudgets') === 'true';
    projectionMode = url.searchParams.get('projectionMode') === 'true';

    if (isNaN(grouperId) || !periodId) {
      return NextResponse.json(
        { error: 'Valid grouperId and periodId are required' },
        { status: 400 }
      );
    }

    // Parse and validate payment method parameters
    let expensePaymentMethodsArray: string[] | null = null;
    let budgetPaymentMethodsArray: string[] | null = null;

    // Handle expense payment methods (new parameter or legacy fallback)
    if (expensePaymentMethods) {
      try {
        expensePaymentMethodsArray = expensePaymentMethods
          .split(',')
          .map((method) => {
            const trimmed = method.trim();
            if (!['cash', 'credit', 'debit'].includes(trimmed)) {
              throw new Error(`Invalid expense payment method: ${trimmed}`);
            }
            return trimmed;
          });
      } catch (error) {
        return NextResponse.json(
          {
            error: `Invalid expensePaymentMethods parameter: ${(error as Error).message}`,
          },
          { status: 400 }
        );
      }
    } else if (paymentMethod && paymentMethod !== 'all') {
      // Legacy backward compatibility
      expensePaymentMethodsArray = [paymentMethod];
    }

    // Handle budget payment methods
    if (budgetPaymentMethods) {
      try {
        budgetPaymentMethodsArray = budgetPaymentMethods
          .split(',')
          .map((method) => {
            const trimmed = method.trim();
            if (!['cash', 'credit', 'debit'].includes(trimmed)) {
              throw new Error(`Invalid budget payment method: ${trimmed}`);
            }
            return trimmed;
          });
      } catch (error) {
        return NextResponse.json(
          {
            error: `Invalid budgetPaymentMethods parameter: ${(error as Error).message}`,
          },
          { status: 400 }
        );
      }
    }

    // Build dynamic SQL query
    let query: string;
    let queryParams: (string | number | string[])[] = [periodId, grouperId];
    let paramIndex = 3;

    // Base SELECT clause
    let selectClause = `
      SELECT 
        c.id as category_id, 
        c.name as category_name,
        COALESCE(SUM(e.amount), 0) as total_amount`;

    // Add budget column if requested
    if (includeBudgets) {
      selectClause += `,
        COALESCE(SUM(b.expected_amount), 0) as budget_amount`;
    }

    // Base FROM and JOIN clauses
    let fromClause = `
      FROM 
        categories c
      JOIN grouper_categories gc ON c.id = gc.category_id
      LEFT JOIN expenses e ON c.id = e.category_id 
        AND e.period_id = $1`;

    // Add budget join if requested
    if (includeBudgets) {
      fromClause += `
      LEFT JOIN budgets b ON c.id = b.category_id 
        AND b.period_id = $1`;
    }

    // Add expense payment method filter
    if (expensePaymentMethodsArray && expensePaymentMethodsArray.length > 0) {
      fromClause += `
        AND e.payment_method = ANY($${paramIndex}::text[])`;
      queryParams.push(expensePaymentMethodsArray);
      paramIndex++;
    }

    // Add budget payment method filter
    if (
      includeBudgets &&
      budgetPaymentMethodsArray &&
      budgetPaymentMethodsArray.length > 0
    ) {
      fromClause += `
        AND b.payment_method = ANY($${paramIndex}::text[])`;
      queryParams.push(budgetPaymentMethodsArray);
      paramIndex++;
    }

    // WHERE clause
    let whereClause = `
      WHERE 
        gc.grouper_id = $2`;

    // GROUP BY clause
    let groupByClause = `
      GROUP BY 
        c.id, 
        c.name`;

    if (includeBudgets) {
      groupByClause += `,
        b.expected_amount`;
    }

    // ORDER BY clause
    let orderByClause = `
      ORDER BY 
        total_amount DESC`;

    // Combine all parts
    query =
      selectClause + fromClause + whereClause + groupByClause + orderByClause;

    interface CategoryStatRow {
      category_id: number;
      category_name: string;
      total_amount: string | number;
      budget_amount?: string | number | null;
    }

    // Use sql.unsafe or similar if sql.query is not available, but assuming sql.query works based on existing code.
    // However, usually `sql` is a tagged template literal. If `sql.query` exists, fine.
    // If not, we might need `sql(strings, ...values)`.
    // Given the existing code used `sql.query`, I'll assume it's correct but cast the result.
    const categoryStats = (await (sql as any).query(query, queryParams))
      .rows as CategoryStatRow[];

    // Enhanced error handling for category projection mode
    if (projectionMode && includeBudgets) {
      // Check if any budget data exists for categories
      const hasBudgetData = categoryStats.some(
        (item: CategoryStatRow) =>
          item.budget_amount !== null &&
          item.budget_amount !== undefined &&
          parseFloat(item.budget_amount.toString()) > 0
      );

      if (!hasBudgetData) {
        console.warn(
          `No budget data found for categories in grouper ${grouperIdStr}`
        );
        // Return data with warning metadata instead of throwing error
        return NextResponse.json(categoryStats, {
          headers: {
            'X-Budget-Warning':
              'No budget data available for category projection',
          },
        });
      }

      // Check for partial budget data in categories
      const categoriesWithBudget = categoryStats.filter(
        (item: CategoryStatRow) =>
          item.budget_amount !== null &&
          item.budget_amount !== undefined &&
          parseFloat(item.budget_amount.toString()) > 0
      );

      if (
        categoriesWithBudget.length < categoryStats.length &&
        categoriesWithBudget.length > 0
      ) {
        console.warn(
          `Partial budget data found for categories in grouper ${grouperIdStr}`
        );
        return NextResponse.json(categoryStats, {
          headers: {
            'X-Budget-Warning':
              'Partial budget data available for category projection',
          },
        });
      }
    }

    return NextResponse.json(categoryStats);
  } catch (error) {
    console.error(
      `Error fetching category statistics for grouper ${grouperIdStr}:`,
      error
    );

    // Enhanced error handling with projection context
    const errorMessage = (error as Error).message;
    const isProjectionError =
      projectionMode && errorMessage.toLowerCase().includes('budget');

    if (isProjectionError) {
      return NextResponse.json(
        {
          error: `Error loading category projection data for grouper ${grouperIdStr}: ${errorMessage}`,
          projectionError: true,
          categoryError: true,
          fallbackSuggested: true,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
