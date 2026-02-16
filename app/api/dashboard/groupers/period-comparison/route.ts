import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentMethod = searchParams.get('paymentMethod'); // Legacy parameter for backward compatibility
    const expensePaymentMethods = searchParams.get('expensePaymentMethods');
    const budgetPaymentMethods = searchParams.get('budgetPaymentMethods');
    const grouperIdsParam = searchParams.get('grouperIds');
    const estudioId = searchParams.get('estudioId');
    const includeBudgets = searchParams.get('includeBudgets') === 'true';

    // Validate payment method parameter
    if (
      paymentMethod &&
      !['all', 'cash', 'credit', 'debit'].includes(paymentMethod)
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid payment method. Must be one of: all, cash, credit, debit',
        },
        { status: 400 }
      );
    }

    // Parse and validate grouperIds parameter
    let grouperIds: number[] | null = null;
    if (grouperIdsParam) {
      try {
        grouperIds = grouperIdsParam.split(',').map((id) => {
          const parsed = parseInt(id.trim());
          if (isNaN(parsed)) {
            throw new Error(`Invalid grouper ID: ${id}`);
          }
          return parsed;
        });
      } catch (error) {
        return NextResponse.json(
          {
            error:
              'Invalid grouperIds parameter. Must be comma-separated numbers.',
          },
          { status: 400 }
        );
      }
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

    // Build the SQL query with dynamic conditions
    let query: string;
    let queryParams: any[] = [];
    let paramIndex = 1;

    // Build budget join with payment method filter
    let budgetJoin = '';
    if (includeBudgets) {
      budgetJoin = `LEFT JOIN budgets b ON b.category_id = c.id AND b.period_id = p.id`;
      if (budgetPaymentMethodsArray && budgetPaymentMethodsArray.length > 0) {
        budgetJoin += ` AND b.payment_method = ANY($${paramIndex}::text[])`;
        queryParams.push(budgetPaymentMethodsArray);
        paramIndex++;
      }
    }

    const budgetSelect = includeBudgets
      ? `, COALESCE(SUM(b.expected_amount), 0) as budget_amount`
      : '';

    query = `
      SELECT
        p.id as period_id,
        p.name as period_name,
        p.month as period_month,
        p.year as period_year,
        g.id as grouper_id,
        g.name as grouper_name,
        COALESCE(SUM(e.amount), 0) as total_amount${budgetSelect}
      FROM periods p
      CROSS JOIN groupers g`;

    // Add estudio filtering join if estudioId is provided
    if (estudioId) {
      query += `
      INNER JOIN estudio_groupers eg ON eg.grouper_id = g.id
        AND eg.estudio_id = $${paramIndex}`;
      queryParams.push(parseInt(estudioId));
      paramIndex++;
    }

    query += `
      LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
      LEFT JOIN categories c ON c.id = gc.category_id
      LEFT JOIN expenses e ON e.category_id = c.id
        AND e.period_id = p.id`;

    // Add expense payment method filter
    if (expensePaymentMethodsArray && expensePaymentMethodsArray.length > 0) {
      query += ` AND e.payment_method = ANY($${paramIndex}::text[])`;
      queryParams.push(expensePaymentMethodsArray);
      paramIndex++;
    }

    query += `
      ${budgetJoin}
      WHERE 1=1
    `;

    // Add grouper filtering if specified
    if (grouperIds && grouperIds.length > 0) {
      query += ` AND g.id = ANY($${paramIndex}::int[])`;
      queryParams.push(grouperIds);
      paramIndex++;
    }

    query += `
      GROUP BY p.id, p.name, p.month, p.year, g.id, g.name
      ORDER BY p.year, p.month, g.name
    `;

    const result = await sql.query(query, queryParams);

    // Transform the flat result into the structured format specified in the design
    const periodMap = new Map();

    result.forEach((row: any) => {
      const periodKey = row.period_id;

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          period_id: row.period_id,
          period_name: row.period_name,
          period_month: row.period_month,
          period_year: row.period_year,
          grouper_data: [],
        });
      }

      const grouperData: any = {
        grouper_id: row.grouper_id,
        grouper_name: row.grouper_name,
        total_amount: parseFloat(row.total_amount) || 0,
      };

      // Add budget data if requested
      if (includeBudgets) {
        grouperData.budget_amount = parseFloat(row.budget_amount) || 0;
      }

      periodMap.get(periodKey).grouper_data.push(grouperData);
    });

    const structuredData = Array.from(periodMap.values());

    return NextResponse.json(structuredData);
  } catch (error) {
    console.error('Error in period comparison API:', error);

    // Provide more specific error messages
    let errorMessage = 'Error interno del servidor';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('connection')) {
        errorMessage = 'Error de conexión a la base de datos';
      } else if (error.message.includes('syntax')) {
        errorMessage = 'Error en la consulta de datos';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'La consulta tardó demasiado tiempo';
      } else if (error.message.includes('Invalid grouper ID')) {
        errorMessage = error.message;
        statusCode = 400;
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
