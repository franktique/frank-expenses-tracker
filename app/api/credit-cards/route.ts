import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  CreateCreditCardSchema,
  CREDIT_CARD_ERROR_MESSAGES,
  type CreditCard,
} from '@/types/credit-cards';

export async function GET() {
  try {
    const creditCards = await sql`
      SELECT 
        id,
        bank_name,
        franchise,
        last_four_digits,
        is_active,
        created_at,
        updated_at
      FROM credit_cards
      ORDER BY bank_name, franchise, last_four_digits
    `;

    return NextResponse.json({
      credit_cards: creditCards,
      total_count: creditCards.length,
    });
  } catch (error) {
    console.error('Error fetching credit cards:', error);
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
    const validationResult = CreateCreditCardSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { bank_name, franchise, last_four_digits, is_active } =
      validationResult.data;

    // Check for duplicate credit card (same bank + franchise + last four digits)
    const existingCard = await sql`
      SELECT id FROM credit_cards 
      WHERE bank_name = ${bank_name} 
        AND franchise = ${franchise} 
        AND last_four_digits = ${last_four_digits}
    `;

    if (existingCard.length > 0) {
      return NextResponse.json(
        {
          error: CREDIT_CARD_ERROR_MESSAGES.DUPLICATE_CREDIT_CARD,
          code: 'DUPLICATE_CREDIT_CARD',
        },
        { status: 409 }
      );
    }

    // Create the credit card
    const [newCreditCard] = await sql`
      INSERT INTO credit_cards (bank_name, franchise, last_four_digits, is_active)
      VALUES (${bank_name}, ${franchise}, ${last_four_digits}, ${
        is_active ?? true
      })
      RETURNING 
        id,
        bank_name,
        franchise,
        last_four_digits,
        is_active,
        created_at,
        updated_at
    `;

    return NextResponse.json(
      {
        success: true,
        credit_card: newCreditCard,
        message: CREDIT_CARD_ERROR_MESSAGES.CREDIT_CARD_CREATE_SUCCESS,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating credit card:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
