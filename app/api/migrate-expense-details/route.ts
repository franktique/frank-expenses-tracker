import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const db = sql;

    // Create category_subgroups table
    await db`
      CREATE TABLE IF NOT EXISTS category_subgroups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_category_subgroup_name UNIQUE(category_id, name)
      )
    `;

    await db`
      CREATE INDEX IF NOT EXISTS idx_category_subgroups_category_id
        ON category_subgroups(category_id)
    `;

    // Create category_items table
    await db`
      CREATE TABLE IF NOT EXISTS category_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subgroup_id UUID NOT NULL REFERENCES category_subgroups(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        default_unit VARCHAR(50),
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_subgroup_item_name UNIQUE(subgroup_id, name)
      )
    `;

    await db`
      CREATE INDEX IF NOT EXISTS idx_category_items_subgroup_id
        ON category_items(subgroup_id)
    `;

    // Create expense_details table
    await db`
      CREATE TABLE IF NOT EXISTS expense_details (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
        item_id UUID NOT NULL REFERENCES category_items(id) ON DELETE RESTRICT,
        amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
        quantity DECIMAL(10,4),
        unit VARCHAR(50),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_expense_item UNIQUE(expense_id, item_id)
      )
    `;

    await db`
      CREATE INDEX IF NOT EXISTS idx_expense_details_expense_id
        ON expense_details(expense_id)
    `;

    await db`
      CREATE INDEX IF NOT EXISTS idx_expense_details_item_id
        ON expense_details(item_id)
    `;

    // Add store_name column to expenses if it doesn't exist
    const checkStoreColumn = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'expenses' AND column_name = 'store_name'
    `);

    let storeNameAdded = false;
    if (checkStoreColumn.length === 0) {
      await db`
        ALTER TABLE expenses ADD COLUMN store_name VARCHAR(255)
      `;
      await db`
        CREATE INDEX IF NOT EXISTS idx_expenses_store_name ON expenses(store_name)
      `;
      storeNameAdded = true;
    }

    return NextResponse.json({
      success: true,
      message: 'Expense details tables created successfully',
      created: true,
      store_name_added: storeNameAdded,
    });
  } catch (error) {
    console.error('Error creating expense details tables:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create expense details tables',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = sql;

    await db`DROP TABLE IF EXISTS expense_details`;
    await db`DROP TABLE IF EXISTS category_items`;
    await db`DROP TABLE IF EXISTS category_subgroups`;

    const checkStoreColumn = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'expenses' AND column_name = 'store_name'
    `);

    if (checkStoreColumn.length > 0) {
      await db`DROP INDEX IF EXISTS idx_expenses_store_name`;
      await db`ALTER TABLE expenses DROP COLUMN IF EXISTS store_name`;
    }

    return NextResponse.json({
      success: true,
      message: 'Expense details tables removed successfully',
      deleted: true,
    });
  } catch (error) {
    console.error('Error removing expense details tables:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove expense details tables',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
