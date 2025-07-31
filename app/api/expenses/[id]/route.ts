import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { UpdateExpenseSchema } from "@/types/funds";

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
        c.fund_id as category_fund_id,
        p.name as period_name,
        cf.name as category_fund_name,
        df.name as destination_fund_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      JOIN periods p ON e.period_id = p.id
      LEFT JOIN funds cf ON c.fund_id = cf.id
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
      SELECT 
        e.*,
        c.fund_id as category_fund_id
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
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
      destination_fund_id,
    } = validationResult.data;

    // Use existing values if not provided
    category_id = category_id || existingExpense.category_id;
    date = date || existingExpense.date;
    event = event !== undefined ? event : existingExpense.event;
    payment_method = payment_method || existingExpense.payment_method;
    description = description || existingExpense.description;
    amount = amount !== undefined ? amount : existingExpense.amount;
    destination_fund_id =
      destination_fund_id !== undefined
        ? destination_fund_id
        : existingExpense.destination_fund_id;

    // Validate that new category exists and get its fund
    const [newCategory] = await sql`
      SELECT c.*, f.id as fund_id, f.name as fund_name
      FROM categories c
      LEFT JOIN funds f ON c.fund_id = f.id
      WHERE c.id = ${category_id}
    `;

    if (!newCategory) {
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
      if (newCategory.fund_id === destination_fund_id) {
        return NextResponse.json(
          { error: "No se puede transferir dinero al mismo fondo" },
          { status: 400 }
        );
      }
    }

    // Revert old fund balance changes
    const oldCategoryFundId = existingExpense.category_fund_id;
    const oldDestinationFundId = existingExpense.destination_fund_id;
    const oldAmount = existingExpense.amount;

    // Revert old source fund balance (add back the amount)
    if (oldCategoryFundId) {
      await sql`
        UPDATE funds 
        SET current_balance = current_balance + ${oldAmount}
        WHERE id = ${oldCategoryFundId}
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
        destination_fund_id = ${destination_fund_id || null}
      WHERE id = ${id}
      RETURNING *
    `;

    if (!updatedExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Apply new fund balance changes
    // Decrease new source fund balance (new category's fund)
    if (newCategory.fund_id) {
      await sql`
        UPDATE funds 
        SET current_balance = current_balance - ${amount}
        WHERE id = ${newCategory.fund_id}
      `;
    }

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
        c.fund_id as category_fund_id,
        p.name as period_name,
        cf.name as category_fund_name,
        df.name as destination_fund_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      JOIN periods p ON e.period_id = p.id
      LEFT JOIN funds cf ON c.fund_id = cf.id
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
      SELECT 
        e.*,
        c.fund_id as category_fund_id
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
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
    // Add back the amount to source fund (category's fund)
    if (expenseToDelete.category_fund_id) {
      await sql`
        UPDATE funds 
        SET current_balance = current_balance + ${expenseToDelete.amount}
        WHERE id = ${expenseToDelete.category_fund_id}
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
