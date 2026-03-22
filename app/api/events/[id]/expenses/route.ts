import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

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

    const expenses = await sql`
      SELECT
        e.id,
        e.description,
        e.amount,
        e.payment_method,
        e.date,
        e.category_id,
        c.name as category_name
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.event_id = ${eventId}
      ORDER BY e.date DESC
    `;

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('Error fetching event expenses:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
