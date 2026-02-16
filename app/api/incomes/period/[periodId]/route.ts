import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { periodId: string } }
) {
  try {
    const periodId = params.periodId;
    const incomes = await sql`
      SELECT i.*
      FROM incomes i
      WHERE i.period_id = ${periodId}
      ORDER BY i.date DESC
    `;

    return NextResponse.json(incomes);
  } catch (error) {
    console.error('Error fetching incomes by period:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
