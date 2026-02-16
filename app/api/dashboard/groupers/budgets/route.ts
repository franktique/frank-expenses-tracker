import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');
    const grouperIds = searchParams.get('grouperIds');
    const estudioId = searchParams.get('estudioId');
    const budgetPaymentMethods = searchParams.get('budgetPaymentMethods');

    // Parse grouperIds if provided
    let grouperIdArray: number[] | null = null;
    if (grouperIds) {
      try {
        grouperIdArray = grouperIds.split(',').map((id) => {
          const parsed = parseInt(id.trim());
          if (isNaN(parsed)) {
            throw new Error(`Invalid grouper ID: ${id}`);
          }
          return parsed;
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: `Invalid grouperIds parameter: ${(error as Error).message}`,
          },
          { status: 400 }
        );
      }
    }

    // Parse and validate budget payment method parameters
    let budgetPaymentMethodsArray: string[] | null = null;
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

    // Validate periodId if provided (it should be a valid UUID string)
    if (periodId && typeof periodId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid periodId parameter' },
        { status: 400 }
      );
    }

    let query: string;
    let queryParams: any[] = [];

    if (periodId) {
      // Query for specific period
      query = `
        SELECT
          g.id as grouper_id,
          g.name as grouper_name,
          p.id as period_id,
          p.name as period_name,
          COALESCE(SUM(b.expected_amount), 0) as total_budget
        FROM groupers g`;

      // Add estudio filtering join if estudioId is provided
      if (estudioId) {
        query += `
        INNER JOIN estudio_groupers eg ON eg.grouper_id = g.id
          AND eg.estudio_id = $${queryParams.length + 1}`;
        queryParams.push(parseInt(estudioId));
      }

      query += `
        CROSS JOIN periods p
        LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
        LEFT JOIN categories c ON c.id = gc.category_id
        LEFT JOIN budgets b ON b.category_id = c.id AND b.period_id = p.id
        WHERE p.id = $${queryParams.length + 1}`;
      queryParams.push(periodId);

      if (grouperIdArray) {
        query += `
          AND g.id = ANY($${queryParams.length + 1}::int[])`;
        queryParams.push(grouperIdArray);
      }

      // Add budget payment method filter
      if (budgetPaymentMethodsArray && budgetPaymentMethodsArray.length > 0) {
        query += `
          AND b.payment_method = ANY($${queryParams.length + 1}::text[])`;
        queryParams.push(budgetPaymentMethodsArray);
      }

      query += `
        GROUP BY g.id, g.name, p.id, p.name
        ORDER BY g.name
      `;
    } else {
      // Query for all periods
      query = `
        SELECT
          g.id as grouper_id,
          g.name as grouper_name,
          p.id as period_id,
          p.name as period_name,
          COALESCE(SUM(b.expected_amount), 0) as total_budget
        FROM groupers g`;

      // Add estudio filtering join if estudioId is provided
      if (estudioId) {
        query += `
        INNER JOIN estudio_groupers eg ON eg.grouper_id = g.id
          AND eg.estudio_id = $${queryParams.length + 1}`;
        queryParams.push(parseInt(estudioId));
      }

      query += `
        CROSS JOIN periods p
        LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
        LEFT JOIN categories c ON c.id = gc.category_id
        LEFT JOIN budgets b ON b.category_id = c.id AND b.period_id = p.id
        WHERE 1=1`;

      if (grouperIdArray) {
        query += `
          AND g.id = ANY($${queryParams.length + 1}::int[])`;
        queryParams.push(grouperIdArray);
      }

      // Add budget payment method filter
      if (budgetPaymentMethodsArray && budgetPaymentMethodsArray.length > 0) {
        query += `
          AND b.payment_method = ANY($${queryParams.length + 1}::text[])`;
        queryParams.push(budgetPaymentMethodsArray);
      }

      query += `
        GROUP BY g.id, g.name, p.id, p.name
        ORDER BY g.name, p.year, p.month
      `;
    }

    const result = await sql.query(query, queryParams);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in groupers budgets API:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
