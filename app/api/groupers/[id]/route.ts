import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const grouperId = parseInt(params.id);

    if (isNaN(grouperId)) {
      return NextResponse.json(
        { error: 'Invalid grouper ID' },
        { status: 400 }
      );
    }

    // Get grouper details
    const [grouper] = await sql`
      SELECT * FROM groupers WHERE id = ${grouperId}
    `;

    if (!grouper) {
      return NextResponse.json({ error: 'Grouper not found' }, { status: 404 });
    }

    // Get categories assigned to this grouper
    const assignedCategories = await sql`
      SELECT c.id, c.name
      FROM categories c
      JOIN grouper_categories gc ON c.id = gc.category_id
      WHERE gc.grouper_id = ${grouperId}
      ORDER BY c.name
    `;

    return NextResponse.json({
      ...grouper,
      assignedCategories,
    });
  } catch (error) {
    console.error(`Error fetching grouper ${params.id}:`, error);
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
    const grouperId = parseInt(params.id);

    if (isNaN(grouperId)) {
      return NextResponse.json(
        { error: 'Invalid grouper ID' },
        { status: 400 }
      );
    }

    const { name } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const [updatedGrouper] = await sql`
      UPDATE groupers
      SET name = ${name}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${grouperId}
      RETURNING *
    `;

    if (!updatedGrouper) {
      return NextResponse.json({ error: 'Grouper not found' }, { status: 404 });
    }

    return NextResponse.json(updatedGrouper);
  } catch (error) {
    console.error(`Error updating grouper ${params.id}:`, error);
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
    const grouperId = parseInt(params.id);

    if (isNaN(grouperId)) {
      return NextResponse.json(
        { error: 'Invalid grouper ID' },
        { status: 400 }
      );
    }

    // Delete the grouper (cascade will remove associations)
    const [deletedGrouper] = await sql`
      DELETE FROM groupers
      WHERE id = ${grouperId}
      RETURNING *
    `;

    if (!deletedGrouper) {
      return NextResponse.json({ error: 'Grouper not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedGrouper });
  } catch (error) {
    console.error(`Error deleting grouper ${params.id}:`, error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
