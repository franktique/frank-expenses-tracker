import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { DateUtils } from "@/types/funds"

export async function GET() {
  try {
    const budgets = await sql`
      SELECT b.*, c.name as category_name, p.name as period_name, c.recurring_date
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      JOIN periods p ON b.period_id = p.id
    `
    return NextResponse.json(budgets)
  } catch (error) {
    console.error("Error fetching budgets:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { categoryId, periodId, expectedAmount, paymentMethod, expectedDate } = await request.json()

    if (!categoryId || !periodId || !paymentMethod) {
      return NextResponse.json({ error: "Category ID, Period ID, and Payment Method are required" }, { status: 400 })
    }

    if (typeof expectedAmount !== "number" || expectedAmount < 0) {
      return NextResponse.json({ error: "Expected amount must be a positive number" }, { status: 400 })
    }

    // Get category and period information for auto-population
    const [categoryInfo] = await sql`
      SELECT c.recurring_date, p.year, p.month
      FROM categories c
      JOIN periods p ON p.id = ${periodId}
      WHERE c.id = ${categoryId}
    `

    let finalExpectedDate = expectedDate

    // Auto-populate expected_date from category's recurring_date if not provided
    if (!finalExpectedDate && categoryInfo?.recurring_date) {
      finalExpectedDate = DateUtils.calculateExpectedDate(
        categoryInfo.recurring_date,
        categoryInfo.year,
        categoryInfo.month
      )
    }

    // Validate expected_date if provided
    if (finalExpectedDate) {
      const parsedDate = new Date(finalExpectedDate)
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: "Invalid expected date format" }, { status: 400 })
      }
    }

    // Check if budget already exists for this category, period, and payment method
    const [existingBudget] = await sql`
      SELECT * FROM budgets 
      WHERE category_id = ${categoryId} AND period_id = ${periodId} AND payment_method = ${paymentMethod}
    `

    if (existingBudget) {
      // Update existing budget
      const [updatedBudget] = await sql`
        UPDATE budgets
        SET expected_amount = ${expectedAmount}, expected_date = ${finalExpectedDate}
        WHERE id = ${existingBudget.id}
        RETURNING *
      `
      return NextResponse.json(updatedBudget)
    } else {
      // Create new budget
      const [newBudget] = await sql`
        INSERT INTO budgets (category_id, period_id, expected_amount, payment_method, expected_date)
        VALUES (${categoryId}, ${periodId}, ${expectedAmount}, ${paymentMethod}, ${finalExpectedDate})
        RETURNING *
      `
      return NextResponse.json(newBudget)
    }
  } catch (error) {
    console.error("Error creating/updating budget:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
