import { sql } from '@/lib/db';

export interface MigrationResult {
  success: boolean;
  message: string;
  migratedRelationships?: number;
  errors?: string[];
  warnings?: string[];
}

export interface MigrationStatus {
  isTableCreated: boolean;
  hasExistingRelationships: boolean;
  categoriesWithoutRelationships: number;
  categoriesWithLegacyFundId: number;
  totalCategories: number;
}

/**
 * Checks the current migration status
 */
export async function checkMigrationStatus(): Promise<MigrationStatus> {
  try {
    // Check if the category_fund_relationships table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'category_fund_relationships'
      ) as exists
    `;
    const isTableCreated = tableExists[0].exists;

    let hasExistingRelationships = false;
    let categoriesWithoutRelationships = 0;
    let categoriesWithLegacyFundId = 0;
    let totalCategories = 0;

    if (isTableCreated) {
      // Check if there are existing relationships
      const relationshipCount = await sql`
        SELECT COUNT(*) as count FROM category_fund_relationships
      `;
      hasExistingRelationships = parseInt(relationshipCount[0].count) > 0;

      // Count categories without relationships
      const categoriesWithoutRelationshipsResult = await sql`
        SELECT COUNT(*) as count
        FROM categories c
        WHERE NOT EXISTS (
          SELECT 1 FROM category_fund_relationships cfr 
          WHERE cfr.category_id = c.id
        )
      `;
      categoriesWithoutRelationships = parseInt(
        categoriesWithoutRelationshipsResult[0].count
      );
    }

    // Count categories with legacy fund_id
    const categoriesWithLegacyResult = await sql`
      SELECT COUNT(*) as count
      FROM categories
      WHERE fund_id IS NOT NULL
    `;
    categoriesWithLegacyFundId = parseInt(categoriesWithLegacyResult[0].count);

    // Total categories
    const totalCategoriesResult = await sql`
      SELECT COUNT(*) as count FROM categories
    `;
    totalCategories = parseInt(totalCategoriesResult[0].count);

    return {
      isTableCreated,
      hasExistingRelationships,
      categoriesWithoutRelationships,
      categoriesWithLegacyFundId,
      totalCategories,
    };
  } catch (error) {
    console.error('Error checking migration status:', error);
    throw new Error('Failed to check migration status');
  }
}

/**
 * Migrates existing single fund relationships to the new many-to-many format
 */
export async function migrateCategoryFundRelationships(): Promise<MigrationResult> {
  try {
    const status = await checkMigrationStatus();
    const warnings: string[] = [];
    const errors: string[] = [];

    // If table doesn't exist, create it first
    if (!status.isTableCreated) {
      await createCategoryFundRelationshipsTable();
      warnings.push('Created category_fund_relationships table');
    }

    // Migrate existing fund_id relationships
    let migratedCount = 0;
    if (status.categoriesWithLegacyFundId > 0) {
      const migratedRows = await sql`
        INSERT INTO category_fund_relationships (category_id, fund_id)
        SELECT id, fund_id 
        FROM categories 
        WHERE fund_id IS NOT NULL
        ON CONFLICT (category_id, fund_id) DO NOTHING
        RETURNING id
      `;
      migratedCount = migratedRows.length;

      if (migratedCount > 0) {
        warnings.push(
          `Migrated ${migratedCount} existing category-fund relationships`
        );
      }
    }

    // Handle categories without any relationships
    if (status.categoriesWithoutRelationships > 0) {
      const defaultFund = await getDefaultFund();
      if (defaultFund) {
        const categoriesWithoutRelationships = await sql`
          SELECT id, name
          FROM categories c
          WHERE NOT EXISTS (
            SELECT 1 FROM category_fund_relationships cfr 
            WHERE cfr.category_id = c.id
          )
          AND fund_id IS NULL
        `;

        if (categoriesWithoutRelationships.length > 0) {
          warnings.push(
            `Found ${categoriesWithoutRelationships.length} categories without fund relationships. These will accept expenses from any fund.`
          );
        }
      }
    }

    // Validate data integrity after migration
    const validationResult = await validateMigrationIntegrity();
    if (!validationResult.success) {
      errors.push(...(validationResult.errors || []));
    }

    return {
      success: errors.length === 0,
      message:
        errors.length === 0
          ? 'Category fund relationships migration completed successfully'
          : 'Migration completed with errors',
      migratedRelationships: migratedCount,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error('Error during migration:', error);
    return {
      success: false,
      message: 'Migration failed',
      errors: [(error as Error).message],
    };
  }
}

/**
 * Creates the category_fund_relationships table and related database objects
 */
async function createCategoryFundRelationshipsTable(): Promise<void> {
  await sql`BEGIN`;

  try {
    // Create the table
    await sql`
      CREATE TABLE IF NOT EXISTS category_fund_relationships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category_id, fund_id)
      )
    `;

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_category_fund_relationships_category_id 
      ON category_fund_relationships(category_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_category_fund_relationships_fund_id 
      ON category_fund_relationships(fund_id)
    `;

    // Create validation function
    await sql`
      CREATE OR REPLACE FUNCTION validate_category_fund_relationship_deletion(
        p_category_id UUID,
        p_fund_id UUID
      ) RETURNS TABLE (
        has_expenses BOOLEAN,
        expense_count INTEGER,
        can_delete BOOLEAN
      ) AS $func$
      BEGIN
        SELECT 
          COUNT(*) > 0 as has_expenses,
          COUNT(*)::INTEGER as expense_count,
          COUNT(*) = 0 as can_delete
        INTO has_expenses, expense_count, can_delete
        FROM expenses e
        WHERE e.category_id = p_category_id;
        
        RETURN QUERY SELECT has_expenses, expense_count, can_delete;
      END;
      $func$ LANGUAGE plpgsql
    `;

    // Create function to get category funds
    await sql`
      CREATE OR REPLACE FUNCTION get_category_funds(p_category_id UUID)
      RETURNS TABLE (
        fund_id UUID,
        fund_name VARCHAR(255),
        fund_description TEXT
      ) AS $func$
      BEGIN
        RETURN QUERY
        SELECT f.id, f.name, f.description
        FROM funds f
        INNER JOIN category_fund_relationships cfr ON f.id = cfr.fund_id
        WHERE cfr.category_id = p_category_id
        ORDER BY f.name;
      END;
      $func$ LANGUAGE plpgsql
    `;

    // Create function to check fund restrictions
    await sql`
      CREATE OR REPLACE FUNCTION category_has_fund_restrictions(p_category_id UUID)
      RETURNS BOOLEAN AS $func$
      DECLARE
        relationship_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO relationship_count
        FROM category_fund_relationships
        WHERE category_id = p_category_id;
        
        RETURN relationship_count > 0;
      END;
      $func$ LANGUAGE plpgsql
    `;

    await sql`COMMIT`;
  } catch (error) {
    await sql`ROLLBACK`;
    throw error;
  }
}

/**
 * Gets the default fund (usually "Disponible")
 */
async function getDefaultFund(): Promise<{ id: string; name: string } | null> {
  try {
    const [defaultFund] = await sql`
      SELECT id, name FROM funds 
      WHERE name = 'Disponible' OR name ILIKE '%disponible%'
      ORDER BY name
      LIMIT 1
    `;
    return defaultFund || null;
  } catch (error) {
    console.error('Error getting default fund:', error);
    return null;
  }
}

/**
 * Validates migration integrity
 */
async function validateMigrationIntegrity(): Promise<{
  success: boolean;
  errors?: string[];
}> {
  const errors: string[] = [];

  try {
    // Check for orphaned relationships
    const orphanedRelationships = await sql`
      SELECT COUNT(*) as count
      FROM category_fund_relationships cfr
      WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = cfr.category_id)
         OR NOT EXISTS (SELECT 1 FROM funds f WHERE f.id = cfr.fund_id)
    `;

    if (parseInt(orphanedRelationships[0].count) > 0) {
      errors.push('Found orphaned category-fund relationships');
    }

    // Check for categories with both legacy fund_id and new relationships
    const duplicateRelationships = await sql`
      SELECT c.id, c.name, c.fund_id
      FROM categories c
      WHERE c.fund_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM category_fund_relationships cfr 
          WHERE cfr.category_id = c.id AND cfr.fund_id != c.fund_id
        )
    `;

    if (duplicateRelationships.length > 0) {
      errors.push(
        `Found ${duplicateRelationships.length} categories with conflicting fund relationships`
      );
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('Error validating migration integrity:', error);
    return {
      success: false,
      errors: ['Failed to validate migration integrity'],
    };
  }
}

/**
 * Converts a category from legacy single fund to multiple fund relationships
 */
export async function convertCategoryToMultiFund(
  categoryId: string,
  fundIds: string[]
): Promise<MigrationResult> {
  try {
    await sql`BEGIN`;

    // Validate category exists
    const [category] = await sql`
      SELECT id, name, fund_id FROM categories WHERE id = ${categoryId}
    `;

    if (!category) {
      await sql`ROLLBACK`;
      return {
        success: false,
        message: 'Category not found',
        errors: ['Category not found'],
      };
    }

    // Validate all funds exist
    if (fundIds.length > 0) {
      const existingFunds = await sql`
        SELECT id FROM funds WHERE id = ANY(${fundIds})
      `;

      if (existingFunds.length !== fundIds.length) {
        await sql`ROLLBACK`;
        return {
          success: false,
          message: 'Some funds do not exist',
          errors: ['Some specified funds do not exist'],
        };
      }
    }

    // Remove existing relationships for this category
    await sql`
      DELETE FROM category_fund_relationships WHERE category_id = ${categoryId}
    `;

    // Add new relationships
    let addedRelationships = 0;
    for (const fundId of fundIds) {
      await sql`
        INSERT INTO category_fund_relationships (category_id, fund_id)
        VALUES (${categoryId}, ${fundId})
        ON CONFLICT (category_id, fund_id) DO NOTHING
      `;
      addedRelationships++;
    }

    // Update legacy fund_id to first fund for backward compatibility
    if (fundIds.length > 0) {
      await sql`
        UPDATE categories SET fund_id = ${fundIds[0]} WHERE id = ${categoryId}
      `;
    } else {
      // If no funds specified, set to default fund
      const defaultFund = await getDefaultFund();
      if (defaultFund) {
        await sql`
          UPDATE categories SET fund_id = ${defaultFund.id} WHERE id = ${categoryId}
        `;
      }
    }

    await sql`COMMIT`;

    return {
      success: true,
      message: `Successfully converted category "${category.name}" to multi-fund relationships`,
      migratedRelationships: addedRelationships,
    };
  } catch (error) {
    await sql`ROLLBACK`;
    console.error('Error converting category to multi-fund:', error);
    return {
      success: false,
      message: 'Failed to convert category',
      errors: [(error as Error).message],
    };
  }
}

/**
 * Ensures backward compatibility by creating fallback relationships
 */
export async function ensureBackwardCompatibility(): Promise<MigrationResult> {
  try {
    const warnings: string[] = [];
    let processedCategories = 0;

    // Find categories that have fund_id but no relationships
    const categoriesNeedingSync = await sql`
      SELECT c.id, c.name, c.fund_id, f.name as fund_name
      FROM categories c
      LEFT JOIN funds f ON c.fund_id = f.id
      WHERE c.fund_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM category_fund_relationships cfr 
          WHERE cfr.category_id = c.id AND cfr.fund_id = c.fund_id
        )
    `;

    for (const category of categoriesNeedingSync) {
      await sql`
        INSERT INTO category_fund_relationships (category_id, fund_id)
        VALUES (${category.id}, ${category.fund_id})
        ON CONFLICT (category_id, fund_id) DO NOTHING
      `;
      processedCategories++;
      warnings.push(
        `Synced relationship for category "${category.name}" with fund "${category.fund_name}"`
      );
    }

    // Find categories without any fund relationships and assign default fund
    const categoriesWithoutFunds = await sql`
      SELECT c.id, c.name
      FROM categories c
      WHERE c.fund_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM category_fund_relationships cfr 
          WHERE cfr.category_id = c.id
        )
    `;

    if (categoriesWithoutFunds.length > 0) {
      const defaultFund = await getDefaultFund();
      if (defaultFund) {
        for (const category of categoriesWithoutFunds) {
          await sql`
            UPDATE categories SET fund_id = ${defaultFund.id} WHERE id = ${category.id}
          `;
          await sql`
            INSERT INTO category_fund_relationships (category_id, fund_id)
            VALUES (${category.id}, ${defaultFund.id})
            ON CONFLICT (category_id, fund_id) DO NOTHING
          `;
          processedCategories++;
          warnings.push(
            `Assigned default fund "${defaultFund.name}" to category "${category.name}"`
          );
        }
      } else {
        warnings.push(
          `Found ${categoriesWithoutFunds.length} categories without fund assignments, but no default fund available`
        );
      }
    }

    return {
      success: true,
      message: 'Backward compatibility ensured successfully',
      migratedRelationships: processedCategories,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error('Error ensuring backward compatibility:', error);
    return {
      success: false,
      message: 'Failed to ensure backward compatibility',
      errors: [(error as Error).message],
    };
  }
}
