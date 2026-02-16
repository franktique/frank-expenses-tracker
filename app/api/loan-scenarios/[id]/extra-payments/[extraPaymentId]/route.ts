import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  UpdateExtraPaymentSchema,
  LOAN_ERROR_MESSAGES,
} from '@/types/loan-simulator';

/**
 * GET /api/loan-scenarios/[id]/extra-payments/[extraPaymentId]
 *
 * Get a single extra payment by ID
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; extraPaymentId: string }>;
  }
) {
  try {
    const { id, extraPaymentId } = await params;

    // Validate UUIDs
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id) || !uuidRegex.test(extraPaymentId)) {
      return NextResponse.json(
        {
          error: 'ID inválido',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    // Fetch extra payment
    const [extraPayment] = await sql`
      SELECT
        id,
        loan_scenario_id,
        payment_number,
        amount,
        description,
        created_at
      FROM loan_extra_payments
      WHERE id = ${extraPaymentId}
      AND loan_scenario_id = ${id}
    `;

    if (!extraPayment) {
      return NextResponse.json(
        {
          error: LOAN_ERROR_MESSAGES.EXTRA_PAYMENT_NOT_FOUND,
          code: 'EXTRA_PAYMENT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(extraPayment);
  } catch (error) {
    console.error('Error fetching extra payment:', error);

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
        error: 'Error interno del servidor al cargar el pago extra',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/loan-scenarios/[id]/extra-payments/[extraPaymentId]
 *
 * Update an extra payment
 *
 * Request Body (partial):
 * {
 *   "paymentNumber"?: number,
 *   "amount"?: number,
 *   "description"?: string
 * }
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; extraPaymentId: string }>;
  }
) {
  try {
    const { id, extraPaymentId } = await params;

    // Validate UUIDs
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id) || !uuidRegex.test(extraPaymentId)) {
      return NextResponse.json(
        {
          error: 'ID inválido',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = UpdateExtraPaymentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    // Check if extra payment exists
    const [existing] = await sql`
      SELECT id, payment_number FROM loan_extra_payments
      WHERE id = ${extraPaymentId}
      AND loan_scenario_id = ${id}
    `;

    if (!existing) {
      return NextResponse.json(
        {
          error: LOAN_ERROR_MESSAGES.EXTRA_PAYMENT_NOT_FOUND,
          code: 'EXTRA_PAYMENT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const { paymentNumber, amount, description } = validation.data;

    // Check if updating payment number would cause a conflict
    if (
      paymentNumber !== undefined &&
      paymentNumber !== existing.payment_number
    ) {
      const [conflict] = await sql`
        SELECT id FROM loan_extra_payments
        WHERE loan_scenario_id = ${id}
        AND payment_number = ${paymentNumber}
        AND id != ${extraPaymentId}
      `;

      if (conflict) {
        return NextResponse.json(
          {
            error: 'Ya existe un pago extra para este número de pago',
            code: 'DUPLICATE_EXTRA_PAYMENT',
            existing: { id: conflict.id },
          },
          { status: 409 }
        );
      }

      // Validate new payment number is within term
      const [scenario] = await sql`
        SELECT term_months FROM loan_scenarios WHERE id = ${id}
      `;

      if (scenario && paymentNumber > parseInt(scenario.term_months)) {
        return NextResponse.json(
          {
            error: `El número de pago no puede exceder el plazo del préstamo (${scenario.term_months} meses)`,
            code: 'INVALID_PAYMENT_NUMBER',
          },
          { status: 400 }
        );
      }
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (paymentNumber !== undefined) {
      updateFields.push(`payment_number = $${updateValues.length + 1}`);
      updateValues.push(paymentNumber);
    }
    if (amount !== undefined) {
      updateFields.push(`amount = $${updateValues.length + 1}`);
      updateValues.push(amount);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${updateValues.length + 1}`);
      updateValues.push(description);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        {
          error: 'No se proporcionaron campos para actualizar',
          code: 'NO_UPDATE_FIELDS',
        },
        { status: 400 }
      );
    }

    updateValues.push(extraPaymentId);

    const query = `
      UPDATE loan_extra_payments
      SET ${updateFields.join(', ')}
      WHERE id = $${updateValues.length}
      RETURNING *
    `;

    // Use sql.query for dynamic SQL with placeholders
    const { sql: sqlClient } = await import('@/lib/db');
    const [updated] = await sqlClient.query(query, updateValues);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating extra payment:', error);

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
        error: 'Error interno del servidor al actualizar el pago extra',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/loan-scenarios/[id]/extra-payments/[extraPaymentId]
 *
 * Delete an extra payment
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; extraPaymentId: string }>;
  }
) {
  try {
    const { id, extraPaymentId } = await params;

    // Validate UUIDs
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id) || !uuidRegex.test(extraPaymentId)) {
      return NextResponse.json(
        {
          error: 'ID inválido',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    // Check if extra payment exists
    const [existing] = await sql`
      SELECT id, payment_number, amount FROM loan_extra_payments
      WHERE id = ${extraPaymentId}
      AND loan_scenario_id = ${id}
    `;

    if (!existing) {
      return NextResponse.json(
        {
          error: LOAN_ERROR_MESSAGES.EXTRA_PAYMENT_NOT_FOUND,
          code: 'EXTRA_PAYMENT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Delete the extra payment
    await sql`
      DELETE FROM loan_extra_payments
      WHERE id = ${extraPaymentId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Pago extra eliminado exitosamente',
      deleted: {
        id: extraPaymentId,
        paymentNumber: existing.payment_number,
        amount: existing.amount,
      },
    });
  } catch (error) {
    console.error('Error deleting extra payment:', error);

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
        error: 'Error interno del servidor al eliminar el pago extra',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
