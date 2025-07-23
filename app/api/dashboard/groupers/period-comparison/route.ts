import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentMethod = searchParams.get("paymentMethod");

    // Validate payment method parameter
    if (
      paymentMethod &&
      !["all", "cash", "credit", "debit"].includes(paymentMethod)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payment method. Must be one of: all, cash, credit, debit",
        },
        { status: 400 }
      );
    }

    let query: string;
    let queryParams: string[] = [];

    if (paymentMethod && paymentMethod !== "all") {
      // Query with payment method filter
      query = `
        SELECT
          p.id as period_id,
          p.name as period_name,
          p.month as period_month,
          p.year as period_year,
          g.id as grouper_id,
          g.name as grouper_name,
          COALESCE(SUM(e.amount), 0) as total_amount
        FROM periods p
        CROSS JOIN groupers g
        LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
        LEFT JOIN categories c ON c.id = gc.category_id
        LEFT JOIN expenses e ON e.category_id = c.id
          AND e.period_id = p.id
          AND e.payment_method = $1
        GROUP BY p.id, p.name, p.month, p.year, g.id, g.name
        ORDER BY p.year, p.month, g.name
      `;
      queryParams = [paymentMethod];
    } else {
      // Query without payment method filter
      query = `
        SELECT
          p.id as period_id,
          p.name as period_name,
          p.month as period_month,
          p.year as period_year,
          g.id as grouper_id,
          g.name as grouper_name,
          COALESCE(SUM(e.amount), 0) as total_amount
        FROM periods p
        CROSS JOIN groupers g
        LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
        LEFT JOIN categories c ON c.id = gc.category_id
        LEFT JOIN expenses e ON e.category_id = c.id
          AND e.period_id = p.id
        GROUP BY p.id, p.name, p.month, p.year, g.id, g.name
        ORDER BY p.year, p.month, g.name
      `;
    }

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

      periodMap.get(periodKey).grouper_data.push({
        grouper_id: row.grouper_id,
        grouper_name: row.grouper_name,
        total_amount: parseFloat(row.total_amount) || 0,
      });
    });

    const structuredData = Array.from(periodMap.values());

    return NextResponse.json(structuredData);
  } catch (error) {
    console.error("Error in period comparison API:", error);

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
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
