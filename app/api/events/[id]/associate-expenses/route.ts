import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { z } from 'zod';

const AssociateExpensesSchema = z.object({
  expense_ids: z.array(z.string()).min(1, 'At least one expense ID is required'),
});

/**
 * POST /api/events/[id]/associate-expenses
 *
 * Bulk-associates the given expense IDs to this event.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const [event] = await sql`SELECT id FROM events WHERE id = ${eventId}`;
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const body = await request.json();
    const validationResult = AssociateExpensesSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { expense_ids } = validationResult.data;

    const result = await sql`
      UPDATE expenses
      SET event_id = ${eventId}
      WHERE id = ANY(${expense_ids}::uuid[])
    `;

    return NextResponse.json({ success: true, updated: result.count ?? 0 });
  } catch (error) {
    console.error('Error associating expenses:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
