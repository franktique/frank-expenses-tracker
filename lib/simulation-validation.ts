import { z } from "zod";

// Zod schemas for simulation data validation
export const SimulationNameSchema = z
  .string()
  .trim()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(255, "El nombre no puede exceder 255 caracteres")
  .refine(
    (name) => !/[<>:"\/\\|?*\x00-\x1f]/.test(name),
    "El nombre contiene caracteres no válidos"
  );

export const SimulationDescriptionSchema = z
  .string()
  .max(1000, "La descripción no puede exceder 1000 caracteres")
  .optional()
  .nullable();

export const SimulationBudgetAmountSchema = z
  .number()
  .min(0, "El monto debe ser positivo")
  .max(999999999.99, "El monto es demasiado grande")
  .refine(
    (amount) => Number.isFinite(amount),
    "El monto debe ser un número válido"
  );

export const SimulationBudgetSchema = z.object({
  category_id: z.union(
    [
      z
        .number()
        .int("El ID de categoría debe ser un número entero")
        .positive("El ID de categoría debe ser positivo"),
      z
        .string()
        .uuid("El ID de categoría debe ser un UUID válido")
        .min(1, "El ID de categoría no puede estar vacío"),
    ],
    {
      errorMap: () => ({
        message:
          "El ID de categoría debe ser un número entero positivo o un UUID válido",
      }),
    }
  ),
  efectivo_amount: SimulationBudgetAmountSchema,
  credito_amount: SimulationBudgetAmountSchema,
  ahorro_efectivo_amount: SimulationBudgetAmountSchema.optional().default(0),
  ahorro_credito_amount: SimulationBudgetAmountSchema.optional().default(0),
  // Legacy field - keep for backward compatibility
  expected_savings: SimulationBudgetAmountSchema.optional().default(0),
}).refine(
  (data) => data.ahorro_efectivo_amount <= data.efectivo_amount,
  {
    message: "El ahorro efectivo no puede ser mayor al presupuesto en efectivo",
    path: ["ahorro_efectivo_amount"],
  }
).refine(
  (data) => data.ahorro_credito_amount <= data.credito_amount,
  {
    message: "El ahorro crédito no puede ser mayor al presupuesto en crédito",
    path: ["ahorro_credito_amount"],
  }
);

export const SimulationBudgetsArraySchema = z
  .array(SimulationBudgetSchema)
  .min(1, "Debe incluir al menos un presupuesto")
  .refine((budgets) => {
    const categoryIds = budgets.map((b) => b.category_id);
    const uniqueIds = new Set(categoryIds);
    return uniqueIds.size === categoryIds.length;
  }, "No puede haber categorías duplicadas");

export const CreateSimulationSchema = z.object({
  name: SimulationNameSchema,
  description: SimulationDescriptionSchema,
});

export const UpdateSimulationSchema = z.object({
  name: SimulationNameSchema.optional(),
  description: SimulationDescriptionSchema,
});

export const UpdateSimulationBudgetsSchema = z.object({
  budgets: SimulationBudgetsArraySchema,
});

// Types derived from schemas
export type SimulationBudget = z.infer<typeof SimulationBudgetSchema>;
export type CreateSimulationData = z.infer<typeof CreateSimulationSchema>;
export type UpdateSimulationData = z.infer<typeof UpdateSimulationSchema>;
export type UpdateSimulationBudgetsData = z.infer<
  typeof UpdateSimulationBudgetsSchema
>;

// Validation result types
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ConsistencyCheckResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  suggestions: string[];
}

// Client-side validation functions
export function validateSimulationName(name: string): ValidationResult<string> {
  try {
    const validatedName = SimulationNameSchema.parse(name);
    return {
      success: true,
      data: validatedName,
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((err) => ({
          field: "name",
          message: err.message,
          code: err.code,
        })),
      };
    }
    return {
      success: false,
      errors: [{ field: "name", message: "Error de validación desconocido" }],
    };
  }
}

export function validateSimulationDescription(
  description: string | null
): ValidationResult<string | null> {
  try {
    const validatedDescription = SimulationDescriptionSchema.parse(description);
    return {
      success: true,
      data: validatedDescription,
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((err) => ({
          field: "description",
          message: err.message,
          code: err.code,
        })),
      };
    }
    return {
      success: false,
      errors: [
        { field: "description", message: "Error de validación desconocido" },
      ],
    };
  }
}

export function validateSimulationBudget(
  budget: any
): ValidationResult<SimulationBudget> {
  try {
    const validatedBudget = SimulationBudgetSchema.parse(budget);
    return {
      success: true,
      data: validatedBudget,
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
      };
    }
    return {
      success: false,
      errors: [{ field: "budget", message: "Error de validación desconocido" }],
    };
  }
}

export function validateSimulationBudgets(
  budgets: any[]
): ValidationResult<SimulationBudget[]> {
  try {
    const validatedBudgets = SimulationBudgetsArraySchema.parse(budgets);
    return {
      success: true,
      data: validatedBudgets,
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
      };
    }
    return {
      success: false,
      errors: [
        { field: "budgets", message: "Error de validación desconocido" },
      ],
    };
  }
}

export function validateCreateSimulation(
  data: any
): ValidationResult<CreateSimulationData> {
  try {
    const validatedData = CreateSimulationSchema.parse(data);
    return {
      success: true,
      data: validatedData,
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
      };
    }
    return {
      success: false,
      errors: [
        { field: "simulation", message: "Error de validación desconocido" },
      ],
    };
  }
}

export function validateUpdateSimulation(
  data: any
): ValidationResult<UpdateSimulationData> {
  try {
    const validatedData = UpdateSimulationSchema.parse(data);
    return {
      success: true,
      data: validatedData,
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
      };
    }
    return {
      success: false,
      errors: [
        { field: "simulation", message: "Error de validación desconocido" },
      ],
    };
  }
}

// Data consistency checks
export function checkSimulationDataConsistency(
  simulation: any,
  budgets: any[],
  categories: any[]
): ConsistencyCheckResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const suggestions: string[] = [];

  // Check if simulation exists and has required fields
  if (!simulation) {
    errors.push("Datos de simulación faltantes");
    return { valid: false, warnings, errors, suggestions };
  }

  if (!simulation.id) {
    errors.push("ID de simulación faltante");
  }

  if (!simulation.name || simulation.name.trim() === "") {
    errors.push("Nombre de simulación faltante");
  }

  // Check categories consistency
  if (!categories || categories.length === 0) {
    errors.push("No hay categorías disponibles para configurar presupuestos");
    suggestions.push(
      "Cree categorías antes de configurar presupuestos de simulación"
    );
  }

  // Check budgets consistency
  if (budgets && budgets.length > 0 && categories && categories.length > 0) {
    const categoryIds = new Set(categories.map((c) => String(c.id)));
    const budgetCategoryIds = budgets.map((b) => String(b.category_id));

    // Check for budgets with non-existent categories
    const invalidCategoryIds = budgetCategoryIds.filter(
      (id) => !categoryIds.has(id)
    );
    if (invalidCategoryIds.length > 0) {
      errors.push(
        `Presupuestos para categorías inexistentes: ${invalidCategoryIds.join(
          ", "
        )}`
      );
      suggestions.push(
        "Elimine los presupuestos para categorías que ya no existen"
      );
    }

    // Check for duplicate category budgets
    const duplicateIds = budgetCategoryIds.filter(
      (id, index) => budgetCategoryIds.indexOf(id) !== index
    );
    if (duplicateIds.length > 0) {
      errors.push(
        `Presupuestos duplicados para categorías: ${[
          ...new Set(duplicateIds),
        ].join(", ")}`
      );
    }

    // Check for categories without budgets
    const categoriesWithoutBudgets = categories.filter(
      (c) => !budgetCategoryIds.includes(String(c.id))
    );
    if (categoriesWithoutBudgets.length > 0) {
      warnings.push(
        `${categoriesWithoutBudgets.length} categorías sin presupuesto configurado`
      );
      suggestions.push(
        "Configure presupuestos para todas las categorías para un análisis completo"
      );
    }

    // Check for zero budgets
    const zeroBudgets = budgets.filter(
      (b) => (b.efectivo_amount || 0) === 0 && (b.credito_amount || 0) === 0
    );
    if (zeroBudgets.length > 0) {
      warnings.push(`${zeroBudgets.length} categorías con presupuesto cero`);
    }

    // Check for very large budgets (potential data entry errors)
    const largeBudgets = budgets.filter(
      (b) =>
        (b.efectivo_amount || 0) > 10000000 ||
        (b.credito_amount || 0) > 10000000
    );
    if (largeBudgets.length > 0) {
      warnings.push(
        `${largeBudgets.length} categorías con presupuestos muy altos (>$10M)`
      );
      suggestions.push("Verifique que los montos sean correctos");
    }
  }

  // Check simulation metadata
  if (simulation.created_at) {
    const createdDate = new Date(simulation.created_at);
    const now = new Date();
    const daysDiff =
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff > 365) {
      warnings.push("Simulación creada hace más de un año");
      suggestions.push(
        "Considere actualizar los presupuestos con datos más recientes"
      );
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
    suggestions,
  };
}

// Real-time validation for form inputs
export function validateBudgetAmountInput(
  value: string | number | undefined | null,
  isTyping: boolean = false
): {
  isValid: boolean;
  error?: string;
  numericValue?: number;
} {
  // Handle null, undefined, or empty values
  if (value === null || value === undefined || value === "") {
    return { isValid: true, numericValue: 0 };
  }

  // Convert to string if it's a number
  const stringValue =
    typeof value === "number" ? value.toString() : String(value);

  // Handle "0" specifically
  if (stringValue === "0") {
    return { isValid: true, numericValue: 0 };
  }

  // During typing, be more lenient with partial inputs
  if (isTyping) {
    // Allow partial decimal inputs like "." or "0."
    if (
      stringValue === "." ||
      stringValue === "0." ||
      stringValue.endsWith(".")
    ) {
      return { isValid: true, numericValue: 0 };
    }

    // Allow empty or partial inputs during typing
    if (stringValue === "" || stringValue === "-") {
      return { isValid: true, numericValue: 0 };
    }
  }

  // Check if it's a valid number format
  const numericValue = parseFloat(stringValue);

  if (isNaN(numericValue)) {
    // During typing, be more lenient
    if (isTyping) {
      return { isValid: true, numericValue: 0 };
    }
    return { isValid: false, error: "Debe ser un número válido" };
  }

  if (numericValue < 0) {
    return { isValid: false, error: "Debe ser un número positivo" };
  }

  if (numericValue > 999999999.99) {
    return { isValid: false, error: "El monto es demasiado grande" };
  }

  // Check for too many decimal places (only when not typing)
  if (!isTyping) {
    const decimalPlaces = (stringValue.split(".")[1] || "").length;
    if (decimalPlaces > 2) {
      return { isValid: false, error: "Máximo 2 decimales permitidos" };
    }
  }

  return { isValid: true, numericValue };
}

// Batch validation for multiple budget inputs
export function validateBudgetFormData(formData: {
  [categoryId: string]: {
    efectivo_amount: string;
    credito_amount: string;
    ahorro_efectivo_amount?: string;
    ahorro_credito_amount?: string;
    expected_savings?: string; // Legacy - for backward compatibility
  };
}): {
  isValid: boolean;
  errors: {
    [categoryId: string]: {
      efectivo?: string;
      credito?: string;
      ahorro_efectivo?: string;
      ahorro_credito?: string;
      expected_savings?: string;
    }
  };
  totalErrors: number;
} {
  const errors: {
    [categoryId: string]: {
      efectivo?: string;
      credito?: string;
      ahorro_efectivo?: string;
      ahorro_credito?: string;
      expected_savings?: string;
    };
  } = {};
  let totalErrors = 0;

  Object.entries(formData).forEach(([categoryIdStr, data]) => {
    const categoryId = categoryIdStr; // Keep as string since it can be a UUID
    const categoryErrors: {
      efectivo?: string;
      credito?: string;
      ahorro_efectivo?: string;
      ahorro_credito?: string;
      expected_savings?: string;
    } = {};

    // Ensure data exists and has the expected structure
    if (!data || typeof data !== "object") {
      return;
    }

    // Validate efectivo amount
    const efectivoAmount = data.efectivo_amount ?? "0";
    const efectivoValidation = validateBudgetAmountInput(efectivoAmount);
    if (!efectivoValidation.isValid) {
      console.warn(
        "Efectivo validation failed for category",
        categoryId,
        "value:",
        efectivoAmount,
        "error:",
        efectivoValidation.error
      );
      categoryErrors.efectivo = efectivoValidation.error;
      totalErrors++;
    }

    // Validate credito amount
    const creditoAmount = data.credito_amount ?? "0";
    const creditoValidation = validateBudgetAmountInput(creditoAmount);
    if (!creditoValidation.isValid) {
      console.warn(
        "Credito validation failed for category",
        categoryId,
        "value:",
        creditoAmount,
        "error:",
        creditoValidation.error
      );
      categoryErrors.credito = creditoValidation.error;
      totalErrors++;
    }

    // Validate ahorro_efectivo_amount
    const ahorroEfectivo = data.ahorro_efectivo_amount ?? "0";
    const ahorroEfectivoValidation = validateBudgetAmountInput(ahorroEfectivo);
    if (!ahorroEfectivoValidation.isValid) {
      console.warn(
        "Ahorro efectivo validation failed for category",
        categoryId,
        "value:",
        ahorroEfectivo,
        "error:",
        ahorroEfectivoValidation.error
      );
      categoryErrors.ahorro_efectivo = ahorroEfectivoValidation.error;
      totalErrors++;
    } else if (
      ahorroEfectivoValidation.numericValue !== undefined &&
      efectivoValidation.numericValue !== undefined
    ) {
      // Cross-field validation: ahorro_efectivo <= efectivo_amount
      if (ahorroEfectivoValidation.numericValue > efectivoValidation.numericValue) {
        categoryErrors.ahorro_efectivo =
          "El ahorro efectivo no puede ser mayor al presupuesto en efectivo";
        totalErrors++;
      }
    }

    // Validate ahorro_credito_amount
    const ahorroCredito = data.ahorro_credito_amount ?? "0";
    const ahorroCreditoValidation = validateBudgetAmountInput(ahorroCredito);
    if (!ahorroCreditoValidation.isValid) {
      console.warn(
        "Ahorro credito validation failed for category",
        categoryId,
        "value:",
        ahorroCredito,
        "error:",
        ahorroCreditoValidation.error
      );
      categoryErrors.ahorro_credito = ahorroCreditoValidation.error;
      totalErrors++;
    } else if (
      ahorroCreditoValidation.numericValue !== undefined &&
      creditoValidation.numericValue !== undefined
    ) {
      // Cross-field validation: ahorro_credito <= credito_amount
      if (ahorroCreditoValidation.numericValue > creditoValidation.numericValue) {
        categoryErrors.ahorro_credito =
          "El ahorro crédito no puede ser mayor al presupuesto en crédito";
        totalErrors++;
      }
    }

    if (
      categoryErrors.efectivo ||
      categoryErrors.credito ||
      categoryErrors.ahorro_efectivo ||
      categoryErrors.ahorro_credito
    ) {
      errors[categoryId] = categoryErrors;
    }
  });

  return {
    isValid: totalErrors === 0,
    errors,
    totalErrors,
  };
}

// Check for potential data loss scenarios
export function checkDataLossRisks(
  currentBudgets: any[],
  newBudgets: any[]
): {
  hasRisk: boolean;
  risks: string[];
  affectedCategories: (string | number)[];
} {
  const risks: string[] = [];
  const affectedCategories: (string | number)[] = [];

  if (!currentBudgets || currentBudgets.length === 0) {
    return { hasRisk: false, risks, affectedCategories };
  }

  // Check for categories being removed
  const currentCategoryIds = new Set(
    currentBudgets.map((b) => String(b.category_id))
  );
  const newCategoryIds = new Set(newBudgets.map((b) => String(b.category_id)));

  const removedCategories = [...currentCategoryIds].filter(
    (id) => !newCategoryIds.has(id)
  );
  if (removedCategories.length > 0) {
    risks.push(
      `Se eliminarán presupuestos de ${removedCategories.length} categorías`
    );
    affectedCategories.push(...removedCategories);
  }

  // Check for significant budget reductions
  const significantReductions: (string | number)[] = [];
  newBudgets.forEach((newBudget) => {
    const currentBudget = currentBudgets.find(
      (b) => String(b.category_id) === String(newBudget.category_id)
    );
    if (currentBudget) {
      const currentTotal =
        (currentBudget.efectivo_amount || 0) +
        (currentBudget.credito_amount || 0);
      const newTotal =
        (newBudget.efectivo_amount || 0) + (newBudget.credito_amount || 0);

      if (currentTotal > 0 && newTotal < currentTotal * 0.5) {
        significantReductions.push(newBudget.category_id);
      }
    }
  });

  if (significantReductions.length > 0) {
    risks.push(
      `Reducción significativa (>50%) en ${significantReductions.length} categorías`
    );
    affectedCategories.push(...significantReductions);
  }

  return {
    hasRisk: risks.length > 0,
    risks,
    affectedCategories: [...new Set(affectedCategories)],
  };
}

// Validation feedback for users
export function getValidationFeedback(errors: ValidationError[]): {
  summary: string;
  details: string[];
  severity: "error" | "warning";
} {
  if (errors.length === 0) {
    return {
      summary: "Todos los datos son válidos",
      details: [],
      severity: "warning",
    };
  }

  const errorCount = errors.length;
  const summary =
    errorCount === 1
      ? "Se encontró 1 error de validación"
      : `Se encontraron ${errorCount} errores de validación`;

  const details = errors.map((error) => {
    if (error.field === "name") {
      return `Nombre: ${error.message}`;
    } else if (error.field === "description") {
      return `Descripción: ${error.message}`;
    } else if (error.field.includes("efectivo_amount")) {
      return `Efectivo: ${error.message}`;
    } else if (error.field.includes("credito_amount")) {
      return `Crédito: ${error.message}`;
    } else if (error.field.includes("category_id")) {
      return `Categoría: ${error.message}`;
    } else {
      return `${error.field}: ${error.message}`;
    }
  });

  return {
    summary,
    details,
    severity: "error",
  };
}
