import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { UpdateFundSchema, FUND_ERROR_MESSAGES } from "@/types/funds";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get fund details with calculated current balance and recent transactions
    const [fund] = await sql`
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
        WHERE fund_id = ${id}
        GROUP BY fund_id
      ) income_totals ON f.id = income_totals.fund_id
      LEFT JOIN (
        SELECT 
          destination_fund_id as fund_id,
          SUM(amount) as total
        FROM expenses e
        WHERE destination_fund_id = ${id}
        GROUP BY destination_fund_id
      ) transfer_in_totals ON f.id = transfer_in_totals.fund_id
      LEFT JOIN (
        SELECT 
          source_fund_id as fund_id,
          SUM(amount) as total
        FROM expenses e
        WHERE source_fund_id = ${id}
        GROUP BY source_fund_id
      ) expense_totals ON f.id = expense_totals.fund_id
      WHERE f.id = ${id}
    `;

    if (!fund) {
      return NextResponse.json(
        { error: FUND_ERROR_MESSAGES.FUND_NOT_FOUND },
        { status: 404 }
      );
    }

    // Get recent transactions for this fund
    const recentTransactions = await sql`
      SELECT 
        'income' as type,
        i.id,
        i.amount,
        i.date,
        i.description
      FROM incomes i
      WHERE i.fund_id = ${id}
      
      UNION ALL
      
      SELECT 
        'expense' as type,
        e.id,
        e.amount,
        e.date,
        e.description
      FROM expenses e
      WHERE e.source_fund_id = ${id}
      
      UNION ALL
      
      SELECT 
        'transfer_in' as type,
        e.id,
        e.amount,
        e.date,
        e.description
      FROM expenses e
      WHERE e.destination_fund_id = ${id}
      
      ORDER BY date DESC
      LIMIT 10
    `;

    return NextResponse.json({
      ...fund,
      recent_transactions: recentTransactions,
    });
  } catch (error) {
    console.error("Error fetching fund details:", error);
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
    const { id } = params;
    const body = await request.json();

    // Validate the request body
    const validationResult = UpdateFundSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Check if fund exists
    const [existingFund] = await sql`
      SELECT id, name FROM funds WHERE id = ${id}
    `;

    if (!existingFund) {
      return NextResponse.json(
        { error: FUND_ERROR_MESSAGES.FUND_NOT_FOUND },
        { status: 404 }
      );
    }

    // Check if new name already exists (if name is being updated)
    if (updateData.name && updateData.name !== existingFund.name) {
      const duplicateFund = await sql`
        SELECT id FROM funds WHERE name = ${updateData.name} AND id != ${id}
      `;

      if (duplicateFund.length > 0) {
        return NextResponse.json(
          { error: FUND_ERROR_MESSAGES.FUND_NAME_DUPLICATE },
          { status: 409 }
        );
      }
    }

    // Build update query based on provided fields
    let updatedFund;

    if (
      updateData.name !== undefined &&
      updateData.description !== undefined &&
      updateData.initial_balance !== undefined
    ) {
      [updatedFund] = await sql`
        UPDATE funds 
        SET name = ${updateData.name}, 
            description = ${updateData.description}, 
            initial_balance = ${updateData.initial_balance},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (
      updateData.name !== undefined &&
      updateData.description !== undefined
    ) {
      [updatedFund] = await sql`
        UPDATE funds 
        SET name = ${updateData.name}, 
            description = ${updateData.description},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (
      updateData.name !== undefined &&
      updateData.initial_balance !== undefined
    ) {
      [updatedFund] = await sql`
        UPDATE funds 
        SET name = ${updateData.name}, 
            initial_balance = ${updateData.initial_balance},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (
      updateData.description !== undefined &&
      updateData.initial_balance !== undefined
    ) {
      [updatedFund] = await sql`
        UPDATE funds 
        SET description = ${updateData.description}, 
            initial_balance = ${updateData.initial_balance},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (updateData.name !== undefined) {
      [updatedFund] = await sql`
        UPDATE funds 
        SET name = ${updateData.name},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (updateData.description !== undefined) {
      [updatedFund] = await sql`
        UPDATE funds 
        SET description = ${updateData.description},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (updateData.initial_balance !== undefined) {
      [updatedFund] = await sql`
        UPDATE funds 
        SET initial_balance = ${updateData.initial_balance},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
    } else {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    return NextResponse.json(updatedFund);
  } catch (error) {
    console.error("Error updating fund:", error);
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
    const { id } = params;

    // Check if fund exists
    const [existingFund] = await sql`
      SELECT id, name FROM funds WHERE id = ${id}
    `;

    if (!existingFund) {
      return NextResponse.json(
        { error: FUND_ERROR_MESSAGES.FUND_NOT_FOUND },
        { status: 404 }
      );
    }

    // Check for referential integrity - categories
    const categoriesUsingFund = await sql`
      SELECT COUNT(*) as count FROM categories WHERE fund_id = ${id}
    `;

    if (categoriesUsingFund[0].count > 0) {
      return NextResponse.json(
        { error: FUND_ERROR_MESSAGES.FUND_DELETE_RESTRICTED },
        { status: 409 }
      );
    }

    // Check for referential integrity - incomes
    const incomesUsingFund = await sql`
      SELECT COUNT(*) as count FROM incomes WHERE fund_id = ${id}
    `;

    if (incomesUsingFund[0].count > 0) {
      return NextResponse.json(
        { error: FUND_ERROR_MESSAGES.FUND_DELETE_RESTRICTED },
        { status: 409 }
      );
    }

    // Check for referential integrity - expenses (destination fund)
    const expensesUsingFund = await sql`
      SELECT COUNT(*) as count FROM expenses WHERE destination_fund_id = ${id}
    `;

    if (expensesUsingFund[0].count > 0) {
      return NextResponse.json(
        { error: FUND_ERROR_MESSAGES.FUND_DELETE_RESTRICTED },
        { status: 409 }
      );
    }

    // Check for referential integrity - expenses (source fund)
    const expensesUsingSourceFund = await sql`
      SELECT COUNT(*) as count FROM expenses WHERE source_fund_id = ${id}
    `;

    if (expensesUsingSourceFund[0].count > 0) {
      return NextResponse.json(
        { error: FUND_ERROR_MESSAGES.FUND_DELETE_RESTRICTED },
        { status: 409 }
      );
    }

    // Delete the fund
    await sql`DELETE FROM funds WHERE id = ${id}`;

    return NextResponse.json({ message: "Fund deleted successfully" });
  } catch (error) {
    console.error("Error deleting fund:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
