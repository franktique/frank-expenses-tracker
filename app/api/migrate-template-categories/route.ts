/**
 * Template Categories Migration API
 * Creates template_categories junction table to store category relationships in templates
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * POST /api/migrate-template-categories
 * Run database migration to create template_categories table
 */
export async function POST() {
  try {
    console.log('Starting template categories migration...');

    // Step 1: Create template_categories table
    await sql`
      CREATE TABLE IF NOT EXISTS template_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_subgroup_id UUID NOT NULL REFERENCES template_subgroups(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        order_within_subgroup INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(template_subgroup_id, category_id)
      );
    `;
    console.log('✓ Created template_categories table');

    // Step 2: Create index for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_template_categories_template_subgroup_id
      ON template_categories(template_subgroup_id);
    `;
    console.log('✓ Created index idx_template_categories_template_subgroup_id');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_template_categories_category_id
      ON template_categories(category_id);
    `;
    console.log('✓ Created index idx_template_categories_category_id');

    console.log('Migration completed successfully!');

    return NextResponse.json(
      {
        success: true,
        message: 'Template categories migration completed successfully',
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error running template categories migration:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to run template categories migration';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
