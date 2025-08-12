import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { CreateExpenseSchema, SOURCE_FUND_ERROR_MESSAGES } from "@/types/funds";
import { validateExpenseSourceFunds } from "@/lib/source-fund-validation";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fundFilter = searchParams.get("fund_id");

    let expenses;

    if (fundFilter) {
      // Filter expenses by fund (through source fund or category fund relationships)
      expenses = await sql`
        SELECT 
          e.id,
          e.category_id,
          e.period_id,
          e.payment_method,
          e.description,
          e.amount,
          e.event,
          e.date,
          e.source_fund_id,
          e.destination_fund_id,
          c.name as category_name,
          p.name as period_name,
          sf.name as source_fund_name,
          df.name as destination_fund_name
        FROM expenses e
        JOIN categories c ON e.category_id = c.id
        JOIN periods p ON e.period_id = p.id
        LEFT JOIN funds sf ON e.source_fund_id = sf.id
        LEFT JOIN funds df ON e.destination_fund_id = df.id
        WHERE e.source_fund_id = ${fundFilter}
           OR EXISTS (
             SELECT 1 FROM category_fund_relationships cfr 
             WHERE cfr.category_id = e.category_id AND cfr.fund_id = ${fundFilter}
           )
           OR c.fund_id = ${fundFilter}
        ORDER BY e.date DESC
      `;
    } else {
      // Get all expenses with fund information
      expenses = await sql`
        SELECT 
          e.id,
          e.category_id,
          e.period_id,
          e.payment_method,
          e.description,
          e.amount,
          e.event,
          e.date,
          e.source_fund_id,
          e.destination_fund_id,
          c.name as category_name,
          p.name as period_name,
          sf.name as source_fund_name,
          df.name as destination_fund_name
        FROM expenses e
        JOIN categories c ON e.category_id = c.id
        JOIN periods p ON e.period_id = p.id
        LEFT JOIN funds sf ON e.source_fund_id = sf.id
        LEFT JOIN funds df ON e.destination_fund_id = df.id
        ORDER BY e.date DESC
      `;
    }

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = CreateExpenseSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const {
      category_id,
      period_id,
      date,
      event,
      payment_method,
      description,
      amount,
      source_fund_id,
      destination_fund_id,
    } = validationResult.data;

    // Enhanced validation using the validation library
    const validation = await validateExpenseSourceFunds(
      category_id,
      source_fund_id,
      destination_fund_id,
      amount
    );

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn("Expense creation warnings:", validation.warnings);
    }

    // Standardize date to ensure consistency with Colombia timezone
    let dateToSave = date;

    // If it's an ISO string, ensure we use only the date part
    if (typeof date === "string" && date.includes("T")) {
      // Extract only the date part (YYYY-MM-DD)
      dateToSave = date.split("T")[0];
    }

    // Insert the expense
    const [newExpense] = await sql`
      INSERT INTO expenses (category_id, period_id, date, event, payment_method, description, amount, source_fund_id, destination_fund_id)
      VALUES (${category_id}, ${period_id}, ${dateToSave}, ${
      event || null
    }, ${payment_method}, ${description}, ${amount}, ${source_fund_id}, ${
      destination_fund_id || null
    })
      RETURNING *
    `;

    // Update fund balances
    // Decrease source fund balance
    await sql`
      UPDATE funds 
      SET current_balance = current_balance - ${amount}
      WHERE id = ${source_fund_id}
    `;

    // Increase destination fund balance if specified (fund transfer)
    if (destination_fund_id) {
      await sql`
        UPDATE funds 
        SET current_balance = current_balance + ${amount}
        WHERE id = ${destination_fund_id}
      `;
    }

    // Fetch the expense with fund information
    const [expenseWithFunds] = await sql`
      SELECT 
        e.*,
        c.name as category_name,
        p.name as period_name,
        sf.name as source_fund_name,
        df.name as destination_fund_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      JOIN periods p ON e.period_id = p.id
      JOIN funds sf ON e.source_fund_id = sf.id
      LEFT JOIN funds df ON e.destination_fund_id = df.id
      WHERE e.id = ${newExpense.id}
    `;

    return NextResponse.json(expenseWithFunds);
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
