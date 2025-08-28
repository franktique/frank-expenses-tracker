import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

interface SimulationAnalyticsResult {
  grouper_id: number;
  grouper_name: string;
  simulation_total: number;
  historical_avg?: number;
  variance_percentage?: number;
  is_simulation: boolean;
}

interface HistoricalPeriodData {
  grouper_id: number;
  grouper_name: string;
  period_id: number;
  period_name: string;
  total_amount: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const simulationId = parseInt(id);

    if (isNaN(simulationId)) {
      return NextResponse.json(
        { error: "ID de simulación inválido" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const estudioId = searchParams.get("estudioId");
    const grouperIds = searchParams.get("grouperIds");
    const paymentMethods = searchParams.get("paymentMethods");
    const comparisonPeriods = parseInt(
      searchParams.get("comparisonPeriods") || "3"
    );

    // Validate simulation exists
    const [simulation] = await sql`
      SELECT id, name FROM simulations WHERE id = ${simulationId}
    `;

    if (!simulation) {
      return NextResponse.json(
        { error: "Simulación no encontrada" },
        { status: 404 }
      );
    }

    // Parse grouperIds if provided
    let grouperIdsArray: number[] | null = null;
    if (grouperIds) {
      try {
        grouperIdsArray = grouperIds.split(",").map((id) => {
          const parsed = parseInt(id.trim(), 10);
          if (isNaN(parsed)) {
            throw new Error(`Invalid grouper ID: ${id}`);
          }
          return parsed;
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: `Invalid grouperIds parameter: ${(error as Error).message}`,
          },
          { status: 400 }
        );
      }
    }

    // Parse payment methods
    let paymentMethodsArray: string[] | null = null;
    if (paymentMethods && paymentMethods !== "all") {
      try {
        paymentMethodsArray = paymentMethods.split(",").map((method) => {
          const trimmed = method.trim();
          if (!["efectivo", "credito"].includes(trimmed)) {
            throw new Error(`Invalid payment method: ${trimmed}`);
          }
          return trimmed;
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: `Invalid paymentMethods parameter: ${
              (error as Error).message
            }`,
          },
          { status: 400 }
        );
      }
    }

    // Build simulation data query
    let simulationQuery = `
      SELECT 
        g.id as grouper_id,
        g.name as grouper_name,
        COALESCE(SUM(
          CASE 
            WHEN $2::text[] IS NULL THEN sb.efectivo_amount + sb.credito_amount
            WHEN 'efectivo' = ANY($2::text[]) AND 'credito' = ANY($2::text[]) THEN sb.efectivo_amount + sb.credito_amount
            WHEN 'efectivo' = ANY($2::text[]) THEN sb.efectivo_amount
            WHEN 'credito' = ANY($2::text[]) THEN sb.credito_amount
            ELSE 0
          END
        ), 0) as simulation_total
      FROM groupers g`;

    // Add estudio filtering join if estudioId is provided
    if (estudioId) {
      simulationQuery += `
        INNER JOIN estudio_groupers eg ON eg.grouper_id = g.id
          AND eg.estudio_id = $3`;
    }

    simulationQuery += `
      LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
      LEFT JOIN categories c ON c.id = gc.category_id
      LEFT JOIN simulation_budgets sb ON sb.category_id = c.id 
        AND sb.simulation_id = $1`;

    // Add WHERE clause for grouper filtering
    if (grouperIdsArray && grouperIdsArray.length > 0) {
      const paramIndex = estudioId ? 4 : 3;
      simulationQuery += `
        WHERE g.id = ANY($${paramIndex}::int[])`;
    }

    simulationQuery += `
      GROUP BY g.id, g.name 
      ORDER BY g.name`;

    // Execute simulation query
    const simulationParams: (number | string[] | number[] | null)[] = [
      simulationId,
      paymentMethodsArray,
    ];

    if (estudioId) {
      simulationParams.push(parseInt(estudioId));
    }

    if (grouperIdsArray && grouperIdsArray.length > 0) {
      simulationParams.push(grouperIdsArray);
    }

    const simulationData = (await sql.query(
      simulationQuery,
      simulationParams
    )) as SimulationAnalyticsResult[];

    // Mark all simulation data
    simulationData.forEach((item) => {
      item.is_simulation = true;
    });

    // Get historical data for comparison if requested
    let historicalData: HistoricalPeriodData[] = [];
    let comparisonMetrics: any[] = [];

    if (comparisonPeriods > 0) {
      // Build historical data query similar to dashboard groupers
      let historicalQuery = `
        SELECT 
          g.id as grouper_id,
          g.name as grouper_name,
          p.id as period_id,
          p.name as period_name,
          COALESCE(SUM(e.amount), 0) as total_amount
        FROM groupers g
        CROSS JOIN (
          SELECT id, name, year, month 
          FROM periods 
          WHERE is_open = false 
          ORDER BY year DESC, month DESC 
          LIMIT $1
        ) p`;

      // Add estudio filtering join if estudioId is provided
      if (estudioId) {
        historicalQuery += `
          INNER JOIN estudio_groupers eg ON eg.grouper_id = g.id
            AND eg.estudio_id = $2`;
      }

      historicalQuery += `
        LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
        LEFT JOIN categories c ON c.id = gc.category_id
        LEFT JOIN expenses e ON e.category_id = c.id 
          AND e.period_id = p.id`;

      // Add payment method filtering for expenses
      if (estudioId) {
        // When estudioId is provided, use payment method configuration from estudio_groupers
        historicalQuery += `
          AND (
            eg.payment_methods IS NULL 
            OR e.payment_method IS NULL
            OR e.payment_method = ANY(eg.payment_methods)
          )`;
      } else if (paymentMethodsArray && paymentMethodsArray.length > 0) {
        // Legacy behavior: use paymentMethods parameter for filtering
        const paramIndex = 2;
        historicalQuery += `
          AND e.payment_method = ANY($${paramIndex}::text[])`;
      }

      // Add WHERE clause for grouper filtering
      if (grouperIdsArray && grouperIdsArray.length > 0) {
        const paramIndex = estudioId
          ? paymentMethodsArray && paymentMethodsArray.length > 0
            ? 4
            : 3
          : paymentMethodsArray && paymentMethodsArray.length > 0
          ? 3
          : 2;
        historicalQuery += `
          WHERE g.id = ANY($${paramIndex}::int[])`;
      }

      historicalQuery += `
        GROUP BY g.id, g.name, p.id, p.name, p.year, p.month
        ORDER BY g.name, p.year DESC, p.month DESC`;

      // Execute historical query
      const historicalParams: (number | string[] | number[] | null)[] = [
        comparisonPeriods,
      ];

      if (estudioId) {
        historicalParams.push(parseInt(estudioId));
      }

      if (!estudioId && paymentMethodsArray && paymentMethodsArray.length > 0) {
        historicalParams.push(paymentMethodsArray);
      }

      if (grouperIdsArray && grouperIdsArray.length > 0) {
        historicalParams.push(grouperIdsArray);
      }

      historicalData = (await sql.query(
        historicalQuery,
        historicalParams
      )) as HistoricalPeriodData[];

      // Calculate comparison metrics
      comparisonMetrics = simulationData.map((simItem) => {
        const grouperHistorical = historicalData.filter(
          (h) => h.grouper_id === simItem.grouper_id
        );

        if (grouperHistorical.length === 0) {
          return {
            grouper_id: simItem.grouper_id,
            grouper_name: simItem.grouper_name,
            avg_historical: 0,
            simulation_amount: simItem.simulation_total,
            variance_percentage: 0,
            trend: "stable" as const,
          };
        }

        const avgHistorical =
          grouperHistorical.reduce(
            (sum, h) => sum + parseFloat(h.total_amount.toString()),
            0
          ) / grouperHistorical.length;

        const variancePercentage =
          avgHistorical > 0
            ? ((simItem.simulation_total - avgHistorical) / avgHistorical) * 100
            : 0;

        let trend: "increase" | "decrease" | "stable" = "stable";
        if (Math.abs(variancePercentage) > 5) {
          // 5% threshold
          trend = variancePercentage > 0 ? "increase" : "decrease";
        }

        return {
          grouper_id: simItem.grouper_id,
          grouper_name: simItem.grouper_name,
          avg_historical: avgHistorical,
          simulation_amount: simItem.simulation_total,
          variance_percentage: variancePercentage,
          trend,
        };
      });

      // Add historical averages to simulation data
      simulationData.forEach((simItem) => {
        const metric = comparisonMetrics.find(
          (m) => m.grouper_id === simItem.grouper_id
        );
        if (metric) {
          simItem.historical_avg = metric.avg_historical;
          simItem.variance_percentage = metric.variance_percentage;
        }
      });
    }

    // Structure the response
    const response = {
      simulation_data: {
        simulation_id: simulationId,
        simulation_name: simulation.name,
        grouper_data: simulationData,
      },
      historical_data: historicalData,
      comparison_metrics: comparisonMetrics,
      metadata: {
        estudio_id: estudioId ? parseInt(estudioId) : null,
        grouper_ids: grouperIdsArray,
        payment_methods: paymentMethodsArray,
        comparison_periods: comparisonPeriods,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in simulation analytics API:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
