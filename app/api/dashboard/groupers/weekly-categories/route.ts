import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get("periodId");
    const weekStart = searchParams.get("weekStart");
    const weekEnd = searchParams.get("weekEnd");
    const paymentMethod = searchParams.get("paymentMethod"); // Legacy parameter for backward compatibility
    const expensePaymentMethods = searchParams.get("expensePaymentMethods");
    const grouperIdsParam = searchParams.get("grouperIds");
    const estudioId = searchParams.get("estudioId");

    // Validate required parameters
    if (!periodId) {
      return NextResponse.json(
        { error: "El parámetro periodId es requerido" },
        { status: 400 }
      );
    }

    if (!weekStart || !weekEnd) {
      return NextResponse.json(
        { error: "Los parámetros weekStart y weekEnd son requeridos" },
        { status: 400 }
      );
    }

    // Validate date format
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekEnd);
    if (isNaN(weekStartDate.getTime()) || isNaN(weekEndDate.getTime())) {
      return NextResponse.json(
        { error: "Formato de fecha inválido para weekStart o weekEnd" },
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

    // Parse and validate grouperIds parameter
    let grouperIds: number[] | null = null;
    if (grouperIdsParam) {
      try {
        grouperIds = grouperIdsParam.split(",").map((id) => {
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
              "Invalid grouperIds parameter. Must be comma-separated numbers.",
          },
          { status: 400 }
        );
      }
    }

    // Parse and validate payment method parameters
    let expensePaymentMethodsArray: string[] | null = null;

    // Handle expense payment methods (new parameter or legacy fallback)
    if (expensePaymentMethods) {
      try {
        expensePaymentMethodsArray = expensePaymentMethods
          .split(",")
          .map((method) => {
            const trimmed = method.trim();
            if (!["cash", "credit", "debit"].includes(trimmed)) {
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
    } else if (paymentMethod && paymentMethod !== "all") {
      // Legacy backward compatibility
      expensePaymentMethodsArray = [paymentMethod];
    }

    // Build the query based on parameters
    let queryParams: (string | number | string[] | number[])[] = [periodId, weekStart, weekEnd];
    let paramIndex = 4;

    // Build WHERE clause for grouper filtering
    let grouperFilter = "";
    if (grouperIds && grouperIds.length > 0) {
      grouperFilter = `AND g.id = ANY($${paramIndex}::int[])`;
      queryParams.push(grouperIds);
      paramIndex++;
    }

    // Build expense payment method filter
    let expensePaymentMethodFilter = "";
    if (expensePaymentMethodsArray && expensePaymentMethodsArray.length > 0) {
      expensePaymentMethodFilter = `AND e.payment_method = ANY($${paramIndex}::text[])`;
      queryParams.push(expensePaymentMethodsArray);
      paramIndex++;
    }

    // Construct the complete query
    const query = `
      WITH selected_week_expenses AS (
        SELECT 
          c.id as category_id,
          c.name as category_name,
          SUM(e.amount) as total_amount
        FROM expenses e
        JOIN categories c ON c.id = e.category_id
        JOIN grouper_categories gc ON gc.category_id = c.id
        JOIN groupers g ON g.id = gc.grouper_id`;

    // Add estudio filtering join if estudioId is provided
    let finalQuery = query;
    if (estudioId) {
      finalQuery += `
        INNER JOIN estudio_groupers eg ON eg.grouper_id = g.id
          AND eg.estudio_id = $${paramIndex}`;
      queryParams.push(parseInt(estudioId));
      paramIndex++;
    }

    finalQuery += `
        WHERE e.period_id = $1
          AND e.date >= $2 
          AND e.date <= $3
          ${expensePaymentMethodFilter}
          ${grouperFilter}
        GROUP BY c.id, c.name
        HAVING SUM(e.amount) > 0
      )
      SELECT 
        category_id,
        category_name,
        total_amount,
        ROUND((total_amount::numeric / NULLIF(SUM(total_amount) OVER(), 0)) * 100, 2) as percentage
      FROM selected_week_expenses
      ORDER BY total_amount DESC
    `;

    const result = await sql.query(finalQuery, queryParams);

    // Transform the result to match the expected format
    const structuredData = result.map((row: any) => ({
      category_id: row.category_id,
      category_name: row.category_name,
      total_amount: parseFloat(row.total_amount) || 0,
      percentage: parseFloat(row.percentage) || 0,
    }));

    return NextResponse.json(structuredData);
  } catch (error) {
    console.error("Error in weekly categories API:", error);

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