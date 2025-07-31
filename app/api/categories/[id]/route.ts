import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { UpdateCategorySchema, DEFAULT_FUND_NAME } from "@/types/funds";

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

    return NextResponse.json(category);
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
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();

    // Validate request body
    const validationResult = UpdateCategorySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, fund_id } = validationResult.data;

    // Check if category exists
    const [existingCategory] =
      await sql`SELECT * FROM categories WHERE id = ${id}`;
    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // If fund_id is provided, validate that the fund exists
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

    if (name !== undefined && fund_id !== undefined) {
      [updatedCategory] = await sql`
        UPDATE categories
        SET name = ${name}, fund_id = ${validationResult.data.fund_id}
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
    } else {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    if (!updatedCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Fetch the updated category with fund information
    const [categoryWithFund] = await sql`
      SELECT 
        c.*,
        f.name as fund_name
      FROM categories c
      LEFT JOIN funds f ON c.fund_id = f.id
      WHERE c.id = ${id}
    `;

    return NextResponse.json(categoryWithFund);
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
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
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
