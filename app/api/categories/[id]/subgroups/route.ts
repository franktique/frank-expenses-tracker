import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { CreateCategorySubgroupSchema } from '@/types/funds';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: categoryId } = await params;

    const subgroups = await sql`
      SELECT
        sg.id,
        sg.category_id,
        sg.name,
        sg.display_order,
        sg.created_at,
        sg.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ci.id,
              'subgroup_id', ci.subgroup_id,
              'name', ci.name,
              'default_unit', ci.default_unit,
              'display_order', ci.display_order,
              'created_at', ci.created_at,
              'updated_at', ci.updated_at
            ) ORDER BY ci.display_order, ci.name
          ) FILTER (WHERE ci.id IS NOT NULL),
          '[]'
        ) AS items
      FROM category_subgroups sg
      LEFT JOIN category_items ci ON ci.subgroup_id = sg.id
      WHERE sg.category_id = ${categoryId}
      GROUP BY sg.id
      ORDER BY sg.display_order, sg.name
    `;

    return NextResponse.json(subgroups);
  } catch (error) {
    console.error('Error fetching subgroups:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: categoryId } = await params;
    const body = await request.json();

    const validationResult = CreateCategorySubgroupSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, display_order } = validationResult.data;

    const [newSubgroup] = await sql`
      INSERT INTO category_subgroups (category_id, name, display_order)
      VALUES (${categoryId}, ${name}, ${display_order ?? 0})
      RETURNING *
    `;

    return NextResponse.json({ ...newSubgroup, items: [] }, { status: 201 });
  } catch (error) {
    console.error('Error creating subgroup:', error);
    if ((error as any)?.code === '23505') {
      return NextResponse.json(
        { error: 'Ya existe un sub-grupo con este nombre en esta categoría' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
