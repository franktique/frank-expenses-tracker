import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json({});
    }

    const ids = idsParam
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({});
    }

    const rows = await sql`
      SELECT DISTINCT sg.category_id
      FROM category_subgroups sg
      INNER JOIN category_items ci ON ci.subgroup_id = sg.id
      WHERE sg.category_id = ANY(${ids}::uuid[])
    `;

    const result: Record<string, boolean> = {};
    for (const id of ids) {
      result[id] = false;
    }
    for (const row of rows) {
      result[row.category_id] = true;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching catalog status:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
