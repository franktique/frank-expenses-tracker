import { type NextRequest, NextResponse } from 'next/server';
import {
  validateExpenseFundCategory,
  getAvailableFundsForCategory,
  CATEGORY_FUND_ERROR_MESSAGES,
} from '@/lib/category-fund-validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id;
    const url = new URL(request.url);
    const fundId = url.searchParams.get('fund_id');

    if (!fundId) {
      // Return available funds for this category
      const result = await getAvailableFundsForCategory(categoryId);

      return NextResponse.json({
        category_id: categoryId,
        available_funds: result.funds,
        has_fund_restrictions: result.hasRestrictions,
        message: result.hasRestrictions
          ? 'Esta categoría tiene fondos específicos asociados'
          : 'Esta categoría acepta gastos desde cualquier fondo',
      });
    }

    // Validate specific fund-category combination
    const validation = await validateExpenseFundCategory(categoryId, fundId);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid fund-category combination',
          details: validation.errors,
          category_id: categoryId,
          fund_id: fundId,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      category_id: categoryId,
      fund_id: fundId,
      warnings: validation.warnings,
      validation_data: validation.data,
      message: 'La combinación fondo-categoría es válida',
    });
  } catch (error) {
    console.error('Error validating fund-category combination:', error);
    return NextResponse.json(
      {
        error: CATEGORY_FUND_ERROR_MESSAGES.SERVER_ERROR,
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
