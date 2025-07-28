import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get("periodId");
    const grouperIds = searchParams.get("grouperIds");

    // Parse grouperIds if provided
    let grouperIdArray: number[] | null = null;
    if (grouperIds) {
      try {
        grouperIdArray = grouperIds.split(",").map((id) => {
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

    // Validate periodId if provided (it should be a valid UUID string)
    if (periodId && typeof periodId !== "string") {
      return NextResponse.json(
        { error: "Invalid periodId parameter" },
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
        FROM groupers g
        CROSS JOIN periods p
        LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
        LEFT JOIN categories c ON c.id = gc.category_id
        LEFT JOIN budgets b ON b.category_id = c.id AND b.period_id = p.id
        WHERE p.id = $1
          AND ($2::int[] IS NULL OR g.id = ANY($2::int[]))
        GROUP BY g.id, g.name, p.id, p.name
        ORDER BY g.name
      `;
      queryParams = [periodId, grouperIdArray];
    } else {
      // Query for all periods
      query = `
        SELECT
          g.id as grouper_id,
          g.name as grouper_name,
          p.id as period_id,
          p.name as period_name,
          COALESCE(SUM(b.expected_amount), 0) as total_budget
        FROM groupers g
        CROSS JOIN periods p
        LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
        LEFT JOIN categories c ON c.id = gc.category_id
        LEFT JOIN budgets b ON b.category_id = c.id AND b.period_id = p.id
        WHERE ($1::int[] IS NULL OR g.id = ANY($1::int[]))
        GROUP BY g.id, g.name, p.id, p.name
        ORDER BY g.name, p.year, p.month
      `;
      queryParams = [grouperIdArray];
    }

    const result = await sql.query(query, queryParams);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in groupers budgets API:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
