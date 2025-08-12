import { sql } from "@/lib/db";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: any;
}

export interface CategoryFundValidationData {
  categoryId: string;
  fundId?: string;
  expenseCount: number;
  remainingFundRelationships: number;
  affectedFunds: string[];
  hasActiveExpenses: boolean;
}

/**
 * Validates if a category-fund relationship can be safely deleted
 */
export async function validateCategoryFundDeletion(
  categoryId: string,
  fundId: string
): Promise<ValidationResult> {
  try {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if category exists
    const [category] = await sql`
      SELECT id, name FROM categories WHERE id = ${categoryId}
    `;

    if (!category) {
      errors.push("La categoría especificada no existe");
      return { isValid: false, errors, warnings };
    }

    // Check if fund exists
    const [fund] = await sql`
      SELECT id, name FROM funds WHERE id = ${fundId}
    `;

    if (!fund) {
      errors.push("El fondo especificado no existe");
      return { isValid: false, errors, warnings };
    }

    // Check if the relationship exists
    const [relationship] = await sql`
      SELECT id FROM category_fund_relationships 
      WHERE category_id = ${categoryId} AND fund_id = ${fundId}
    `;

    if (!relationship) {
      errors.push("La relación entre la categoría y el fondo no existe");
      return { isValid: false, errors, warnings };
    }

    // Check for existing expenses with this category
    const expenseCount = await sql`
      SELECT COUNT(*) as count
      FROM expenses e
      WHERE e.category_id = ${categoryId}
    `;

    const totalExpenses = parseInt(expenseCount[0].count);

    // Get remaining fund relationships for this category
    const remainingRelationships = await sql`
      SELECT COUNT(*) as count
      FROM category_fund_relationships
      WHERE category_id = ${categoryId} AND fund_id != ${fundId}
    `;

    const remainingCount = parseInt(remainingRelationships[0].count);

    // Get all funds currently associated with this category
    const associatedFunds = await sql`
      SELECT f.name
      FROM funds f
      INNER JOIN category_fund_relationships cfr ON f.id = cfr.fund_id
      WHERE cfr.category_id = ${categoryId}
    `;

    const affectedFunds = associatedFunds.map((f: any) => f.name);

    const validationData: CategoryFundValidationData = {
      categoryId,
      fundId,
      expenseCount: totalExpenses,
      remainingFundRelationships: remainingCount,
      affectedFunds,
      hasActiveExpenses: totalExpenses > 0,
    };

    // Add warnings for potential issues
    if (totalExpenses > 0 && remainingCount === 0) {
      warnings.push(
        `Esta categoría tiene ${totalExpenses} gastos registrados. Al eliminar la última relación de fondo, la categoría permitirá gastos desde cualquier fondo.`
      );
    }

    if (totalExpenses > 0 && remainingCount > 0) {
      warnings.push(
        `Esta categoría tiene ${totalExpenses} gastos registrados. Los gastos existentes no se verán afectados, pero los nuevos gastos solo podrán usar los fondos restantes.`
      );
    }

    return {
      isValid: true,
      errors,
      warnings,
      data: validationData,
    };
  } catch (error) {
    console.error("Error validating category-fund deletion:", error);
    return {
      isValid: false,
      errors: ["Error interno del servidor al validar la eliminación"],
      warnings: [],
    };
  }
}

/**
 * Validates if category funds can be updated
 */
export async function validateCategoryFundUpdate(
  categoryId: string,
  newFundIds: string[]
): Promise<ValidationResult> {
  try {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if category exists
    const [category] = await sql`
      SELECT id, name FROM categories WHERE id = ${categoryId}
    `;

    if (!category) {
      errors.push("La categoría especificada no existe");
      return { isValid: false, errors, warnings };
    }

    // Validate all fund IDs exist
    if (newFundIds.length > 0) {
      const existingFunds = await sql`
        SELECT id, name FROM funds WHERE id = ANY(${newFundIds})
      `;

      if (existingFunds.length !== newFundIds.length) {
        const existingFundIds = existingFunds.map((f: any) => f.id);
        const invalidFundIds = newFundIds.filter(
          (id) => !existingFundIds.includes(id)
        );
        errors.push(
          `Los siguientes fondos no existen: ${invalidFundIds.join(", ")}`
        );
        return { isValid: false, errors, warnings };
      }
    }

    // Get current fund relationships
    const currentRelationships = await sql`
      SELECT fund_id, f.name as fund_name
      FROM category_fund_relationships cfr
      INNER JOIN funds f ON cfr.fund_id = f.id
      WHERE cfr.category_id = ${categoryId}
    `;

    const currentFundIds = currentRelationships.map((r: any) => r.fund_id);
    const currentFundNames = currentRelationships.map((r: any) => r.fund_name);

    // Check for existing expenses
    const expenseCount = await sql`
      SELECT COUNT(*) as count
      FROM expenses e
      WHERE e.category_id = ${categoryId}
    `;

    const totalExpenses = parseInt(expenseCount[0].count);

    // Identify funds being removed
    const removedFundIds = currentFundIds.filter(
      (id: string) => !newFundIds.includes(id)
    );

    const removedFundNames = currentRelationships
      .filter((r: any) => removedFundIds.includes(r.fund_id))
      .map((r: any) => r.fund_name);

    // Add warnings for potential issues
    if (totalExpenses > 0 && removedFundIds.length > 0) {
      warnings.push(
        `Esta categoría tiene ${totalExpenses} gastos registrados. Se eliminarán las relaciones con: ${removedFundNames.join(
          ", "
        )}. Los gastos existentes no se verán afectados.`
      );
    }

    if (totalExpenses > 0 && newFundIds.length === 0) {
      warnings.push(
        `Esta categoría tiene ${totalExpenses} gastos registrados. Al eliminar todas las relaciones de fondos, la categoría permitirá gastos desde cualquier fondo.`
      );
    }

    // Identify new funds being added
    const addedFundIds = newFundIds.filter(
      (id: string) => !currentFundIds.includes(id)
    );

    if (addedFundIds.length > 0) {
      const addedFunds = await sql`
        SELECT name FROM funds WHERE id = ANY(${addedFundIds})
      `;
      const addedFundNames = addedFunds.map((f: any) => f.name);
      warnings.push(
        `Se agregarán relaciones con los siguientes fondos: ${addedFundNames.join(
          ", "
        )}`
      );
    }

    return {
      isValid: true,
      errors,
      warnings,
      data: {
        categoryId,
        currentFundIds,
        newFundIds,
        removedFundIds,
        addedFundIds,
        expenseCount: totalExpenses,
        hasActiveExpenses: totalExpenses > 0,
      },
    };
  } catch (error) {
    console.error("Error validating category-fund update:", error);
    return {
      isValid: false,
      errors: ["Error interno del servidor al validar la actualización"],
      warnings: [],
    };
  }
}

/**
 * Validates if a fund-category combination is valid for expense creation
 */
export async function validateExpenseFundCategory(
  categoryId: string,
  fundId: string
): Promise<ValidationResult> {
  try {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if category exists
    const [category] = await sql`
      SELECT id, name FROM categories WHERE id = ${categoryId}
    `;

    if (!category) {
      errors.push("La categoría especificada no existe");
      return { isValid: false, errors, warnings };
    }

    // Check if fund exists
    const [fund] = await sql`
      SELECT id, name FROM funds WHERE id = ${fundId}
    `;

    if (!fund) {
      errors.push("El fondo especificado no existe");
      return { isValid: false, errors, warnings };
    }

    // Check if category has specific fund relationships
    const categoryFunds = await sql`
      SELECT fund_id, f.name as fund_name
      FROM category_fund_relationships cfr
      INNER JOIN funds f ON cfr.fund_id = f.id
      WHERE cfr.category_id = ${categoryId}
    `;

    // If category has specific fund relationships, validate the fund is allowed
    if (categoryFunds.length > 0) {
      const allowedFundIds = categoryFunds.map((cf: any) => cf.fund_id);

      if (!allowedFundIds.includes(fundId)) {
        const allowedFundNames = categoryFunds.map((cf: any) => cf.fund_name);
        errors.push(
          `El fondo "${fund.name}" no está asociado con la categoría "${
            category.name
          }". Fondos permitidos: ${allowedFundNames.join(", ")}`
        );
        return { isValid: false, errors, warnings };
      }
    }

    // If no specific relationships exist, any fund is allowed
    if (categoryFunds.length === 0) {
      warnings.push(
        `La categoría "${category.name}" no tiene fondos específicos asociados, por lo que acepta gastos desde cualquier fondo.`
      );
    }

    return {
      isValid: true,
      errors,
      warnings,
      data: {
        categoryId,
        categoryName: category.name,
        fundId,
        fundName: fund.name,
        hasSpecificFundRestrictions: categoryFunds.length > 0,
        allowedFunds: categoryFunds,
      },
    };
  } catch (error) {
    console.error("Error validating expense fund-category combination:", error);
    return {
      isValid: false,
      errors: [
        "Error interno del servidor al validar la combinación fondo-categoría",
      ],
      warnings: [],
    };
  }
}

/**
 * Gets available funds for a specific category
 */
export async function getAvailableFundsForCategory(
  categoryId: string
): Promise<{ funds: any[]; hasRestrictions: boolean }> {
  try {
    // Check if category has specific fund relationships
    const categoryFunds = await sql`
      SELECT 
        f.id,
        f.name,
        f.description,
        f.current_balance
      FROM funds f
      INNER JOIN category_fund_relationships cfr ON f.id = cfr.fund_id
      WHERE cfr.category_id = ${categoryId}
      ORDER BY f.name
    `;

    if (categoryFunds.length > 0) {
      return {
        funds: categoryFunds,
        hasRestrictions: true,
      };
    }

    // If no specific relationships, return all funds
    const allFunds = await sql`
      SELECT 
        id,
        name,
        description,
        current_balance
      FROM funds
      ORDER BY name
    `;

    return {
      funds: allFunds,
      hasRestrictions: false,
    };
  } catch (error) {
    console.error("Error getting available funds for category:", error);
    return {
      funds: [],
      hasRestrictions: false,
    };
  }
}

/**
 * Error messages for category-fund operations
 */
export const CATEGORY_FUND_ERROR_MESSAGES = {
  CATEGORY_NOT_FOUND: "La categoría especificada no existe",
  FUND_NOT_FOUND: "El fondo especificado no existe",
  RELATIONSHIP_NOT_FOUND: "La relación entre la categoría y el fondo no existe",
  RELATIONSHIP_EXISTS: "La relación entre esta categoría y fondo ya existe",
  EXPENSES_EXIST:
    "No se puede eliminar la relación porque existen gastos registrados",
  INVALID_FUND_FOR_CATEGORY:
    "El fondo seleccionado no está asociado con esta categoría",
  MIGRATION_FAILED: "Error durante la migración de relaciones categoría-fondo",
  VALIDATION_FAILED: "Error de validación en los datos proporcionados",
  SERVER_ERROR: "Error interno del servidor",
  LAST_FUND_RELATIONSHIP:
    "No se puede eliminar la última relación de fondo para una categoría con gastos",
  INVALID_FUND_IDS: "Algunos de los fondos especificados no existen",
  NO_FUNDS_AVAILABLE: "No hay fondos disponibles para esta categoría",
} as const;

/**
 * Warning messages for category-fund operations
 */
export const CATEGORY_FUND_WARNING_MESSAGES = {
  EXPENSES_WILL_BE_AFFECTED: "Esta operación afectará gastos existentes",
  LAST_FUND_RELATIONSHIP_REMOVAL:
    "Al eliminar esta relación, la categoría aceptará gastos desde cualquier fondo",
  FUND_RESTRICTIONS_REMOVED:
    "Se han eliminado las restricciones de fondos para esta categoría",
  NEW_FUND_RESTRICTIONS_ADDED:
    "Se han agregado nuevas restricciones de fondos para esta categoría",
} as const;
