import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params: routeParams }: { params: { id: string } }
) {
  try {
    const grouperId = parseInt(routeParams.id);
    const url = new URL(request.url);
    const periodId = url.searchParams.get("periodId");
    const paymentMethod = url.searchParams.get("paymentMethod");
    const includeBudgets = url.searchParams.get("includeBudgets") === "true";
    const projectionMode = url.searchParams.get("projectionMode") === "true";

    if (isNaN(grouperId) || !periodId) {
      return NextResponse.json(
        { error: "Valid grouperId and periodId are required" },
        { status: 400 }
      );
    }

    // Build SQL query with consistent JOIN structure
    // Use periodId as string (UUID) - no need to parse as integer
    let query: string;
    let queryParams: (string | number)[];

    if (includeBudgets) {
      // Query with budget data
      if (paymentMethod && paymentMethod !== "all") {
        // Query with payment method filter and budget data
        query = `
          SELECT 
            c.id as category_id, 
            c.name as category_name,
            COALESCE(SUM(e.amount), 0) as total_amount,
            COALESCE(b.expected_amount, 0) as budget_amount
          FROM 
            categories c
          JOIN grouper_categories gc ON c.id = gc.category_id
          LEFT JOIN expenses e ON c.id = e.category_id 
            AND e.period_id = $1
            AND e.payment_method = $2
          LEFT JOIN budgets b ON c.id = b.category_id 
            AND b.period_id = $1
          WHERE 
            gc.grouper_id = $3
          GROUP BY 
            c.id, 
            c.name,
            b.expected_amount
          ORDER BY 
            total_amount DESC
        `;
        queryParams = [periodId, paymentMethod, grouperId];
      } else {
        // Query without payment method filter but with budget data
        query = `
          SELECT 
            c.id as category_id, 
            c.name as category_name,
            COALESCE(SUM(e.amount), 0) as total_amount,
            COALESCE(b.expected_amount, 0) as budget_amount
          FROM 
            categories c
          JOIN grouper_categories gc ON c.id = gc.category_id
          LEFT JOIN expenses e ON c.id = e.category_id 
            AND e.period_id = $1
          LEFT JOIN budgets b ON c.id = b.category_id 
            AND b.period_id = $1
          WHERE 
            gc.grouper_id = $2
          GROUP BY 
            c.id, 
            c.name,
            b.expected_amount
          ORDER BY 
            total_amount DESC
        `;
        queryParams = [periodId, grouperId];
      }
    } else {
      // Original queries without budget data
      if (paymentMethod && paymentMethod !== "all") {
        // Query with payment method filter
        query = `
          SELECT 
            c.id as category_id, 
            c.name as category_name,
            COALESCE(SUM(e.amount), 0) as total_amount
          FROM 
            categories c
          JOIN grouper_categories gc ON c.id = gc.category_id
          LEFT JOIN expenses e ON c.id = e.category_id 
            AND e.period_id = $1
            AND e.payment_method = $2
          WHERE 
            gc.grouper_id = $3
          GROUP BY 
            c.id, 
            c.name
          ORDER BY 
            total_amount DESC
        `;
        queryParams = [periodId, paymentMethod, grouperId];
      } else {
        // Query without payment method filter
        query = `
          SELECT 
            c.id as category_id, 
            c.name as category_name,
            COALESCE(SUM(e.amount), 0) as total_amount
          FROM 
            categories c
          JOIN grouper_categories gc ON c.id = gc.category_id
          LEFT JOIN expenses e ON c.id = e.category_id 
            AND e.period_id = $1
          WHERE 
            gc.grouper_id = $2
          GROUP BY 
            c.id, 
            c.name
          ORDER BY 
            total_amount DESC
        `;
        queryParams = [periodId, grouperId];
      }
    }

    const categoryStats = await sql.query(query, queryParams);

    // Enhanced error handling for category projection mode
    if (projectionMode && includeBudgets) {
      // Check if any budget data exists for categories
      const hasBudgetData = categoryStats.some(
        (item) =>
          item.budget_amount !== null &&
          item.budget_amount !== undefined &&
          parseFloat(item.budget_amount.toString()) > 0
      );

      if (!hasBudgetData) {
        console.warn(
          `No budget data found for categories in grouper ${routeParams.id}`
        );
        // Return data with warning metadata instead of throwing error
        return NextResponse.json(categoryStats, {
          headers: {
            "X-Budget-Warning":
              "No budget data available for category projection",
          },
        });
      }

      // Check for partial budget data in categories
      const categoriesWithBudget = categoryStats.filter(
        (item) =>
          item.budget_amount !== null &&
          item.budget_amount !== undefined &&
          parseFloat(item.budget_amount.toString()) > 0
      );

      if (
        categoriesWithBudget.length < categoryStats.length &&
        categoriesWithBudget.length > 0
      ) {
        console.warn(
          `Partial budget data found for categories in grouper ${routeParams.id}`
        );
        return NextResponse.json(categoryStats, {
          headers: {
            "X-Budget-Warning":
              "Partial budget data available for category projection",
          },
        });
      }
    }

    return NextResponse.json(categoryStats);
  } catch (error) {
    console.error(
      `Error fetching category statistics for grouper ${routeParams.id}:`,
      error
    );

    // Enhanced error handling with projection context
    const errorMessage = (error as Error).message;
    const isProjectionError =
      projectionMode && errorMessage.toLowerCase().includes("budget");

    if (isProjectionError) {
      return NextResponse.json(
        {
          error: `Error loading category projection data for grouper ${routeParams.id}: ${errorMessage}`,
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
