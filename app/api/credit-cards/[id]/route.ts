import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  UpdateCreditCardSchema,
  UpdateCreditCardStatusSchema,
  CREDIT_CARD_ERROR_MESSAGES,
} from "@/types/credit-cards";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the credit card by ID
    const [creditCard] = await sql`
      SELECT * FROM credit_cards 
      WHERE id = ${id}
    `;

    if (!creditCard) {
      return NextResponse.json(
        { error: CREDIT_CARD_ERROR_MESSAGES.CREDIT_CARD_NOT_FOUND },
        { status: 404 }
      );
    }

    return NextResponse.json(creditCard);
  } catch (error) {
    console.error("Error fetching credit card:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = UpdateCreditCardSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Check if credit card exists
    const [existingCard] = await sql`
      SELECT * FROM credit_cards 
      WHERE id = ${id}
    `;

    if (!existingCard) {
      return NextResponse.json(
        { error: CREDIT_CARD_ERROR_MESSAGES.CREDIT_CARD_NOT_FOUND },
        { status: 404 }
      );
    }

    // Check for duplicates if bank_name, franchise, or last_four_digits are being updated
    if (
      updateData.bank_name ||
      updateData.franchise ||
      updateData.last_four_digits
    ) {
      const bankName = updateData.bank_name || existingCard.bank_name;
      const franchise = updateData.franchise || existingCard.franchise;
      const lastFourDigits =
        updateData.last_four_digits || existingCard.last_four_digits;

      const [duplicate] = await sql`
        SELECT id FROM credit_cards 
        WHERE bank_name = ${bankName} 
        AND franchise = ${franchise} 
        AND last_four_digits = ${lastFourDigits}
        AND id != ${id}
      `;

      if (duplicate) {
        return NextResponse.json(
          { error: CREDIT_CARD_ERROR_MESSAGES.DUPLICATE_CREDIT_CARD },
          { status: 409 }
        );
      }
    }

    // Update the credit card with individual field updates
    let updatedCard;

    if (
      updateData.is_active !== undefined &&
      Object.keys(updateData).length === 1
    ) {
      // Only updating status
      [updatedCard] = await sql`
        UPDATE credit_cards 
        SET is_active = ${updateData.is_active}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else {
      // Update all provided fields
      [updatedCard] = await sql`
        UPDATE credit_cards 
        SET 
          bank_name = COALESCE(${updateData.bank_name}, bank_name),
          franchise = COALESCE(${updateData.franchise}, franchise),
          last_four_digits = COALESCE(${updateData.last_four_digits}, last_four_digits),
          is_active = COALESCE(${updateData.is_active}, is_active),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    }

    return NextResponse.json(updatedCard);
  } catch (error) {
    console.error("Error updating credit card:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if credit card exists
    const [existingCard] = await sql`
      SELECT * FROM credit_cards 
      WHERE id = ${id}
    `;

    if (!existingCard) {
      return NextResponse.json(
        { error: CREDIT_CARD_ERROR_MESSAGES.CREDIT_CARD_NOT_FOUND },
        { status: 404 }
      );
    }

    // Check if credit card is associated with any expenses
    const [expenseCount] = await sql`
      SELECT COUNT(*) as count FROM expenses 
      WHERE credit_card_id = ${id}
    `;

    if (expenseCount.count > 0) {
      // If there are associated expenses, we'll remove the association but keep the expenses
      // First, set credit_card_id to NULL for all associated expenses
      await sql`
        UPDATE expenses 
        SET credit_card_id = NULL 
        WHERE credit_card_id = ${id}
      `;
    }

    // Delete the credit card
    await sql`
      DELETE FROM credit_cards 
      WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      message: CREDIT_CARD_ERROR_MESSAGES.CREDIT_CARD_DELETE_SUCCESS,
      removedAssociations:
        expenseCount.count > 0 ? parseInt(expenseCount.count) : 0,
    });
  } catch (error) {
    console.error("Error deleting credit card:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
