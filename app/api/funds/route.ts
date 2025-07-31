import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { CreateFundSchema, FUND_ERROR_MESSAGES } from "@/types/funds";

export async function GET() {
  try {
    // Get all funds with calculated current balances
    const funds = await sql`
      SELECT 
        f.id,
        f.name,
        f.description,
        f.initial_balance,
        f.start_date,
        f.created_at,
        f.updated_at,
        COALESCE(
          f.initial_balance + 
          COALESCE(income_totals.total, 0) + 
          COALESCE(transfer_in_totals.total, 0) - 
          COALESCE(expense_totals.total, 0),
          f.initial_balance
        ) as current_balance
      FROM funds f
      LEFT JOIN (
        SELECT 
          fund_id,
          SUM(amount) as total
        FROM incomes i
        WHERE fund_id IS NOT NULL
        GROUP BY fund_id
      ) income_totals ON f.id = income_totals.fund_id
      LEFT JOIN (
        SELECT 
          destination_fund_id as fund_id,
          SUM(amount) as total
        FROM expenses e
        WHERE destination_fund_id IS NOT NULL
        GROUP BY destination_fund_id
      ) transfer_in_totals ON f.id = transfer_in_totals.fund_id
      LEFT JOIN (
        SELECT 
          c.fund_id,
          SUM(e.amount) as total
        FROM expenses e
        JOIN categories c ON e.category_id = c.id
        WHERE c.fund_id IS NOT NULL
        GROUP BY c.fund_id
      ) expense_totals ON f.id = expense_totals.fund_id
      ORDER BY f.name
    `;

    return NextResponse.json(funds);
  } catch (error) {
    console.error("Error fetching funds:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    const validationResult = CreateFundSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, description, initial_balance, start_date } =
      validationResult.data;

    // Check if fund name already exists
    const existingFund = await sql`
      SELECT id FROM funds WHERE name = ${name}
    `;

    if (existingFund.length > 0) {
      return NextResponse.json(
        { error: FUND_ERROR_MESSAGES.FUND_NAME_DUPLICATE },
        { status: 409 }
      );
    }

    // Validate start date is not in the future
    const startDateObj = new Date(start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDateObj > today) {
      return NextResponse.json(
        { error: FUND_ERROR_MESSAGES.FUND_START_DATE_FUTURE },
        { status: 400 }
      );
    }

    // Create the new fund
    const [newFund] = await sql`
      INSERT INTO funds (name, description, initial_balance, current_balance, start_date)
      VALUES (${name}, ${
      description || null
    }, ${initial_balance}, ${initial_balance}, ${start_date})
      RETURNING *
    `;

    return NextResponse.json(newFund, { status: 201 });
  } catch (error) {
    console.error("Error creating fund:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
