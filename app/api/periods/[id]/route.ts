import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const [period] = await sql`SELECT * FROM periods WHERE id = ${id}`;

    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    return NextResponse.json(period);
  } catch (error) {
    console.error('Error fetching period:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const { name, month, year } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (typeof month !== 'number' || month < 0 || month > 11) {
      return NextResponse.json(
        { error: 'Month must be a number between 0 and 11' },
        { status: 400 }
      );
    }

    if (typeof year !== 'number' || year < 2000) {
      return NextResponse.json(
        { error: 'Year must be a valid number' },
        { status: 400 }
      );
    }

    const [updatedPeriod] = await sql`
      UPDATE periods
      SET name = ${name}, month = ${month}, year = ${year}
      WHERE id = ${id}
      RETURNING *
    `;

    if (!updatedPeriod) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    return NextResponse.json(updatedPeriod);
  } catch (error) {
    console.error('Error updating period:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const [deletedPeriod] = await sql`
      DELETE FROM periods
      WHERE id = ${id}
      RETURNING *
    `;

    if (!deletedPeriod) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    return NextResponse.json(deletedPeriod);
  } catch (error) {
    console.error('Error deleting period:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
