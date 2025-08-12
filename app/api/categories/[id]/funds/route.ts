import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { UpdateCategoryFundsSchema } from "@/types/funds";
import {
  validateCategoryFundUpdate,
  CATEGORY_FUND_ERROR_MESSAGES,
} from "@/lib/category-fund-validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: categoryId } = await params;

    // Validate category exists
    const [category] = await sql`
      SELECT id FROM categories WHERE id = ${categoryId}
    `;

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Get all funds associated with this category
    const funds = await sql`
      SELECT 
        f.id,
        f.name,
        f.description,
        f.initial_balance,
        f.current_balance,
        f.start_date,
        f.created_at,
        f.updated_at
      FROM funds f
      INNER JOIN category_fund_relationships cfr ON f.id = cfr.fund_id
      WHERE cfr.category_id = ${categoryId}
      ORDER BY f.name
    `;

    return NextResponse.json({ funds });
  } catch (error) {
    console.error("Error fetching category funds:", error);
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

    // Validate request body
    const validationResult = UpdateCategoryFundsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { fund_ids } = validationResult.data;

    // Enhanced validation using validation utility
    const validation = await validateCategoryFundUpdate(categoryId, fund_ids);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Check if user wants to proceed despite warnings
    const url = new URL(request.url);
    const forceUpdate = url.searchParams.get("force") === "true";

    // If there are warnings and user hasn't confirmed, return conflict
    if (validation.warnings.length > 0 && !forceUpdate) {
      return NextResponse.json(
        {
          error: "Confirmation required",
          warnings: validation.warnings,
          validation_data: validation.data,
          can_force: true,
          force_update_url: `${request.url}?force=true`,
        },
        { status: 409 } // Conflict status
      );
    }

    // Update relationships (Neon doesn't support transactions, so we do it sequentially)
    try {
      // Remove all existing relationships for this category
      await sql`
        DELETE FROM category_fund_relationships 
        WHERE category_id = ${categoryId}
      `;

      // Add new relationships if fund_ids is not empty
      if (fund_ids.length > 0) {
        // Insert each relationship individually to avoid SQL injection
        for (const fundId of fund_ids) {
          await sql`
            INSERT INTO category_fund_relationships (category_id, fund_id)
            VALUES (${categoryId}, ${fundId})
          `;
        }
      }
    } catch (dbError) {
      console.error("Database error updating relationships:", dbError);
      throw new Error("Failed to update category-fund relationships");
    }

    // Fetch and return updated relationships
    const updatedFunds = await sql`
      SELECT 
        f.id,
        f.name,
        f.description,
        f.initial_balance,
        f.current_balance,
        f.start_date,
        f.created_at,
        f.updated_at
      FROM funds f
      INNER JOIN category_fund_relationships cfr ON f.id = cfr.fund_id
      WHERE cfr.category_id = ${categoryId}
      ORDER BY f.name
    `;

    return NextResponse.json({
      message: "Relaciones categoría-fondo actualizadas exitosamente",
      funds: updatedFunds,
      warnings: validation.warnings,
      validation_data: validation.data,
    });
  } catch (error) {
    console.error("Error updating category funds:", error);
    return NextResponse.json(
      {
        error: CATEGORY_FUND_ERROR_MESSAGES.SERVER_ERROR,
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
