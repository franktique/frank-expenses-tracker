import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { CreateEventSchema } from '@/types/funds';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20;

    let events;
    if (search && search.trim() !== '') {
      const searchTerm = `%${search.trim()}%`;
      events = await sql`
        SELECT
          ev.id,
          ev.name,
          ev.description,
          ev.created_at,
          ev.updated_at,
          COUNT(e.id)::int AS expense_count
        FROM events ev
        LEFT JOIN expenses e ON e.event_id = ev.id
        WHERE ev.name ILIKE ${searchTerm}
        GROUP BY ev.id, ev.name, ev.description, ev.created_at, ev.updated_at
        ORDER BY ev.name ASC
        LIMIT ${limit}
      `;
    } else {
      events = await sql`
        SELECT
          ev.id,
          ev.name,
          ev.description,
          ev.created_at,
          ev.updated_at,
          COUNT(e.id)::int AS expense_count
        FROM events ev
        LEFT JOIN expenses e ON e.event_id = ev.id
        GROUP BY ev.id, ev.name, ev.description, ev.created_at, ev.updated_at
        ORDER BY ev.name ASC
        LIMIT ${limit}
      `;
    }

    const totalResult =
      search && search.trim() !== ''
        ? await sql`SELECT COUNT(*)::int AS total FROM events WHERE name ILIKE ${`%${search.trim()}%`}`
        : await sql`SELECT COUNT(*)::int AS total FROM events`;

    return NextResponse.json({
      events,
      total: totalResult[0]?.total ?? 0,
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = CreateEventSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, description } = validationResult.data;
    const trimmedName = name.trim();

    // Check for duplicate name (case-insensitive)
    const existing = await sql`
      SELECT id FROM events WHERE LOWER(TRIM(name)) = LOWER(${trimmedName}) LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: 'DUPLICATE_EVENT',
          message: 'Ya existe un evento con este nombre',
        },
        { status: 409 }
      );
    }

    const [newEvent] = await sql`
      INSERT INTO events (name, description)
      VALUES (${trimmedName}, ${description ?? null})
      RETURNING id, name, description, created_at, updated_at
    `;

    return NextResponse.json(
      { ...newEvent, expense_count: 0 },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
