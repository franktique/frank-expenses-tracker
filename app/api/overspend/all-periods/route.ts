import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type {
  AllPeriodsOverspendResponse,
  CategoryOverspendRow,
} from "@/types/funds";

interface RowData {
  category_id: string;
  category_name: string;
  tipo_gasto: string | null;
  period_id: string;
  period_name: string;
  month: number;
  year: number;
  total_planned: number;
  total_spent: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentMethodParam = searchParams.get("paymentMethod");
    const excludedCategoriesParam = searchParams.get("excludedCategories");

    // Parse excluded categories
    const excludedCategories = excludedCategoriesParam
      ? excludedCategoriesParam.split(",").filter((id) => id.length > 0)
      : [];

    // Determine payment method filters
    const CASH_METHODS = ["cash", "debit"];
    const CREDIT_METHODS = ["credit"];
    let methodFilter: string[];

    if (paymentMethodParam === "cash") {
      methodFilter = CASH_METHODS;
    } else if (paymentMethodParam === "credit") {
      methodFilter = CREDIT_METHODS;
    } else {
      methodFilter = [...CASH_METHODS, ...CREDIT_METHODS];
    }

    // Query to get all planned amounts across all periods
    const plannedData = await sql<RowData>`
      SELECT
        c.id as category_id,
        c.name as category_name,
        c.tipo_gasto,
        p.id as period_id,
        p.name as period_name,
        p.month,
        p.year,
        COALESCE(SUM(CASE WHEN b.payment_method = ANY(${methodFilter}::text[]) THEN b.expected_amount ELSE 0 END), 0) as total_planned,
        0 as total_spent
      FROM categories c
      CROSS JOIN periods p
      LEFT JOIN budgets b ON c.id = b.category_id AND p.id = b.period_id
      GROUP BY c.id, c.name, c.tipo_gasto, p.id, p.name, p.month, p.year
      ORDER BY p.year DESC, p.month DESC, c.name ASC
    `;

    // Query to get all spent amounts across all periods
    const spentData = await sql<RowData>`
      SELECT
        c.id as category_id,
        c.name as category_name,
        c.tipo_gasto,
        p.id as period_id,
        p.name as period_name,
        p.month,
        p.year,
        0 as total_planned,
        COALESCE(SUM(CASE WHEN e.payment_method = ANY(${methodFilter}::text[]) THEN e.amount ELSE 0 END), 0) as total_spent
      FROM categories c
      CROSS JOIN periods p
      LEFT JOIN expenses e ON c.id = e.category_id AND p.id = e.period_id
      GROUP BY c.id, c.name, c.tipo_gasto, p.id, p.name, p.month, p.year
      ORDER BY p.year DESC, p.month DESC, c.name ASC
    `;

    // Merge planned and spent data
    const mergedData: Record<string, Record<string, RowData>> = {};

    plannedData.forEach((row) => {
      const key = `${row.category_id}-${row.period_id}`;
      if (!mergedData[row.category_id]) {
        mergedData[row.category_id] = {};
      }
      mergedData[row.category_id][row.period_id] = {
        ...row,
        total_spent: 0,
      };
    });

    spentData.forEach((row) => {
      const key = `${row.category_id}-${row.period_id}`;
      if (!mergedData[row.category_id]) {
        mergedData[row.category_id] = {};
      }
      if (mergedData[row.category_id][row.period_id]) {
        mergedData[row.category_id][row.period_id].total_spent =
          row.total_spent;
      } else {
        mergedData[row.category_id][row.period_id] = {
          ...row,
          total_planned: 0,
        };
      }
    });

    // Build response data
    const overspendByCategory: CategoryOverspendRow[] = [];
    let totalPlaneadoGlobal = 0;
    let totalActualGlobal = 0;
    let totalOverspendGlobal = 0;
    const overspendByPaymentMethod = { cash: 0, debit: 0, credit: 0 };

    Object.entries(mergedData).forEach(([categoryId, periodData]) => {
      // Skip excluded categories
      if (excludedCategories.includes(categoryId)) {
        return;
      }

      const categoryEntry: CategoryOverspendRow = {
        categoryId,
        categoryName: "",
        tipoGasto: undefined,
        periods: [],
        totalPlaneado: 0,
        totalActual: 0,
        totalOverspend: 0,
      };

      Object.entries(periodData).forEach(([periodId, data]) => {
        if (!categoryEntry.categoryName) {
          categoryEntry.categoryName = data.category_name;
          categoryEntry.tipoGasto = data.tipo_gasto || undefined;
        }

        const planeado = data.total_planned || 0;
        const actual = data.total_spent || 0;
        const overspend = Math.max(0, actual - planeado);

        categoryEntry.periods.push({
          periodId,
          periodName: data.period_name,
          month: data.month,
          year: data.year,
          planeado,
          actual,
          overspend,
        });

        categoryEntry.totalPlaneado += planeado;
        categoryEntry.totalActual += actual;
        categoryEntry.totalOverspend += overspend;
      });

      // Only include categories with overspend or budget
      if (
        categoryEntry.totalPlaneado > 0 ||
        categoryEntry.totalOverspend > 0
      ) {
        overspendByCategory.push(categoryEntry);
        totalPlaneadoGlobal += categoryEntry.totalPlaneado;
        totalActualGlobal += categoryEntry.totalActual;
        totalOverspendGlobal += categoryEntry.totalOverspend;
      }
    });

    // Calculate overspend by payment method
    if (methodFilter.includes("cash") || methodFilter.includes("debit")) {
      overspendByPaymentMethod.cash = 0; // Placeholder - more detailed breakdown would need separate query
      overspendByPaymentMethod.debit = 0;
    }
    if (methodFilter.includes("credit")) {
      overspendByPaymentMethod.credit = 0;
    }

    // Sort by total overspend descending
    overspendByCategory.sort(
      (a, b) => b.totalOverspend - a.totalOverspend
    );

    const response: AllPeriodsOverspendResponse = {
      overspendByCategory,
      summary: {
        totalPlaneado: totalPlaneadoGlobal,
        totalActual: totalActualGlobal,
        totalOverspend: totalOverspendGlobal,
        overspendByPaymentMethod,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching all-periods overspend data:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
