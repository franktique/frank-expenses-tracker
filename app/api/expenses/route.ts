import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { CreateExpenseSchema } from "@/types/funds";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fundFilter = searchParams.get("fund_id");

    let expenses;

    if (fundFilter) {
      // Filter expenses by fund (through category fund assignment)
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
          e.destination_fund_id,
          c.name as category_name,
          c.fund_id as category_fund_id,
          p.name as period_name,
          cf.name as category_fund_name,
          df.name as destination_fund_name
        FROM expenses e
        JOIN categories c ON e.category_id = c.id
        JOIN periods p ON e.period_id = p.id
        LEFT JOIN funds cf ON c.fund_id = cf.id
        LEFT JOIN funds df ON e.destination_fund_id = df.id
        WHERE c.fund_id = ${fundFilter}
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
          e.destination_fund_id,
          c.name as category_name,
          c.fund_id as category_fund_id,
          p.name as period_name,
          cf.name as category_fund_name,
          df.name as destination_fund_name
        FROM expenses e
        JOIN categories c ON e.category_id = c.id
        JOIN periods p ON e.period_id = p.id
        LEFT JOIN funds cf ON c.fund_id = cf.id
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
      destination_fund_id,
    } = validationResult.data;

    // Validate that category exists and get its fund
    const [category] = await sql`
      SELECT c.*, f.id as fund_id, f.name as fund_name
      FROM categories c
      LEFT JOIN funds f ON c.fund_id = f.id
      WHERE c.id = ${category_id}
    `;

    if (!category) {
      return NextResponse.json(
        { error: "La categoría especificada no existe" },
        { status: 400 }
      );
    }

    // If destination_fund_id is provided, validate it exists and is different from source fund
    if (destination_fund_id) {
      const [destinationFund] =
        await sql`SELECT id FROM funds WHERE id = ${destination_fund_id}`;
      if (!destinationFund) {
        return NextResponse.json(
          { error: "El fondo de destino especificado no existe" },
          { status: 400 }
        );
      }

      // Prevent transfer to the same fund
      if (category.fund_id === destination_fund_id) {
        return NextResponse.json(
          { error: "No se puede transferir dinero al mismo fondo" },
          { status: 400 }
        );
      }
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
      INSERT INTO expenses (category_id, period_id, date, event, payment_method, description, amount, destination_fund_id)
      VALUES (${category_id}, ${period_id}, ${dateToSave}, ${
      event || null
    }, ${payment_method}, ${description}, ${amount}, ${
      destination_fund_id || null
    })
      RETURNING *
    `;

    // Update fund balances
    // Decrease source fund balance (category's fund)
    if (category.fund_id) {
      await sql`
        UPDATE funds 
        SET current_balance = current_balance - ${amount}
        WHERE id = ${category.fund_id}
      `;
    }

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
        c.fund_id as category_fund_id,
        p.name as period_name,
        cf.name as category_fund_name,
        df.name as destination_fund_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      JOIN periods p ON e.period_id = p.id
      LEFT JOIN funds cf ON c.fund_id = cf.id
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
