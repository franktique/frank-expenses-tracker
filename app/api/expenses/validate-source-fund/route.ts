import { type NextRequest, NextResponse } from "next/server";
import {
  validateSourceFundForCategory,
  validateExpenseSourceFunds,
  getAvailableSourceFundsForCategory,
  SOURCE_FUND_VALIDATION_MESSAGES,
} from "@/lib/source-fund-validation";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");
    const sourceFundId = searchParams.get("source_fund_id");
    const destinationFundId = searchParams.get("destination_fund_id");
    const amount = searchParams.get("amount");

    // Validate required parameters
    if (!categoryId) {
      return NextResponse.json(
        {
          error: SOURCE_FUND_VALIDATION_MESSAGES.CATEGORY_REQUIRED,
          isValid: false,
        },
        { status: 400 }
      );
    }

    // If only category is provided, return available funds
    if (!sourceFundId) {
      const { funds, hasRestrictions, categoryName } =
        await getAvailableSourceFundsForCategory(categoryId);

      return NextResponse.json({
        isValid: true,
        available_funds: funds,
        has_restrictions: hasRestrictions,
        category_name: categoryName,
        message: hasRestrictions
          ? `Fondos específicos disponibles para "${categoryName}"`
          : `Todos los fondos disponibles para "${categoryName}"`,
      });
    }

    // Validate specific source fund for category
    if (!destinationFundId && !amount) {
      const validation = await validateSourceFundForCategory(
        categoryId,
        sourceFundId
      );

      return NextResponse.json({
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        data: validation.data,
        message: validation.isValid
          ? "Fondo origen válido para la categoría"
          : "Fondo origen no válido para la categoría",
      });
    }

    // Comprehensive validation with all parameters
    const validation = await validateExpenseSourceFunds(
      categoryId,
      sourceFundId,
      destinationFundId || undefined,
      amount ? parseFloat(amount) : undefined
    );

    return NextResponse.json({
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      data: validation.data,
      message: validation.isValid
        ? "Configuración de fondos válida"
        : "Configuración de fondos no válida",
    });
  } catch (error) {
    console.error("Error validating source fund:", error);
    return NextResponse.json(
      {
        error: SOURCE_FUND_VALIDATION_MESSAGES.SERVER_ERROR,
        isValid: false,
        details: [(error as Error).message],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      category_id,
      source_fund_id,
      destination_fund_id,
      amount,
      expense_id, // For update validation
    } = body;

    // Validate required parameters
    if (!category_id) {
      return NextResponse.json(
        {
          error: SOURCE_FUND_VALIDATION_MESSAGES.CATEGORY_REQUIRED,
          isValid: false,
        },
        { status: 400 }
      );
    }

    if (!source_fund_id) {
      return NextResponse.json(
        {
          error: SOURCE_FUND_VALIDATION_MESSAGES.SOURCE_FUND_REQUIRED,
          isValid: false,
        },
        { status: 400 }
      );
    }

    // Perform comprehensive validation
    const validation = await validateExpenseSourceFunds(
      category_id,
      source_fund_id,
      destination_fund_id,
      amount
    );

    // Return detailed validation result
    return NextResponse.json({
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      data: validation.data,
      message: validation.isValid ? "Validación exitosa" : "Validación fallida",
      recommendations: generateRecommendations(validation),
    });
  } catch (error) {
    console.error("Error in source fund validation:", error);
    return NextResponse.json(
      {
        error: SOURCE_FUND_VALIDATION_MESSAGES.SERVER_ERROR,
        isValid: false,
        details: [(error as Error).message],
      },
      { status: 500 }
    );
  }
}

// Helper function to generate user-friendly recommendations
function generateRecommendations(validation: any): string[] {
  const recommendations: string[] = [];

  if (!validation.isValid) {
    if (validation.errors.some((e: string) => e.includes("no está asociado"))) {
      recommendations.push(
        "Seleccione un fondo que esté asociado con la categoría elegida"
      );
    }

    if (validation.errors.some((e: string) => e.includes("no existe"))) {
      recommendations.push(
        "Verifique que el fondo seleccionado existe en el sistema"
      );
    }

    if (validation.errors.some((e: string) => e.includes("mismo fondo"))) {
      recommendations.push(
        "Para transferencias, seleccione fondos diferentes de origen y destino"
      );
    }
  }

  if (validation.warnings.length > 0) {
    if (validation.warnings.some((w: string) => w.includes("balance"))) {
      recommendations.push(
        "Considere verificar el balance del fondo antes de proceder"
      );
    }

    if (validation.warnings.some((w: string) => w.includes("transferencia"))) {
      recommendations.push(
        "Este gasto moverá dinero entre fondos - verifique que es correcto"
      );
    }
  }

  return recommendations;
}
