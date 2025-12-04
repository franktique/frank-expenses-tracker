import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { UpdateCategorySchema, DEFAULT_FUND_NAME } from "@/types/funds";
import { updateBudgetDefaultDatesForCategory } from "@/lib/category-budget-sync";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const [category] = await sql`
      SELECT 
        c.*,
        f.name as fund_name
      FROM categories c
      LEFT JOIN funds f ON c.fund_id = f.id
      WHERE c.id = ${id}
    `;

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Get associated funds for this category
    const associatedFunds = await sql`
      SELECT 
        f.id,
        f.name,
        f.description,
        f.initial_balance,
        f.current_balance,
        f.start_date,
        f.created_at,
        f.updated_at
      FROM category_fund_relationships cfr
      JOIN funds f ON cfr.fund_id = f.id
      WHERE cfr.category_id = ${id}
      ORDER BY f.name
    `;

    const enhancedCategory = {
      ...category,
      associated_funds: associatedFunds,
    };

    return NextResponse.json(enhancedCategory);
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = UpdateCategorySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, fund_id, fund_ids, tipo_gasto, default_day } = validationResult.data;

    // Check if category exists
    const [existingCategory] =
      await sql`SELECT * FROM categories WHERE id = ${id}`;
    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Handle fund relationships update
    if (fund_ids !== undefined) {
      // New approach: update multiple fund relationships
      if (fund_ids.length > 0) {
        // Validate that all funds exist
        const existingFunds = await sql`
          SELECT id FROM funds WHERE id = ANY(${fund_ids})
        `;
        if (existingFunds.length !== fund_ids.length) {
          return NextResponse.json(
            { error: "Algunos fondos especificados no existen" },
            { status: 400 }
          );
        }

        // Check if removing relationships would affect existing expenses
        const currentRelationships = await sql`
          SELECT fund_id FROM category_fund_relationships 
          WHERE category_id = ${id}
        `;

        const currentFundIds = currentRelationships.map((r: any) => r.fund_id);
        const fundsToRemove = currentFundIds.filter(
          (fundId: string) => !fund_ids.includes(fundId)
        );

        if (fundsToRemove.length > 0) {
          // Check if there are expenses with these fund-category combinations
          const expensesWithRemovedFunds = await sql`
            SELECT COUNT(*) as count
            FROM expenses e
            WHERE e.category_id = ${id} 
            AND e.destination_fund_id = ANY(${fundsToRemove})
          `;

          if (expensesWithRemovedFunds[0].count > 0) {
            return NextResponse.json(
              {
                error: `No se puede eliminar la relación porque existen ${expensesWithRemovedFunds[0].count} gastos registrados con los fondos que se van a eliminar`,
              },
              { status: 400 }
            );
          }
        }

        // Remove all existing relationships
        await sql`
          DELETE FROM category_fund_relationships 
          WHERE category_id = ${id}
        `;

        // Add new relationships
        for (const fundId of fund_ids) {
          await sql`
            INSERT INTO category_fund_relationships (category_id, fund_id)
            VALUES (${id}, ${fundId})
            ON CONFLICT (category_id, fund_id) DO NOTHING
          `;
        }

        // Update the legacy fund_id field to the first fund for backward compatibility
        await sql`
          UPDATE categories
          SET fund_id = ${fund_ids[0]}
          WHERE id = ${id}
        `;
      } else {
        // If empty array, remove all relationships but check for existing expenses first
        const expensesCount = await sql`
          SELECT COUNT(*) as count
          FROM expenses e
          WHERE e.category_id = ${id}
        `;

        if (expensesCount[0].count > 0) {
          return NextResponse.json(
            {
              error: `No se puede eliminar todas las relaciones de fondo porque existen ${expensesCount[0].count} gastos registrados para esta categoría`,
            },
            { status: 400 }
          );
        }

        await sql`
          DELETE FROM category_fund_relationships 
          WHERE category_id = ${id}
        `;

        // Set to default fund for backward compatibility
        const [defaultFund] = await sql`
          SELECT id FROM funds WHERE name = ${DEFAULT_FUND_NAME}
        `;
        if (defaultFund) {
          await sql`
            UPDATE categories
            SET fund_id = ${defaultFund.id}
            WHERE id = ${id}
          `;
        }
      }
    }

    // Handle backward compatibility fund_id update
    if (fund_id !== undefined) {
      if (fund_id) {
        const [fund] = await sql`SELECT id FROM funds WHERE id = ${fund_id}`;
        if (!fund) {
          return NextResponse.json(
            { error: "El fondo especificado no existe" },
            { status: 400 }
          );
        }
      } else {
        // If fund_id is explicitly null, assign to default fund
        const [defaultFund] = await sql`
          SELECT id FROM funds WHERE name = ${DEFAULT_FUND_NAME}
        `;
        if (defaultFund) {
          validationResult.data.fund_id = defaultFund.id;
        }
      }
    }

    // Build update query based on provided fields
    let updatedCategory;

    // Handle updates by building multiple conditional queries
    if (
      name !== undefined &&
      fund_id !== undefined &&
      tipo_gasto !== undefined &&
      default_day !== undefined
    ) {
      [updatedCategory] = await sql`
        UPDATE categories
        SET name = ${name}, fund_id = ${validationResult.data.fund_id}, tipo_gasto = ${tipo_gasto}, default_day = ${default_day}
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (
      name !== undefined &&
      fund_id !== undefined &&
      tipo_gasto !== undefined
    ) {
      [updatedCategory] = await sql`
        UPDATE categories
        SET name = ${name}, fund_id = ${validationResult.data.fund_id}, tipo_gasto = ${tipo_gasto}
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (
      name !== undefined &&
      fund_id !== undefined &&
      default_day !== undefined
    ) {
      [updatedCategory] = await sql`
        UPDATE categories
        SET name = ${name}, fund_id = ${validationResult.data.fund_id}, default_day = ${default_day}
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (
      name !== undefined &&
      tipo_gasto !== undefined &&
      default_day !== undefined
    ) {
      [updatedCategory] = await sql`
        UPDATE categories
        SET name = ${name}, tipo_gasto = ${tipo_gasto}, default_day = ${default_day}
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (
      fund_id !== undefined &&
      tipo_gasto !== undefined &&
      default_day !== undefined
    ) {
      [updatedCategory] = await sql`
        UPDATE categories
        SET fund_id = ${validationResult.data.fund_id}, tipo_gasto = ${tipo_gasto}, default_day = ${default_day}
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (name !== undefined && fund_id !== undefined) {
      [updatedCategory] = await sql`
        UPDATE categories
        SET name = ${name}, fund_id = ${validationResult.data.fund_id}
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (name !== undefined && tipo_gasto !== undefined) {
      [updatedCategory] = await sql`
        UPDATE categories
        SET name = ${name}, tipo_gasto = ${tipo_gasto}
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (name !== undefined && default_day !== undefined) {
      [updatedCategory] = await sql`
        UPDATE categories
        SET name = ${name}, default_day = ${default_day}
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (fund_id !== undefined && tipo_gasto !== undefined) {
      [updatedCategory] = await sql`
        UPDATE categories
        SET fund_id = ${validationResult.data.fund_id}, tipo_gasto = ${tipo_gasto}
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (fund_id !== undefined && default_day !== undefined) {
      [updatedCategory] = await sql`
        UPDATE categories
        SET fund_id = ${validationResult.data.fund_id}, default_day = ${default_day}
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (tipo_gasto !== undefined && default_day !== undefined) {
      [updatedCategory] = await sql`
        UPDATE categories
        SET tipo_gasto = ${tipo_gasto}, default_day = ${default_day}
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (name !== undefined) {
      [updatedCategory] = await sql`
        UPDATE categories
        SET name = ${name}
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (fund_id !== undefined) {
      [updatedCategory] = await sql`
        UPDATE categories
        SET fund_id = ${validationResult.data.fund_id}
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (tipo_gasto !== undefined) {
      [updatedCategory] = await sql`
        UPDATE categories
        SET tipo_gasto = ${tipo_gasto}
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (default_day !== undefined) {
      [updatedCategory] = await sql`
        UPDATE categories
        SET default_day = ${default_day}
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (fund_ids === undefined) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // If only fund_ids was updated, get the current category
    if (!updatedCategory) {
      [updatedCategory] = await sql`
        SELECT * FROM categories WHERE id = ${id}
      `;
    }

    if (!updatedCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Fetch the updated category with fund information and associated funds
    const [categoryWithFund] = await sql`
      SELECT 
        c.*,
        f.name as fund_name
      FROM categories c
      LEFT JOIN funds f ON c.fund_id = f.id
      WHERE c.id = ${id}
    `;

    // Get associated funds
    const associatedFunds = await sql`
      SELECT 
        f.id,
        f.name,
        f.description,
        f.initial_balance,
        f.current_balance,
        f.start_date,
        f.created_at,
        f.updated_at
      FROM category_fund_relationships cfr
      JOIN funds f ON cfr.fund_id = f.id
      WHERE cfr.category_id = ${id}
      ORDER BY f.name
    `;

    // If default_day was updated, sync all related budget default_dates
    if (default_day !== undefined) {
      const syncResult = await updateBudgetDefaultDatesForCategory(id, default_day);
      console.log(`Budget sync result: ${syncResult.message}`);
    }

    const enhancedCategory = {
      ...categoryWithFund,
      associated_funds: associatedFunds,
      budgets_updated: default_day !== undefined ? true : undefined,
    };

    return NextResponse.json(enhancedCategory);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [deletedCategory] = await sql`
      DELETE FROM categories
      WHERE id = ${id}
      RETURNING *
    `;

    if (!deletedCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(deletedCategory);
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
