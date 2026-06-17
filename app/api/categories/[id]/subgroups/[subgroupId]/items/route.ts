import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { CreateCategoryItemSchema } from '@/types/funds';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subgroupId: string }> }
) {
  try {
    const { subgroupId } = await params;

    const items = await sql`
      SELECT * FROM category_items
      WHERE subgroup_id = ${subgroupId}
      ORDER BY display_order, name
    `;

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subgroupId: string }> }
) {
  try {
    const { subgroupId } = await params;
    const body = await request.json();

    const validationResult = CreateCategoryItemSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, default_unit, display_order } = validationResult.data;

    const [newItem] = await sql`
      INSERT INTO category_items (subgroup_id, name, default_unit, display_order)
      VALUES (${subgroupId}, ${name}, ${default_unit ?? null}, ${display_order ?? 0})
      RETURNING *
    `;

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    if ((error as any)?.code === '23505') {
      return NextResponse.json(
        { error: 'Ya existe un ítem con este nombre en este sub-grupo' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
