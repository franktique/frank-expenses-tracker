import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get("periodId");
    const paymentMethod = searchParams.get("paymentMethod"); // Legacy parameter for backward compatibility
    const expensePaymentMethods = searchParams.get("expensePaymentMethods");
    const budgetPaymentMethods = searchParams.get("budgetPaymentMethods");
    const grouperIds = searchParams.get("grouperIds");
    const estudioId = searchParams.get("estudioId");
    const includeBudgets = searchParams.get("includeBudgets") === "true";
    const projectionMode = searchParams.get("projectionMode") === "true";

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

    // Parse and validate payment method parameters
    let expensePaymentMethodsArray: string[] | null = null;
    let budgetPaymentMethodsArray: string[] | null = null;

    // Handle expense payment methods (new parameter or legacy fallback)
    if (expensePaymentMethods) {
      try {
        expensePaymentMethodsArray = expensePaymentMethods.split(",").map((method) => {
          const trimmed = method.trim();
          if (!["cash", "credit", "debit"].includes(trimmed)) {
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
    } else if (paymentMethod && paymentMethod !== "all") {
      // Legacy backward compatibility
      expensePaymentMethodsArray = [paymentMethod];
    }

    // Handle budget payment methods
    if (budgetPaymentMethods) {
      try {
        budgetPaymentMethodsArray = budgetPaymentMethods.split(",").map((method) => {
          const trimmed = method.trim();
          if (!["cash", "credit", "debit"].includes(trimmed)) {
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
      FROM groupers g`;

    // Add estudio filtering join if estudioId is provided
    if (estudioId) {
      fromClause += `
      INNER JOIN estudio_groupers eg ON eg.grouper_id = g.id
        AND eg.estudio_id = $${paramIndex}`;
      queryParams.push(parseInt(estudioId));
      paramIndex++;
    }

    fromClause += `
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

    // Add expense payment method filter
    if (expensePaymentMethodsArray && expensePaymentMethodsArray.length > 0) {
      fromClause += `
        AND e.payment_method = ANY($${paramIndex}::text[])`;
      queryParams.push(expensePaymentMethodsArray);
      paramIndex++;
    }

    // Add budget payment method filter
    if (includeBudgets && budgetPaymentMethodsArray && budgetPaymentMethodsArray.length > 0) {
      fromClause += `
        AND b.payment_method = ANY($${paramIndex}::text[])`;
      queryParams.push(budgetPaymentMethodsArray);
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

    // Enhanced error handling for projection mode
    if (projectionMode && includeBudgets) {
      // Check if any budget data exists
      const hasBudgetData = result.some(
        (item) =>
          item.budget_amount !== null &&
          item.budget_amount !== undefined &&
          parseFloat(item.budget_amount.toString()) > 0
      );

      if (!hasBudgetData) {
        console.warn("No budget data found for projection mode");
        // Return data with warning metadata instead of throwing error
        return NextResponse.json(result, {
          headers: {
            "X-Budget-Warning": "No budget data available for projection",
          },
        });
      }

      // Check for partial budget data
      const itemsWithBudget = result.filter(
        (item) =>
          item.budget_amount !== null &&
          item.budget_amount !== undefined &&
          parseFloat(item.budget_amount.toString()) > 0
      );

      if (
        itemsWithBudget.length < result.length &&
        itemsWithBudget.length > 0
      ) {
        console.warn("Partial budget data found for projection mode");
        return NextResponse.json(result, {
          headers: {
            "X-Budget-Warning": "Partial budget data available for projection",
          },
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in groupers API:", error);

    // Enhanced error handling with context
    const errorMessage = (error as Error).message;
    const isProjectionError =
      projectionMode && errorMessage.toLowerCase().includes("budget");

    if (isProjectionError) {
      return NextResponse.json(
        {
          error: "Error loading projection data: " + errorMessage,
          projectionError: true,
          fallbackSuggested: true,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
