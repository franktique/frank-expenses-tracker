import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get("periodId");
    const paymentMethod = searchParams.get("paymentMethod");

    if (!periodId) {
      return NextResponse.json(
        { error: "Period ID is required" },
        { status: 400 }
      );
    }

    let query: string;
    let queryParams: (string | number)[];

    if (paymentMethod && paymentMethod !== "all") {
      // Query with payment method filter
      query = `
        SELECT 
          g.id as grouper_id,
          g.name as grouper_name,
          COALESCE(SUM(e.amount), 0) as total_amount
        FROM groupers g
        LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
        LEFT JOIN categories c ON c.id = gc.category_id
        LEFT JOIN expenses e ON e.category_id = c.id 
          AND e.period_id = $1
          AND e.payment_method = $2
        GROUP BY g.id, g.name 
        ORDER BY g.name
      `;
      queryParams = [periodId, paymentMethod];
    } else {
      // Query without payment method filter
      query = `
        SELECT 
          g.id as grouper_id,
          g.name as grouper_name,
          COALESCE(SUM(e.amount), 0) as total_amount
        FROM groupers g
        LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
        LEFT JOIN categories c ON c.id = gc.category_id
        LEFT JOIN expenses e ON e.category_id = c.id 
          AND e.period_id = $1
        GROUP BY g.id, g.name 
        ORDER BY g.name
      `;
      queryParams = [periodId];
    }

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
