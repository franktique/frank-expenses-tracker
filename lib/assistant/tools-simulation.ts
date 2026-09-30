import { sql } from '@/lib/db';
import {
  buildSavingsProposal,
  normalizeBudgetRow,
  type SavingsChangeInput,
} from '@/lib/simulation-savings';
import { num, TIPO_GASTO_LABELS, type ToolDefinition } from './tool-utils';

/**
 * Simulation-scoped tools. They are built per turn by `buildSimulationTools`
 * and bound to the simulation the user is currently viewing, so the model can
 * never read or propose changes for a different simulation.
 *
 * These tools are deliberately NOT part of the global `TOOLS` registry (which
 * is also exposed over MCP). `propose_savings_changes` never writes: it only
 * returns a proposal that the user must approve in the UI, which then calls
 * `POST /api/simulations/[id]/apply-savings`.
 */

export const PROPOSE_SAVINGS_TOOL_NAME = 'propose_savings_changes';

async function loadBudgetRows(simulationId: number) {
  const rows = await sql`
    SELECT
      sb.category_id,
      c.name AS category_name,
      c.tipo_gasto,
      sb.efectivo_amount,
      sb.credito_amount,
      sb.ahorro_efectivo_amount,
      sb.ahorro_credito_amount
    FROM simulation_budgets sb
    JOIN categories c ON c.id = sb.category_id
    WHERE sb.simulation_id = ${simulationId}
    ORDER BY c.name
  `;
  return rows as Record<string, unknown>[];
}

function buildGetSimulationOverview(simulationId: number): ToolDefinition {
  return {
    name: 'get_simulation_overview',
    description:
      'Devuelve la simulación de presupuesto que el usuario tiene abierta: nombre, ' +
      'ingreso total y, por categoría, tipo de gasto, montos efectivo/crédito, ' +
      'ahorro efectivo/crédito, total y balance. Incluye totales. Úsala antes de ' +
      'analizar o proponer cambios sobre la simulación.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    async handler() {
      const [simulation] = await sql`
        SELECT id, name FROM simulations WHERE id = ${simulationId}
      `;
      if (!simulation) throw new Error('Simulación no encontrada');

      const [income] = await sql`
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM simulation_incomes WHERE simulation_id = ${simulationId}
      `;
      const totalIncome = num(income?.total);

      const rows = await loadBudgetRows(simulationId);
      const categories = rows.map((r) => {
        const b = normalizeBudgetRow(r);
        const tipo = (r.tipo_gasto as string | null) ?? null;
        return {
          category_id: b.category_id,
          category_name: b.category_name,
          tipo_gasto: tipo,
          tipo_gasto_label: tipo ? TIPO_GASTO_LABELS[tipo] || tipo : null,
          efectivo: b.efectivo_amount,
          credito: b.credito_amount,
          ahorro_efectivo: b.ahorro_efectivo_amount,
          ahorro_credito: b.ahorro_credito_amount,
          total:
            b.efectivo_amount +
            b.credito_amount -
            b.ahorro_efectivo_amount -
            b.ahorro_credito_amount,
        };
      });

      const sum = (
        k:
          | 'efectivo'
          | 'credito'
          | 'ahorro_efectivo'
          | 'ahorro_credito'
          | 'total'
      ) => categories.reduce((s, c) => s + c[k], 0);
      const totalEfectivo = sum('efectivo');
      const ahorroEfectivo = sum('ahorro_efectivo');

      return {
        simulation: { id: simulation.id, name: simulation.name },
        total_income: totalIncome,
        totals: {
          efectivo: totalEfectivo,
          credito: sum('credito'),
          ahorro_efectivo: ahorroEfectivo,
          ahorro_credito: sum('ahorro_credito'),
          total: sum('total'),
          // Same rule as the simulation table: the balance only discounts the
          // cash column net of cash savings (credit savings do not affect it).
          balance: totalIncome - (totalEfectivo - ahorroEfectivo),
        },
        categories,
      };
    },
  };
}

function buildCompareToActuals(simulationId: number): ToolDefinition {
  return {
    name: 'compare_simulation_to_actuals',
    description:
      'Compara, por categoría, lo presupuestado en la simulación (efectivo+crédito) ' +
      'con el gasto real promedio mensual de los últimos N periodos (default 3), ' +
      'separado en efectivo/débito y crédito. Sirve para detectar categorías donde ' +
      'el presupuesto es holgado o insuficiente y decidir dónde ajustar ahorros.',
    inputSchema: {
      type: 'object',
      properties: {
        periods: {
          type: 'number',
          description: 'Periodos recientes a promediar (default 3, máx 12).',
        },
      },
      additionalProperties: false,
    },
    async handler(input) {
      const periods = Math.min(Math.max(Number(input.periods) || 3, 1), 12);
      const rows = await sql`
        WITH recent AS (
          SELECT id FROM periods ORDER BY year DESC, month DESC LIMIT ${periods}
        ),
        actual AS (
          SELECT
            e.category_id,
            SUM(CASE WHEN e.payment_method = 'credit' THEN e.amount ELSE 0 END) AS credit,
            SUM(CASE WHEN e.payment_method IN ('cash','debit') THEN e.amount ELSE 0 END) AS cash_debit
          FROM expenses e
          JOIN recent r ON r.id = e.period_id
          WHERE (e.pending IS NULL OR e.pending = false)
          GROUP BY e.category_id
        )
        SELECT
          sb.category_id,
          c.name AS category_name,
          c.tipo_gasto,
          sb.efectivo_amount,
          sb.credito_amount,
          sb.ahorro_efectivo_amount,
          sb.ahorro_credito_amount,
          COALESCE(a.cash_debit, 0) AS actual_cash_debit,
          COALESCE(a.credit, 0) AS actual_credit
        FROM simulation_budgets sb
        JOIN categories c ON c.id = sb.category_id
        LEFT JOIN actual a ON a.category_id = sb.category_id
        WHERE sb.simulation_id = ${simulationId}
        ORDER BY c.name
      `;

      return {
        periods_averaged: periods,
        categories: (rows as Record<string, unknown>[]).map((r) => {
          const b = normalizeBudgetRow(r);
          const avgCash = num(r.actual_cash_debit) / periods;
          const avgCredit = num(r.actual_credit) / periods;
          return {
            category_id: b.category_id,
            category_name: b.category_name,
            tipo_gasto: r.tipo_gasto ?? null,
            budget_efectivo: b.efectivo_amount,
            budget_credito: b.credito_amount,
            ahorro_efectivo: b.ahorro_efectivo_amount,
            ahorro_credito: b.ahorro_credito_amount,
            avg_actual_efectivo_debito: Math.round(avgCash),
            avg_actual_credito: Math.round(avgCredit),
            // Positive = budget larger than real spending (room for savings).
            slack_efectivo: Math.round(b.efectivo_amount - avgCash),
            slack_credito: Math.round(b.credito_amount - avgCredit),
          };
        }),
      };
    },
  };
}

function buildProposeSavingsChanges(simulationId: number): ToolDefinition {
  return {
    name: PROPOSE_SAVINGS_TOOL_NAME,
    description:
      'PROPONE cambios en las columnas "Ahorro Efectivo" y/o "Ahorro Crédito" de la ' +
      'simulación actual. NO modifica nada: devuelve una propuesta (antes → después) ' +
      'que el usuario debe aprobar con un botón en la interfaz. Reglas: ahorro ≥ 0, ' +
      'ahorro efectivo ≤ monto efectivo y ahorro crédito ≤ monto crédito de la ' +
      'categoría. Solo incluye las categorías que quieras cambiar. Úsala SOLO cuando ' +
      'el usuario pida o acepte una propuesta de ahorro.',
    inputSchema: {
      type: 'object',
      properties: {
        rationale: {
          type: 'string',
          description: 'Explicación breve (1-3 frases) de por qué se propone.',
        },
        changes: {
          type: 'array',
          description: 'Cambios por categoría.',
          items: {
            type: 'object',
            properties: {
              category_id: {
                type: 'string',
                description:
                  'category_id tal como lo devuelve get_simulation_overview.',
              },
              ahorro_efectivo_amount: {
                type: 'number',
                description:
                  'Nuevo ahorro efectivo (omitir para no cambiarlo).',
              },
              ahorro_credito_amount: {
                type: 'number',
                description: 'Nuevo ahorro crédito (omitir para no cambiarlo).',
              },
            },
            required: ['category_id'],
          },
        },
      },
      required: ['changes'],
      additionalProperties: false,
    },
    async handler(input) {
      const raw = Array.isArray(input.changes) ? input.changes : [];
      const changes: SavingsChangeInput[] = raw
        .filter(
          (c): c is Record<string, unknown> => !!c && typeof c === 'object'
        )
        .map((c) => ({
          category_id: String(c.category_id),
          ...(c.ahorro_efectivo_amount !== undefined
            ? { ahorro_efectivo_amount: Number(c.ahorro_efectivo_amount) }
            : {}),
          ...(c.ahorro_credito_amount !== undefined
            ? { ahorro_credito_amount: Number(c.ahorro_credito_amount) }
            : {}),
        }));

      const rows = (await loadBudgetRows(simulationId)).map(normalizeBudgetRow);
      const proposal = buildSavingsProposal(rows, changes);

      return {
        kind: 'savings_proposal',
        simulation_id: simulationId,
        rationale:
          typeof input.rationale === 'string' ? input.rationale : undefined,
        ...proposal,
        status:
          proposal.changes.length > 0
            ? 'pendiente_de_aprobacion'
            : 'sin_cambios_validos',
      };
    },
  };
}

export function buildSimulationTools(simulationId: number): ToolDefinition[] {
  return [
    buildGetSimulationOverview(simulationId),
    buildCompareToActuals(simulationId),
    buildProposeSavingsChanges(simulationId),
  ];
}
