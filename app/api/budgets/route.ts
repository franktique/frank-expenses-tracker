import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const budgets = await sql`
      SELECT b.*, c.name as category_name, p.name as period_name
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      JOIN periods p ON b.period_id = p.id
    `;
    return NextResponse.json(budgets);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { categoryId, periodId, expectedAmount, paymentMethod } =
      await request.json();

    if (!categoryId || !periodId || !paymentMethod) {
      return NextResponse.json(
        { error: 'Category ID, Period ID, and Payment Method are required' },
        { status: 400 }
      );
    }

    if (typeof expectedAmount !== 'number' || expectedAmount < 0) {
      return NextResponse.json(
        { error: 'Expected amount must be a positive number' },
        { status: 400 }
      );
    }

    // Note: Recurrence settings are read from the category table, not stored on budget

    // Check if budget already exists for this category, period, and payment method
    const [existingBudget] = await sql`
      SELECT * FROM budgets
      WHERE category_id = ${categoryId} AND period_id = ${periodId} AND payment_method = ${paymentMethod}
    `;

    if (existingBudget) {
      // Update existing budget
      const [updatedBudget] = await sql`
        UPDATE budgets
        SET expected_amount = ${expectedAmount}
        WHERE id = ${existingBudget.id}
        RETURNING *
      `;
      return NextResponse.json(updatedBudget);
    } else {
      // Create new budget
      const [newBudget] = await sql`
        INSERT INTO budgets (
          category_id,
          period_id,
          expected_amount,
          payment_method
        )
        VALUES (
          ${categoryId},
          ${periodId},
          ${expectedAmount},
          ${paymentMethod}
        )
        RETURNING *
      `;
      return NextResponse.json(newBudget);
    }
  } catch (error) {
    console.error('Error creating/updating budget:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
