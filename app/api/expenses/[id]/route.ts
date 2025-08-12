import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { UpdateExpenseSchema, SOURCE_FUND_ERROR_MESSAGES } from "@/types/funds";
import { validateSourceFundUpdate } from "@/lib/source-fund-validation";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const [expense] = await sql`
      SELECT 
        e.*,
        c.name as category_name,
        p.name as period_name,
        sf.name as source_fund_name,
        df.name as destination_fund_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      JOIN periods p ON e.period_id = p.id
      LEFT JOIN funds sf ON e.source_fund_id = sf.id
      LEFT JOIN funds df ON e.destination_fund_id = df.id
      WHERE e.id = ${id}
    `;

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();

    // Validate request body
    const validationResult = UpdateExpenseSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Get existing expense to calculate balance changes
    const [existingExpense] = await sql`
      SELECT e.*
      FROM expenses e
      WHERE e.id = ${id}
    `;

    if (!existingExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    let {
      category_id,
      date,
      event,
      payment_method,
      description,
      amount,
      source_fund_id,
      destination_fund_id,
    } = validationResult.data;

    // Use existing values if not provided
    category_id = category_id || existingExpense.category_id;
    date = date || existingExpense.date;
    event = event !== undefined ? event : existingExpense.event;
    payment_method = payment_method || existingExpense.payment_method;
    description = description || existingExpense.description;
    amount = amount !== undefined ? amount : existingExpense.amount;
    source_fund_id = source_fund_id || existingExpense.source_fund_id;
    destination_fund_id =
      destination_fund_id !== undefined
        ? destination_fund_id
        : existingExpense.destination_fund_id;

    // Enhanced validation for expense updates
    const validation = await validateSourceFundUpdate(
      id,
      category_id !== existingExpense.category_id ? category_id : undefined,
      source_fund_id !== existingExpense.source_fund_id
        ? source_fund_id
        : undefined,
      destination_fund_id !== existingExpense.destination_fund_id
        ? destination_fund_id
        : undefined,
      amount !== existingExpense.amount ? amount : undefined
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
      console.warn("Expense update warnings:", validation.warnings);
    }

    // Revert old fund balance changes
    const oldSourceFundId = existingExpense.source_fund_id;
    const oldDestinationFundId = existingExpense.destination_fund_id;
    const oldAmount = existingExpense.amount;

    // Revert old source fund balance (add back the amount)
    if (oldSourceFundId) {
      await sql`
        UPDATE funds 
        SET current_balance = current_balance + ${oldAmount}
        WHERE id = ${oldSourceFundId}
      `;
    }

    // Revert old destination fund balance (subtract the amount)
    if (oldDestinationFundId) {
      await sql`
        UPDATE funds 
        SET current_balance = current_balance - ${oldAmount}
        WHERE id = ${oldDestinationFundId}
      `;
    }

    // Update the expense
    const [updatedExpense] = await sql`
      UPDATE expenses
      SET 
        category_id = ${category_id},
        date = ${date},
        event = ${event || null},
        payment_method = ${payment_method},
        description = ${description},
        amount = ${amount},
        source_fund_id = ${source_fund_id},
        destination_fund_id = ${destination_fund_id || null}
      WHERE id = ${id}
      RETURNING *
    `;

    if (!updatedExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Apply new fund balance changes
    // Decrease new source fund balance
    await sql`
      UPDATE funds 
      SET current_balance = current_balance - ${amount}
      WHERE id = ${source_fund_id}
    `;

    // Increase new destination fund balance if specified (fund transfer)
    if (destination_fund_id) {
      await sql`
        UPDATE funds 
        SET current_balance = current_balance + ${amount}
        WHERE id = ${destination_fund_id}
      `;
    }

    // Fetch the updated expense with fund information
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
      WHERE e.id = ${id}
    `;

    return NextResponse.json(expenseWithFunds);
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Get the expense before deleting to update fund balances
    const [expenseToDelete] = await sql`
      SELECT e.*
      FROM expenses e
      WHERE e.id = ${id}
    `;

    if (!expenseToDelete) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const [deletedExpense] = await sql`
      DELETE FROM expenses
      WHERE id = ${id}
      RETURNING *
    `;

    if (!deletedExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Revert fund balance changes
    // Add back the amount to source fund
    if (expenseToDelete.source_fund_id) {
      await sql`
        UPDATE funds 
        SET current_balance = current_balance + ${expenseToDelete.amount}
        WHERE id = ${expenseToDelete.source_fund_id}
      `;
    }

    // Subtract the amount from destination fund if it was a transfer
    if (expenseToDelete.destination_fund_id) {
      await sql`
        UPDATE funds 
        SET current_balance = current_balance - ${expenseToDelete.amount}
        WHERE id = ${expenseToDelete.destination_fund_id}
      `;
    }

    return NextResponse.json(deletedExpense);
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
