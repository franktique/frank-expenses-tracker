import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { UpdateEventSchema } from '@/types/funds';

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
      SELECT
        ev.id,
        ev.name,
        ev.description,
        ev.created_at,
        ev.updated_at,
        COUNT(e.id)::int AS expense_count
      FROM events ev
      LEFT JOIN expenses e ON e.event_id = ev.id
      WHERE ev.id = ${eventId}
      GROUP BY ev.id, ev.name, ev.description, ev.created_at, ev.updated_at
    `;

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
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
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const body = await request.json();
    const validationResult = UpdateEventSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, description } = validationResult.data;

    // Fetch existing event
    const [existing] = await sql`SELECT * FROM events WHERE id = ${eventId}`;
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const newName = name !== undefined ? name.trim() : existing.name;
    const newDescription =
      description !== undefined ? description : existing.description;

    // Check for duplicate name if name is being changed
    if (
      name !== undefined &&
      newName.toLowerCase() !== (existing.name as string).toLowerCase()
    ) {
      const duplicate = await sql`
        SELECT id FROM events WHERE LOWER(TRIM(name)) = LOWER(${newName}) AND id <> ${eventId} LIMIT 1
      `;
      if (duplicate.length > 0) {
        return NextResponse.json(
          {
            error: 'DUPLICATE_EVENT',
            message: 'Ya existe un evento con este nombre',
          },
          { status: 409 }
        );
      }
    }

    const [updatedEvent] = await sql`
      UPDATE events
      SET
        name        = ${newName},
        description = ${newDescription ?? null},
        updated_at  = NOW()
      WHERE id = ${eventId}
      RETURNING id, name, description, created_at, updated_at
    `;

    // Return with expense_count
    const [eventWithCount] = await sql`
      SELECT
        ev.id,
        ev.name,
        ev.description,
        ev.created_at,
        ev.updated_at,
        COUNT(e.id)::int AS expense_count
      FROM events ev
      LEFT JOIN expenses e ON e.event_id = ev.id
      WHERE ev.id = ${updatedEvent.id}
      GROUP BY ev.id, ev.name, ev.description, ev.created_at, ev.updated_at
    `;

    return NextResponse.json(eventWithCount);
  } catch (error) {
    console.error('Error updating event:', error);
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
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // Check if event exists and get expense count
    const [event] = await sql`
      SELECT
        ev.id,
        ev.name,
        COUNT(e.id)::int AS expense_count
      FROM events ev
      LEFT JOIN expenses e ON e.event_id = ev.id
      WHERE ev.id = ${eventId}
      GROUP BY ev.id, ev.name
    `;

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if ((event.expense_count as number) > 0 && !force) {
      return NextResponse.json(
        {
          error: 'EVENT_IN_USE',
          message: `El evento tiene ${event.expense_count} gastos asociados. Use ?force=true para eliminarlo de todas formas.`,
          expense_count: event.expense_count,
        },
        { status: 409 }
      );
    }

    if ((event.expense_count as number) > 0 && force) {
      // Nullify event_id on linked expenses
      await sql`UPDATE expenses SET event_id = NULL WHERE event_id = ${eventId}`;
    }

    await sql`DELETE FROM events WHERE id = ${eventId}`;

    return NextResponse.json({ success: true, deleted_id: eventId });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
