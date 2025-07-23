import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get("periodId");
    const paymentMethod = searchParams.get("paymentMethod");

    // Validate required periodId parameter
    if (!periodId) {
      return NextResponse.json(
        { error: "El parámetro periodId es requerido" },
        { status: 400 }
      );
    }

    // Validate payment method parameter
    if (
      paymentMethod &&
      !["all", "cash", "credit", "debit"].includes(paymentMethod)
    ) {
      return NextResponse.json(
        {
          error:
            "Método de pago inválido. Debe ser uno de: all, cash, credit, debit",
        },
        { status: 400 }
      );
    }

    let query: string;
    let queryParams: string[] = [periodId];

    if (paymentMethod && paymentMethod !== "all") {
      // Query with payment method filter
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
        week_boundaries AS (
          SELECT
            -- Adjust to Sunday start: date_trunc('week', date + interval '1 day') - interval '1 day'
            (date_trunc('week', generate_series(
              pi.period_start,
              LEAST(pi.period_end, CURRENT_DATE),
              '1 week'::interval
            ) + interval '1 day') - interval '1 day')::date as week_start
          FROM period_info pi
        ),
        week_ranges AS (
          SELECT
            wb.week_start,
            LEAST(wb.week_start + interval '6 days', CURRENT_DATE)::date as week_end
          FROM week_boundaries wb
        ),
        weekly_expenses AS (
          SELECT
            wr.week_start,
            wr.week_end,
            g.id as grouper_id,
            g.name as grouper_name,
            COALESCE(SUM(e.amount), 0) as weekly_amount
          FROM week_ranges wr
          CROSS JOIN groupers g
          LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
          LEFT JOIN categories c ON c.id = gc.category_id
          LEFT JOIN expenses e ON e.category_id = c.id
            AND e.period_id = $1
            AND e.date >= wr.week_start
            AND e.date <= wr.week_end
            AND e.payment_method = $2
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
          ) as cumulative_amount
        FROM weekly_expenses
        ORDER BY week_start, grouper_name
      `;
      queryParams.push(paymentMethod);
    } else {
      // Query without payment method filter
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
        week_boundaries AS (
          SELECT
            -- Adjust to Sunday start: date_trunc('week', date + interval '1 day') - interval '1 day'
            (date_trunc('week', generate_series(
              pi.period_start,
              LEAST(pi.period_end, CURRENT_DATE),
              '1 week'::interval
            ) + interval '1 day') - interval '1 day')::date as week_start
          FROM period_info pi
        ),
        week_ranges AS (
          SELECT
            wb.week_start,
            LEAST(wb.week_start + interval '6 days', CURRENT_DATE)::date as week_end
          FROM week_boundaries wb
        ),
        weekly_expenses AS (
          SELECT
            wr.week_start,
            wr.week_end,
            g.id as grouper_id,
            g.name as grouper_name,
            COALESCE(SUM(e.amount), 0) as weekly_amount
          FROM week_ranges wr
          CROSS JOIN groupers g
          LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
          LEFT JOIN categories c ON c.id = gc.category_id
          LEFT JOIN expenses e ON e.category_id = c.id
            AND e.period_id = $1
            AND e.date >= wr.week_start
            AND e.date <= wr.week_end
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
          ) as cumulative_amount
        FROM weekly_expenses
        ORDER BY week_start, grouper_name
      `;
    }

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
          const day = date.getDate().toString().padStart(2, "0");
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
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

      weekMap.get(weekKey).grouper_data.push({
        grouper_id: row.grouper_id,
        grouper_name: row.grouper_name,
        cumulative_amount: parseFloat(row.cumulative_amount) || 0,
      });
    });

    const structuredData = Array.from(weekMap.values());

    return NextResponse.json(structuredData);
  } catch (error) {
    console.error("Error in weekly cumulative API:", error);

    // Provide more specific error messages
    let errorMessage = "Error interno del servidor";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes("connection")) {
        errorMessage = "Error de conexión a la base de datos";
      } else if (error.message.includes("syntax")) {
        errorMessage = "Error en la consulta de datos";
      } else if (error.message.includes("timeout")) {
        errorMessage = "La consulta tardó demasiado tiempo";
      } else if (error.message.includes("does not exist")) {
        errorMessage = "El período especificado no existe";
        statusCode = 404;
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
