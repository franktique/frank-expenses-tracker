import { type NextRequest, NextResponse } from 'next/server';
import { convertCategoryToMultiFund } from '@/lib/category-fund-migration';
import { z } from 'zod';

const MigrateCategoryFundsSchema = z.object({
  fund_ids: z.array(z.string().uuid()).min(0, 'Fund IDs array is required'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id;
    const body = await request.json();

    // Validate request body
    const validationResult = MigrateCategoryFundsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { fund_ids } = validationResult.data;

    // Convert category to multi-fund relationships
    const migrationResult = await convertCategoryToMultiFund(
      categoryId,
      fund_ids
    );

    return NextResponse.json(migrationResult, {
      status: migrationResult.success ? 200 : 400,
    });
  } catch (error) {
    console.error('Error migrating category funds:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
