import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  validateCategoryFundDeletion,
  CATEGORY_FUND_ERROR_MESSAGES,
} from '@/lib/category-fund-validation';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fund_id: string } }
) {
  try {
    const categoryId = params.id;
    const fundId = params.fund_id;

    // Validate the deletion using enhanced validation
    const validation = await validateCategoryFundDeletion(categoryId, fundId);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Check if user wants to force deletion despite warnings
    const url = new URL(request.url);
    const forceDelete = url.searchParams.get('force') === 'true';

    // If there are warnings and user hasn't confirmed, return conflict
    if (validation.warnings.length > 0 && !forceDelete) {
      return NextResponse.json(
        {
          error: 'Confirmation required',
          warnings: validation.warnings,
          validation_data: validation.data,
          can_force: true,
          force_delete_url: `${request.url}?force=true`,
        },
        { status: 409 } // Conflict status
      );
    }

    // Proceed with deletion
    const [deletedRelationship] = await sql`
      DELETE FROM category_fund_relationships
      WHERE category_id = ${categoryId} AND fund_id = ${fundId}
      RETURNING *
    `;

    if (!deletedRelationship) {
      return NextResponse.json(
        { error: CATEGORY_FUND_ERROR_MESSAGES.RELATIONSHIP_NOT_FOUND },
        { status: 404 }
      );
    }

    // Get category and fund names for response
    const [category] = await sql`
      SELECT name FROM categories WHERE id = ${categoryId}
    `;
    const [fund] = await sql`
      SELECT name FROM funds WHERE id = ${fundId}
    `;

    return NextResponse.json({
      message: 'Relación categoría-fondo eliminada exitosamente',
      deleted_relationship: {
        category_id: deletedRelationship.category_id,
        category_name: category?.name,
        fund_id: deletedRelationship.fund_id,
        fund_name: fund?.name,
      },
      warnings: validation.warnings,
      validation_data: validation.data,
    });
  } catch (error) {
    console.error('Error deleting category-fund relationship:', error);
    return NextResponse.json(
      {
        error: CATEGORY_FUND_ERROR_MESSAGES.SERVER_ERROR,
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
