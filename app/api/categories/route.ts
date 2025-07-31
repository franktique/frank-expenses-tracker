import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { CreateCategorySchema, DEFAULT_FUND_NAME } from "@/types/funds";

export async function GET() {
  try {
    const categories = await sql`
      SELECT 
        c.*,
        f.name as fund_name
      FROM categories c
      LEFT JOIN funds f ON c.fund_id = f.id
      ORDER BY c.name
    `;
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = CreateCategorySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, fund_id } = validationResult.data;

    // If fund_id is provided, validate that the fund exists
    if (fund_id) {
      const [fund] = await sql`SELECT id FROM funds WHERE id = ${fund_id}`;
      if (!fund) {
        return NextResponse.json(
          { error: "El fondo especificado no existe" },
          { status: 400 }
        );
      }
    }

    // If no fund_id provided, assign to default fund
    let finalFundId = fund_id;
    if (!finalFundId) {
      const [defaultFund] = await sql`
        SELECT id FROM funds WHERE name = ${DEFAULT_FUND_NAME}
      `;
      if (defaultFund) {
        finalFundId = defaultFund.id;
      }
    }

    const [newCategory] = await sql`
      INSERT INTO categories (name, fund_id)
      VALUES (${name}, ${finalFundId})
      RETURNING *
    `;

    // Fetch the category with fund information
    const [categoryWithFund] = await sql`
      SELECT 
        c.*,
        f.name as fund_name
      FROM categories c
      LEFT JOIN funds f ON c.fund_id = f.id
      WHERE c.id = ${newCategory.id}
    `;

    return NextResponse.json(categoryWithFund);
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
