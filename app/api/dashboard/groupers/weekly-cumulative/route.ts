import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');
    const paymentMethod = searchParams.get('paymentMethod'); // Legacy parameter for backward compatibility
    const expensePaymentMethods = searchParams.get('expensePaymentMethods');
    const budgetPaymentMethods = searchParams.get('budgetPaymentMethods');
    const grouperIdsParam = searchParams.get('grouperIds');
    const estudioId = searchParams.get('estudioId');
    const includeBudgets = searchParams.get('includeBudgets') === 'true';

    // Validate required periodId parameter
    if (!periodId) {
      return NextResponse.json(
        { error: 'El parámetro periodId es requerido' },
        { status: 400 }
      );
    }

    // Validate payment method parameter
    if (
      paymentMethod &&
      !['all', 'cash', 'credit', 'debit'].includes(paymentMethod)
    ) {
      return NextResponse.json(
        {
          error:
            'Método de pago inválido. Debe ser uno de: all, cash, credit, debit',
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
            error: `Invalid expensePaymentMethods parameter: ${
              (error as Error).message
            }`,
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
            error: `Invalid budgetPaymentMethods parameter: ${
              (error as Error).message
            }`,
          },
          { status: 400 }
        );
      }
    }

    // Build the query based on parameters
    let query: string;
    let queryParams: (string | number | string[] | number[])[] = [periodId];
    let paramIndex = 2;

    // Build WHERE clause for grouper filtering
    let grouperFilter = '';
    if (grouperIds && grouperIds.length > 0) {
      grouperFilter = `AND g.id = ANY($${paramIndex}::int[])`;
      queryParams.push(grouperIds);
      paramIndex++;
    }

    // Build expense payment method filter
    let expensePaymentMethodFilter = '';
    if (expensePaymentMethodsArray && expensePaymentMethodsArray.length > 0) {
      expensePaymentMethodFilter = `AND e.payment_method = ANY($${paramIndex}::text[])`;
      queryParams.push(expensePaymentMethodsArray);
      paramIndex++;
    }

    // Build budget payment method filter
    let budgetPaymentMethodFilter = '';
    if (
      includeBudgets &&
      budgetPaymentMethodsArray &&
      budgetPaymentMethodsArray.length > 0
    ) {
      budgetPaymentMethodFilter = `AND b.payment_method = ANY($${paramIndex}::text[])`;
      queryParams.push(budgetPaymentMethodsArray);
      paramIndex++;
    }

    // Build budget join and select if requested
    const budgetJoin = includeBudgets
      ? `LEFT JOIN budgets b ON b.category_id = c.id AND b.period_id = $1${budgetPaymentMethodFilter}`
      : '';

    const budgetSelect = includeBudgets
      ? `, COALESCE(SUM(b.expected_amount), 0) as weekly_budget_amount`
      : '';

    // Construct the complete query
    query = `
      WITH period_info AS (
        SELECT 
          p.year,
          p.month,
          make_date(p.year, p.month, 1) as period_start,
          (make_date(p.year, p.month, 1) + interval '1 month' - interval '1 day')::date as period_end
        FROM periods p 
        WHERE p.id = $1
      ),
      expense_date_range AS (
        SELECT
          pi.period_start,
          pi.period_end,
          COALESCE(MIN(e.date), pi.period_start) as actual_start,
          COALESCE(MAX(e.date), pi.period_end) as actual_end
        FROM period_info pi
        LEFT JOIN expenses e ON e.period_id = $1
        LEFT JOIN categories c ON c.id = e.category_id
        LEFT JOIN grouper_categories gc ON gc.category_id = c.id
        LEFT JOIN groupers g ON g.id = gc.grouper_id
        WHERE 1=1
          ${grouperFilter.replace('g.id', 'g.id')}
          ${expensePaymentMethodFilter.replace('e.payment_method', 'e.payment_method')}
        GROUP BY pi.period_start, pi.period_end
      ),
      week_boundaries AS (
        SELECT
          -- Adjust to Sunday start: date_trunc('week', date + interval '1 day') - interval '1 day'
          (date_trunc('week', generate_series(
            -- Start from the Sunday of the week containing the first expense
            (date_trunc('week', edr.actual_start + interval '1 day') - interval '1 day')::date,
            -- End at the Saturday of the week containing the last expense
            (date_trunc('week', edr.actual_end + interval '1 day') - interval '1 day' + interval '6 days')::date,
            '1 week'::interval
          ) + interval '1 day') - interval '1 day')::date as week_start
        FROM expense_date_range edr
      ),
      week_ranges AS (
        SELECT
          wb.week_start,
          (wb.week_start + interval '6 days')::date as week_end
        FROM week_boundaries wb
      ),
      weekly_expenses AS (
        SELECT
          wr.week_start,
          wr.week_end,
          g.id as grouper_id,
          g.name as grouper_name,
          COALESCE(SUM(e.amount), 0) as weekly_amount${budgetSelect}
        FROM week_ranges wr
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
          AND e.period_id = $1
          AND e.date >= wr.week_start
          AND e.date <= wr.week_end
          ${expensePaymentMethodFilter}
        ${budgetJoin}
        WHERE 1=1
          ${grouperFilter}
        GROUP BY wr.week_start, wr.week_end, g.id, g.name
      )
      SELECT
        week_start,
        week_end,
        grouper_id,
        grouper_name,
        SUM(weekly_amount) OVER (
          PARTITION BY grouper_id
          ORDER BY week_start
          ROWS UNBOUNDED PRECEDING
        ) as cumulative_amount${
          includeBudgets
            ? `,
        SUM(weekly_budget_amount) OVER (
          PARTITION BY grouper_id
          ORDER BY week_start
          ROWS UNBOUNDED PRECEDING
        ) as cumulative_budget_amount`
            : ''
        }
      FROM weekly_expenses
      ORDER BY week_start, grouper_name
    `;

    const result = await sql.query(query, queryParams);

    // Transform the flat result into the structured format specified in the design
    const weekMap = new Map();

    result.forEach((row: any) => {
      const weekStart = row.week_start;
      const weekEnd = row.week_end;
      const weekKey = `${weekStart}_${weekEnd}`;

      if (!weekMap.has(weekKey)) {
        // Format week label as "Semana del DD/MM - DD/MM"
        const startDate = new Date(weekStart);
        const endDate = new Date(weekEnd);

        const formatDate = (date: Date) => {
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          return `${day}/${month}`;
        };

        const weekLabel = `Semana del ${formatDate(startDate)} - ${formatDate(
          endDate
        )}`;

        weekMap.set(weekKey, {
          week_start: weekStart,
          week_end: weekEnd,
          week_label: weekLabel,
          grouper_data: [],
        });
      }

      const grouperData: any = {
        grouper_id: row.grouper_id,
        grouper_name: row.grouper_name,
        cumulative_amount: parseFloat(row.cumulative_amount) || 0,
      };

      // Add budget data if requested
      if (includeBudgets) {
        grouperData.cumulative_budget_amount =
          parseFloat(row.cumulative_budget_amount) || 0;
      }

      weekMap.get(weekKey).grouper_data.push(grouperData);
    });

    const structuredData = Array.from(weekMap.values());

    return NextResponse.json(structuredData);
  } catch (error) {
    console.error('Error in weekly cumulative API:', error);

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
      } else if (error.message.includes('does not exist')) {
        errorMessage = 'El período especificado no existe';
        statusCode = 404;
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
