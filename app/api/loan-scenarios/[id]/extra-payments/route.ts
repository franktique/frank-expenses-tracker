import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  CreateExtraPaymentSchema,
  LOAN_ERROR_MESSAGES,
} from '@/types/loan-simulator';

/**
 * GET /api/loan-scenarios/[id]/extra-payments
 *
 * Get all extra payments for a loan scenario
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        {
          error: 'ID de préstamo inválido',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    // Check if scenario exists
    const [scenario] = await sql`
      SELECT id FROM loan_scenarios WHERE id = ${id}
    `;

    if (!scenario) {
      return NextResponse.json(
        {
          error: LOAN_ERROR_MESSAGES.SCENARIO_NOT_FOUND,
          code: 'SCENARIO_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Fetch extra payments
    const extraPayments = await sql`
      SELECT
        id,
        loan_scenario_id,
        payment_number,
        amount,
        description,
        created_at
      FROM loan_extra_payments
      WHERE loan_scenario_id = ${id}
      ORDER BY payment_number ASC
    `;

    return NextResponse.json({
      extraPayments,
      count: extraPayments.length,
    });
  } catch (error) {
    console.error('Error fetching extra payments:', error);

    if (error instanceof Error) {
      if (error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Error de conexión con la base de datos',
            code: 'DATABASE_CONNECTION_ERROR',
            retryable: true,
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Error interno del servidor al cargar los pagos extra',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/loan-scenarios/[id]/extra-payments
 *
 * Add an extra payment to a loan scenario
 *
 * Request Body:
 * {
 *   "paymentNumber": number,
 *   "amount": number,
 *   "description"?: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        {
          error: 'ID de préstamo inválido',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = CreateExtraPaymentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { paymentNumber, amount, description } = validation.data;

    // Check if scenario exists and get term
    const [scenario] = await sql`
      SELECT id, term_months FROM loan_scenarios WHERE id = ${id}
    `;

    if (!scenario) {
      return NextResponse.json(
        {
          error: LOAN_ERROR_MESSAGES.SCENARIO_NOT_FOUND,
          code: 'SCENARIO_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Validate payment number is within term
    if (paymentNumber > parseInt(scenario.term_months)) {
      return NextResponse.json(
        {
          error: `El número de pago no puede exceder el plazo del préstamo (${scenario.term_months} meses)`,
          code: 'INVALID_PAYMENT_NUMBER',
        },
        { status: 400 }
      );
    }

    // Check if extra payment already exists for this payment number
    const [existing] = await sql`
      SELECT id FROM loan_extra_payments
      WHERE loan_scenario_id = ${id}
      AND payment_number = ${paymentNumber}
    `;

    if (existing) {
      return NextResponse.json(
        {
          error: 'Ya existe un pago extra para este número de pago',
          code: 'DUPLICATE_EXTRA_PAYMENT',
          existing: { id: existing.id },
        },
        { status: 409 }
      );
    }

    // Insert extra payment
    const [extraPayment] = await sql`
      INSERT INTO loan_extra_payments (
        loan_scenario_id,
        payment_number,
        amount,
        description
      )
      VALUES (
        ${id},
        ${paymentNumber},
        ${amount},
        ${description || null}
      )
      RETURNING *
    `;

    return NextResponse.json(extraPayment, { status: 201 });
  } catch (error) {
    console.error('Error creating extra payment:', error);

    if (error instanceof Error) {
      if (error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Error de conexión con la base de datos',
            code: 'DATABASE_CONNECTION_ERROR',
            retryable: true,
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Error interno del servidor al crear el pago extra',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
