import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { CreateCategorySchema, DEFAULT_FUND_NAME } from '@/types/funds';

export async function GET() {
  try {
    // Get categories with backward compatibility fund info
    const categories = await sql`
      SELECT 
        c.*,
        f.name as fund_name
      FROM categories c
      LEFT JOIN funds f ON c.fund_id = f.id
      ORDER BY c.name
    `;

    // Get associated funds for each category from the new relationship table
    const categoryFunds = await sql`
      SELECT 
        cfr.category_id,
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
      ORDER BY cfr.category_id, f.name
    `;

    // Group funds by category
    const fundsByCategory = categoryFunds.reduce((acc: any, row: any) => {
      if (!acc[row.category_id]) {
        acc[row.category_id] = [];
      }
      acc[row.category_id].push({
        id: row.id,
        name: row.name,
        description: row.description,
        initial_balance: row.initial_balance,
        current_balance: row.current_balance,
        start_date: row.start_date,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
      return acc;
    }, {});

    // Enhance categories with associated_funds array
    const enhancedCategories = categories.map((category: any) => ({
      ...category,
      associated_funds: fundsByCategory[category.id] || [],
    }));

    return NextResponse.json(enhancedCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Enhanced validation to support both old and new format
    const validationResult = CreateCategorySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, fund_id, tipo_gasto, default_day, recurrence_frequency } =
      validationResult.data;
    const { fund_ids } = body; // Extract fund_ids from raw body

    // Determine which fund approach to use
    let fundsToAssociate: string[] = [];

    if (fund_ids && Array.isArray(fund_ids)) {
      // New approach: use fund_ids array
      fundsToAssociate = fund_ids;

      // Validate that all funds exist
      if (fundsToAssociate.length > 0) {
        const existingFunds = await sql`
          SELECT id FROM funds WHERE id = ANY(${fundsToAssociate})
        `;
        if (existingFunds.length !== fundsToAssociate.length) {
          return NextResponse.json(
            { error: 'Algunos fondos especificados no existen' },
            { status: 400 }
          );
        }
      }
    } else if (fund_id) {
      // Backward compatibility: use single fund_id
      const [fund] = await sql`SELECT id FROM funds WHERE id = ${fund_id}`;
      if (!fund) {
        return NextResponse.json(
          { error: 'El fondo especificado no existe' },
          { status: 400 }
        );
      }
      fundsToAssociate = [fund_id];
    }

    // If no funds specified, assign to default fund for backward compatibility
    let finalFundId = fund_id;
    if (fundsToAssociate.length === 0 && !fund_id) {
      const [defaultFund] = await sql`
        SELECT id FROM funds WHERE name = ${DEFAULT_FUND_NAME}
      `;
      if (defaultFund) {
        finalFundId = defaultFund.id;
        fundsToAssociate = [defaultFund.id];
      }
    }

    // Create the category
    const [newCategory] = await sql`
      INSERT INTO categories (name, fund_id, tipo_gasto, default_day, recurrence_frequency)
      VALUES (${name}, ${finalFundId}, ${tipo_gasto || null}, ${default_day || null}, ${recurrence_frequency || null})
      RETURNING *
    `;

    // Create fund relationships if any funds specified
    if (fundsToAssociate.length > 0) {
      for (const fundId of fundsToAssociate) {
        await sql`
          INSERT INTO category_fund_relationships (category_id, fund_id)
          VALUES (${newCategory.id}, ${fundId})
          ON CONFLICT (category_id, fund_id) DO NOTHING
        `;
      }
    }

    // Fetch the category with fund information and associated funds
    const [categoryWithFund] = await sql`
      SELECT 
        c.*,
        f.name as fund_name
      FROM categories c
      LEFT JOIN funds f ON c.fund_id = f.id
      WHERE c.id = ${newCategory.id}
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
      WHERE cfr.category_id = ${newCategory.id}
      ORDER BY f.name
    `;

    const enhancedCategory = {
      ...categoryWithFund,
      associated_funds: associatedFunds,
    };

    return NextResponse.json(enhancedCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
