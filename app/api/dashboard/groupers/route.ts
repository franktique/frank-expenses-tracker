import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get("periodId");
    const paymentMethod = searchParams.get("paymentMethod");
    const grouperIds = searchParams.get("grouperIds");
    const includeBudgets = searchParams.get("includeBudgets") === "true";

    if (!periodId) {
      return NextResponse.json(
        { error: "Period ID is required" },
        { status: 400 }
      );
    }

    // Parse grouperIds if provided
    let grouperIdsArray: number[] | null = null;
    if (grouperIds) {
      try {
        grouperIdsArray = grouperIds.split(",").map((id) => {
          const parsed = parseInt(id.trim(), 10);
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

    // Build the query based on parameters
    let query: string;
    let queryParams: (string | number | number[])[] = [periodId];
    let paramIndex = 2;

    // Base SELECT clause
    let selectClause = `
      SELECT 
        g.id as grouper_id,
        g.name as grouper_name,
        COALESCE(SUM(e.amount), 0) as total_amount`;

    // Add budget column if requested
    if (includeBudgets) {
      selectClause += `,
        COALESCE(SUM(b.expected_amount), 0) as budget_amount`;
    }

    // Base FROM and JOIN clauses
    let fromClause = `
      FROM groupers g
      LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
      LEFT JOIN categories c ON c.id = gc.category_id
      LEFT JOIN expenses e ON e.category_id = c.id 
        AND e.period_id = $1`;

    // Add budget join if requested
    if (includeBudgets) {
      fromClause += `
      LEFT JOIN budgets b ON b.category_id = c.id
        AND b.period_id = $1`;
    }

    // Add payment method filter
    if (paymentMethod && paymentMethod !== "all") {
      fromClause += `
        AND e.payment_method = $${paramIndex}`;
      queryParams.push(paymentMethod);
      paramIndex++;
    }

    // Add WHERE clause for grouper filtering
    let whereClause = "";
    if (grouperIdsArray && grouperIdsArray.length > 0) {
      whereClause = `
      WHERE g.id = ANY($${paramIndex}::int[])`;
      queryParams.push(grouperIdsArray);
      paramIndex++;
    }

    // GROUP BY and ORDER BY clauses
    const groupByClause = `
      GROUP BY g.id, g.name 
      ORDER BY g.name`;

    // Combine all parts
    query = selectClause + fromClause + whereClause + groupByClause;

    const result = await sql.query(query, queryParams);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in groupers API:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
