import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { 
  RemainderDashboardData, 
  RemainderCategoryItem, 
  RemainderDashboardTotals,
  calculateRemainderBudget 
} from "@/types/remainder-dashboard";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fundId = searchParams.get("fundId");
    const estudioId = searchParams.get("estudioId");
    const agrupadorIds = searchParams.get("agrupadorIds")?.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

    // Get active period
    const [activePeriod] = await sql`
      SELECT * FROM periods WHERE is_open = true
    `;

    if (!activePeriod) {
      return NextResponse.json({
        activePeriod: null,
        categories: [],
        totals: {
          totalCurrentExpenses: 0,
          totalOriginalBudget: 0,
          totalRemainderBudget: 0,
          categoriesCount: 0,
        },
        appliedFilters: {},
      } as RemainderDashboardData);
    }

    // For now, let's start with a simple query without complex filtering to get it working
    // We'll add the filtering later once the basic query works
    const categories = await sql`
      WITH category_expenses AS (
        SELECT 
          c.id as category_id,
          c.name as category_name,
          c.fund_id,
          f.name as fund_name,
          COALESCE(SUM(e.amount), 0) as current_expenses
        FROM categories c
        LEFT JOIN funds f ON c.fund_id = f.id
        LEFT JOIN expenses e ON c.id = e.category_id AND e.period_id = ${activePeriod.id}
        GROUP BY c.id, c.name, c.fund_id, f.name
      ),
      category_budgets AS (
        SELECT 
          c.id as category_id,
          COALESCE(SUM(b.expected_amount), 0) as original_planned_budget
        FROM categories c
        LEFT JOIN budgets b ON c.id = b.category_id AND b.period_id = ${activePeriod.id}
        GROUP BY c.id
      )
      SELECT 
        ce.category_id,
        ce.category_name,
        cb.original_planned_budget,
        ce.current_expenses,
        (cb.original_planned_budget - ce.current_expenses) as remainder_planned_budget,
        ce.fund_id,
        ce.fund_name,
        NULL as agrupador_id,
        NULL as agrupador_name,
        NULL as estudio_id,
        NULL as estudio_name
      FROM category_expenses ce
      JOIN category_budgets cb ON ce.category_id = cb.category_id
      WHERE cb.original_planned_budget > 0 
        AND ce.current_expenses < cb.original_planned_budget
      ORDER BY remainder_planned_budget DESC, ce.category_name ASC
    `;

    // Process and validate the data
    const processedCategories: RemainderCategoryItem[] = categories.map((row: any) => ({
      category_id: row.category_id,
      category_name: row.category_name,
      original_planned_budget: Number(row.original_planned_budget) || 0,
      current_expenses: Number(row.current_expenses) || 0,
      remainder_planned_budget: Number(row.remainder_planned_budget) || 0,
      fund_id: row.fund_id,
      fund_name: row.fund_name,
      agrupador_id: row.agrupador_id,
      agrupador_name: row.agrupador_name,
      estudio_id: row.estudio_id,
      estudio_name: row.estudio_name,
    }));

    // Calculate totals
    const totals: RemainderDashboardTotals = processedCategories.reduce(
      (acc, category) => ({
        totalCurrentExpenses: acc.totalCurrentExpenses + category.current_expenses,
        totalOriginalBudget: acc.totalOriginalBudget + category.original_planned_budget,
        totalRemainderBudget: acc.totalRemainderBudget + category.remainder_planned_budget,
        categoriesCount: acc.categoriesCount + 1,
      }),
      {
        totalCurrentExpenses: 0,
        totalOriginalBudget: 0,
        totalRemainderBudget: 0,
        categoriesCount: 0,
      }
    );

    // Get filter metadata for display
    let fundName: string | undefined;
    let estudioName: string | undefined;
    let agrupadorNames: string[] = [];

    if (fundId) {
      const [fund] = await sql`SELECT name FROM funds WHERE id = ${fundId}`;
      fundName = fund?.name;
    }

    if (estudioId) {
      const [estudio] = await sql`SELECT name FROM estudios WHERE id = ${estudioId}`;
      estudioName = estudio?.name;
    }

    if (agrupadorIds && agrupadorIds.length > 0) {
      const agrupadores = (await sql`
        SELECT name FROM groupers WHERE id = ANY(${agrupadorIds}) ORDER BY name
      `) as unknown as { name: string }[];
      agrupadorNames = agrupadores.map((g) => g.name);
    }

    const response: RemainderDashboardData = {
      activePeriod: {
        id: activePeriod.id,
        name: activePeriod.name,
      },
      categories: processedCategories,
      totals,
      appliedFilters: {
        fundId: fundId || undefined,
        fundName,
        estudioId: estudioId ? parseInt(estudioId) : undefined,
        estudioName,
        agrupadorIds,
        agrupadorNames,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error fetching remainder dashboard data:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch remainder dashboard data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}