import { sql } from '@/lib/db';
import { Fund } from '@/types/funds';

export interface SourceFundValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: any;
}

export interface SourceFundValidationData {
  categoryId: string;
  categoryName: string;
  sourceFundId: string;
  sourceFundName: string;
  hasSpecificFundRestrictions: boolean;
  allowedFunds: Fund[];
  isTransfer: boolean;
  destinationFundId?: string;
  destinationFundName?: string;
}

/**
 * Validates if a source fund is valid for a specific category
 */
export async function validateSourceFundForCategory(
  categoryId: string,
  sourceFundId: string
): Promise<SourceFundValidationResult> {
  try {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if category exists
    const [category] = await sql`
      SELECT id, name FROM categories WHERE id = ${categoryId}
    `;

    if (!category) {
      errors.push('La categoría especificada no existe');
      return { isValid: false, errors, warnings };
    }

    // Check if source fund exists
    const [sourceFund] = await sql`
      SELECT id, name, current_balance FROM funds WHERE id = ${sourceFundId}
    `;

    if (!sourceFund) {
      errors.push('El fondo origen especificado no existe');
      return { isValid: false, errors, warnings };
    }

    // Check if category has specific fund relationships
    const categoryFunds = await sql`
      SELECT f.id, f.name, f.current_balance
      FROM funds f
      INNER JOIN category_fund_relationships cfr ON f.id = cfr.fund_id
      WHERE cfr.category_id = ${categoryId}
    `;

    // Check legacy fund_id relationship if no specific relationships exist
    let hasSpecificRestrictions = categoryFunds.length > 0;
    let allowedFunds = categoryFunds;

    if (categoryFunds.length === 0) {
      // Check for legacy fund_id relationship
      const [legacyFund] = await sql`
        SELECT f.id, f.name, f.current_balance
        FROM categories c
        INNER JOIN funds f ON c.fund_id = f.id
        WHERE c.id = ${categoryId}
      `;

      if (legacyFund) {
        allowedFunds = [legacyFund];
        hasSpecificRestrictions = true;
      } else {
        // No restrictions - any fund is allowed
        const allFunds = await sql`
          SELECT id, name, current_balance FROM funds ORDER BY name
        `;
        allowedFunds = allFunds;
        hasSpecificRestrictions = false;
      }
    }

    // Validate source fund is allowed for this category
    if (hasSpecificRestrictions) {
      const allowedFundIds = allowedFunds.map((f: any) => f.id);
      if (!allowedFundIds.includes(sourceFundId)) {
        const allowedFundNames = allowedFunds.map((f: any) => f.name);
        errors.push(
          `El fondo origen "${
            sourceFund.name
          }" no está asociado con la categoría "${
            category.name
          }". Fondos permitidos: ${allowedFundNames.join(', ')}`
        );
        return { isValid: false, errors, warnings };
      }
    }

    // Add warning if fund has low balance
    if (sourceFund.current_balance <= 0) {
      warnings.push(
        `El fondo origen "${sourceFund.name}" tiene balance cero o negativo (${sourceFund.current_balance})`
      );
    }

    // Add info if no specific restrictions exist
    if (!hasSpecificRestrictions) {
      warnings.push(
        `La categoría "${category.name}" no tiene fondos específicos asociados, acepta gastos desde cualquier fondo`
      );
    }

    const validationData: SourceFundValidationData = {
      categoryId,
      categoryName: category.name,
      sourceFundId,
      sourceFundName: sourceFund.name,
      hasSpecificFundRestrictions: hasSpecificRestrictions,
      allowedFunds,
      isTransfer: false, // Will be updated if destination fund is provided
    };

    return {
      isValid: true,
      errors,
      warnings,
      data: validationData,
    };
  } catch (error) {
    console.error('Error validating source fund for category:', error);
    return {
      isValid: false,
      errors: ['Error interno del servidor al validar el fondo origen'],
      warnings: [],
    };
  }
}

/**
 * Validates a complete expense with source and destination funds
 */
export async function validateExpenseSourceFunds(
  categoryId: string,
  sourceFundId: string,
  destinationFundId?: string,
  amount?: number
): Promise<SourceFundValidationResult> {
  try {
    const errors: string[] = [];
    const warnings: string[] = [];

    // First validate the source fund for the category
    const sourceFundValidation = await validateSourceFundForCategory(
      categoryId,
      sourceFundId
    );

    if (!sourceFundValidation.isValid) {
      return sourceFundValidation;
    }

    // Merge existing errors and warnings
    errors.push(...sourceFundValidation.errors);
    warnings.push(...sourceFundValidation.warnings);

    let validationData = sourceFundValidation.data as SourceFundValidationData;

    // If destination fund is provided, validate the transfer
    if (destinationFundId) {
      // Check if destination fund exists
      const [destinationFund] = await sql`
        SELECT id, name, current_balance FROM funds WHERE id = ${destinationFundId}
      `;

      if (!destinationFund) {
        errors.push('El fondo de destino especificado no existe');
        return { isValid: false, errors, warnings };
      }

      // Prevent transfer to the same fund
      if (sourceFundId === destinationFundId) {
        errors.push('No se puede transferir dinero al mismo fondo');
        return { isValid: false, errors, warnings };
      }

      // Update validation data for transfer
      validationData = {
        ...validationData,
        isTransfer: true,
        destinationFundId,
        destinationFundName: destinationFund.name,
      };

      warnings.push(
        `Este gasto representa una transferencia de "${validationData.sourceFundName}" a "${destinationFund.name}"`
      );
    }

    // Validate amount against source fund balance if provided
    if (amount && amount > 0) {
      const sourceFund = validationData.allowedFunds.find(
        (f: any) => f.id === sourceFundId
      );
      if (sourceFund && amount > sourceFund.current_balance) {
        warnings.push(
          `El monto (${amount.toLocaleString()}) excede el balance disponible en "${
            sourceFund.name
          }" (${sourceFund.current_balance.toLocaleString()})`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      data: validationData,
    };
  } catch (error) {
    console.error('Error validating expense source funds:', error);
    return {
      isValid: false,
      errors: ['Error interno del servidor al validar los fondos del gasto'],
      warnings: [],
    };
  }
}

/**
 * Gets available source funds for a specific category
 */
export async function getAvailableSourceFundsForCategory(
  categoryId: string
): Promise<{
  funds: Fund[];
  hasRestrictions: boolean;
  categoryName: string;
}> {
  try {
    // Get category info
    const [category] = await sql`
      SELECT id, name FROM categories WHERE id = ${categoryId}
    `;

    if (!category) {
      return {
        funds: [],
        hasRestrictions: false,
        categoryName: '',
      };
    }

    // Check for specific fund relationships
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
        categoryName: category.name,
      };
    }

    // Check for legacy fund_id relationship
    const [legacyFund] = await sql`
      SELECT 
        f.id,
        f.name,
        f.description,
        f.current_balance
      FROM categories c
      INNER JOIN funds f ON c.fund_id = f.id
      WHERE c.id = ${categoryId}
    `;

    if (legacyFund) {
      return {
        funds: [legacyFund],
        hasRestrictions: true,
        categoryName: category.name,
      };
    }

    // No specific relationships - return all funds
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
      categoryName: category.name,
    };
  } catch (error) {
    console.error('Error getting available source funds for category:', error);
    return {
      funds: [],
      hasRestrictions: false,
      categoryName: '',
    };
  }
}

/**
 * Validates source fund changes during expense updates
 */
export async function validateSourceFundUpdate(
  expenseId: string,
  newCategoryId?: string,
  newSourceFundId?: string,
  newDestinationFundId?: string,
  newAmount?: number
): Promise<SourceFundValidationResult> {
  try {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get current expense data
    const [currentExpense] = await sql`
      SELECT 
        e.*,
        c.name as category_name,
        sf.name as source_fund_name,
        df.name as destination_fund_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      LEFT JOIN funds sf ON e.source_fund_id = sf.id
      LEFT JOIN funds df ON e.destination_fund_id = df.id
      WHERE e.id = ${expenseId}
    `;

    if (!currentExpense) {
      errors.push('El gasto especificado no existe');
      return { isValid: false, errors, warnings };
    }

    // Determine final values (use new values if provided, otherwise keep current)
    const finalCategoryId = newCategoryId || currentExpense.category_id;
    const finalSourceFundId = newSourceFundId || currentExpense.source_fund_id;
    const finalDestinationFundId =
      newDestinationFundId !== undefined
        ? newDestinationFundId
        : currentExpense.destination_fund_id;
    const finalAmount = newAmount || currentExpense.amount;

    // Validate the final combination
    const validation = await validateExpenseSourceFunds(
      finalCategoryId,
      finalSourceFundId,
      finalDestinationFundId,
      finalAmount
    );

    // Add specific warnings for updates
    if (newCategoryId && newCategoryId !== currentExpense.category_id) {
      warnings.push(
        `La categoría cambiará de "${currentExpense.category_name}" a una nueva categoría`
      );
    }

    if (newSourceFundId && newSourceFundId !== currentExpense.source_fund_id) {
      warnings.push(
        `El fondo origen cambiará de "${currentExpense.source_fund_name}" a un nuevo fondo`
      );
    }

    if (
      newDestinationFundId !== undefined &&
      newDestinationFundId !== currentExpense.destination_fund_id
    ) {
      const oldDestName = currentExpense.destination_fund_name || 'ninguno';
      warnings.push(
        `El fondo destino cambiará de "${oldDestName}" a ${
          newDestinationFundId ? 'un nuevo fondo' : 'ninguno'
        }`
      );
    }

    return {
      isValid: validation.isValid,
      errors: [...validation.errors, ...errors],
      warnings: [...validation.warnings, ...warnings],
      data: {
        ...validation.data,
        expenseId,
        isUpdate: true,
        currentExpense,
      },
    };
  } catch (error) {
    console.error('Error validating source fund update:', error);
    return {
      isValid: false,
      errors: ['Error interno del servidor al validar la actualización'],
      warnings: [],
    };
  }
}

/**
 * Client-side validation for source fund selection
 */
export function validateSourceFundSelection(
  selectedSourceFund: Fund | null,
  categoryFunds: Fund[],
  required: boolean = true
): { isValid: boolean; error?: string } {
  if (required && !selectedSourceFund) {
    return {
      isValid: false,
      error: 'Debe seleccionar un fondo origen para el gasto',
    };
  }

  if (
    selectedSourceFund &&
    categoryFunds.length > 0 &&
    !categoryFunds.some((fund) => fund.id === selectedSourceFund.id)
  ) {
    return {
      isValid: false,
      error: 'El fondo origen seleccionado no está asociado con esta categoría',
    };
  }

  return { isValid: true };
}

/**
 * Error messages for source fund operations
 */
export const SOURCE_FUND_VALIDATION_MESSAGES = {
  // Required field errors
  SOURCE_FUND_REQUIRED: 'Debe seleccionar un fondo origen para el gasto',
  CATEGORY_REQUIRED: 'Debe seleccionar una categoría para el gasto',

  // Existence errors
  SOURCE_FUND_NOT_FOUND: 'El fondo origen especificado no existe',
  DESTINATION_FUND_NOT_FOUND: 'El fondo de destino especificado no existe',
  CATEGORY_NOT_FOUND: 'La categoría especificada no existe',
  EXPENSE_NOT_FOUND: 'El gasto especificado no existe',

  // Relationship errors
  SOURCE_FUND_INVALID_FOR_CATEGORY:
    'El fondo origen seleccionado no está asociado con esta categoría',
  SAME_FUND_TRANSFER: 'No se puede transferir dinero al mismo fondo',

  // Balance warnings
  INSUFFICIENT_BALANCE:
    'El monto excede el balance disponible en el fondo origen',
  ZERO_BALANCE: 'El fondo origen tiene balance cero o negativo',

  // General errors
  VALIDATION_FAILED: 'Error de validación en los datos del fondo origen',
  SERVER_ERROR: 'Error interno del servidor al validar el fondo origen',

  // Update specific
  UPDATE_VALIDATION_FAILED: 'Error validando la actualización del fondo origen',
  CATEGORY_CHANGE_INVALID:
    'El cambio de categoría hace inválido el fondo origen actual',
} as const;

/**
 * Warning messages for source fund operations
 */
export const SOURCE_FUND_WARNING_MESSAGES = {
  NO_FUND_RESTRICTIONS: 'Esta categoría acepta gastos desde cualquier fondo',
  LOW_BALANCE: 'El fondo origen tiene un balance bajo',
  TRANSFER_OPERATION: 'Este gasto representa una transferencia entre fondos',
  CATEGORY_CHANGE:
    'El cambio de categoría puede afectar los fondos disponibles',
  FUND_CHANGE: 'El cambio de fondo origen afectará los balances',
} as const;
