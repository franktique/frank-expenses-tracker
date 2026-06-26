import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/events/[id]/match-expenses
 *
 * Returns expenses within the event's date range (start_date to end_date)
 * that are NOT already associated with this event.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const [event] = await sql`
      SELECT id, start_date, end_date FROM events WHERE id = ${eventId}
    `;

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!event.start_date || !event.end_date) {
      return NextResponse.json(
        { error: 'Event does not have a date range defined' },
        { status: 400 }
      );
    }

    const expenses = await sql`
      SELECT
        e.id,
        e.description,
        e.amount,
        e.payment_method,
        e.date,
        c.name AS category_name,
        ev2.name AS current_event_name,
        e.event_id AS current_event_id
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN events ev2 ON e.event_id = ev2.id
      WHERE e.date BETWEEN ${event.start_date} AND ${event.end_date}
        AND (e.event_id IS NULL OR e.event_id != ${eventId})
      ORDER BY e.date DESC
    `;

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('Error fetching matching expenses:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
