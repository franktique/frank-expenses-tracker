import { sql } from '@/lib/db';

/**
 * Assistant tool definitions.
 *
 * Each tool is SDK-agnostic: a plain async function with a JSON Schema for its
 * input. The agent runner (lib/assistant/agent.ts) is responsible for shipping
 * these to the model and dispatching calls. This keeps the tools reusable
 * across the base Anthropic SDK (used here for Next.js compatibility) and the
 * Claude Agent SDK (which could wrap them via `tool()` if subprocess mode is
 * ever needed).
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

async function getActivePeriod(): Promise<{ id: string; name: string; month: number; year: number } | null> {
  const rows = await sql`
    SELECT id, name, month, year FROM periods WHERE is_open = true LIMIT 1
  `;
  return (rows[0] as any) || null;
}

const TIPO_GASTO_LABELS: Record<string, string> = {
  F: 'Fijo',
  V: 'Variable',
  SF: 'Semi Fijo',
  E: 'Eventual',
};

// ----------------------------------------------------------------------------
// Tool: get_active_period_summary
// ----------------------------------------------------------------------------

const getActivePeriodSummary: ToolDefinition = {
  name: 'get_active_period_summary',
  description:
    'Devuelve un resumen del periodo activo: ingresos totales, gastos totales, ' +
    'presupuesto total planificado, balance (ingresos - gastos) y remanente ' +
    '(presupuesto - gastado). Usa esto como primera llamada para entender la ' +
    'situación financiera general del usuario.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  async handler() {
    const activePeriod = await getActivePeriod();
    if (!activePeriod) {
      return { error: 'No hay ningún periodo activo actualmente.' };
    }

    const [income] = await sql`
      SELECT COALESCE(SUM(amount), 0) AS total FROM incomes WHERE period_id = ${activePeriod.id}
    `;
    const [expense] = await sql`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE period_id = ${activePeriod.id}
        AND (pending IS NULL OR pending = false)
    `;
    const [budget] = await sql`
      SELECT COALESCE(SUM(expected_amount), 0) AS total
      FROM budgets WHERE period_id = ${activePeriod.id}
    `;

    const totalIncome = num(income?.total);
    const totalExpenses = num(expense?.total);
    const totalBudget = num(budget?.total);

    return {
      period: activePeriod,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      total_budgeted: totalBudget,
      balance: totalIncome - totalExpenses,
      budget_remaining: totalBudget - totalExpenses,
    };
  },
};

// ----------------------------------------------------------------------------
// Tool: get_overspend_by_category
// ----------------------------------------------------------------------------

const getOverspendByCategory: ToolDefinition = {
  name: 'get_overspend_by_category',
  description:
    'Devuelve las categorías que superaron el presupuesto para el periodo activo ' +
    '(o el indicado). Para cada una: nombre, tipo (F/V/SF/E), planificado, gastado, ' +
    'excedente (gastado - planificado) y porcentaje de excedente. Usa esto para ' +
    'identificar dónde el usuario está gastando de más.',
  inputSchema: {
    type: 'object',
    properties: {
      period_id: {
        type: 'string',
        description: 'ID del periodo. Si se omite, usa el periodo activo.',
      },
    },
    additionalProperties: false,
  },
  async handler(input) {
    const periodId = (input.period_id as string) || (await getActivePeriod())?.id;
    if (!periodId) return { error: 'No hay periodo activo.' };

    const rows = await sql`
      WITH spend AS (
        SELECT category_id, COALESCE(SUM(amount), 0) AS spent
        FROM expenses
        WHERE period_id = ${periodId} AND (pending IS NULL OR pending = false)
        GROUP BY category_id
      ),
      planned AS (
        SELECT category_id, COALESCE(SUM(expected_amount), 0) AS budgeted
        FROM budgets WHERE period_id = ${periodId}
        GROUP BY category_id
      )
      SELECT
        c.id AS category_id,
        c.name AS category_name,
        c.tipo_gasto,
        COALESCE(p.budgeted, 0) AS budgeted,
        COALESCE(s.spent, 0) AS spent
      FROM categories c
      LEFT JOIN planned p ON p.category_id = c.id
      LEFT JOIN spend s ON s.category_id = c.id
      WHERE COALESCE(p.budgeted, 0) > 0 OR COALESCE(s.spent, 0) > 0
    `;

    const overspend = (rows as any[])
      .map((r) => ({
        category_id: r.category_id,
        category_name: r.category_name,
        tipo_gasto: r.tipo_gasto,
        tipo_gasto_label: TIPO_GASTO_LABELS[r.tipo_gasto as string] || null,
        budgeted: num(r.budgeted),
        spent: num(r.spent),
        overspend: num(r.spent) - num(r.budgeted),
        overspend_pct: num(r.budgeted) > 0 ? (num(r.spent) - num(r.budgeted)) / num(r.budgeted) : null,
      }))
      .filter((r) => r.overspend > 0)
      .sort((a, b) => b.overspend - a.overspend);

    return {
      period_id: periodId,
      count: overspend.length,
      total_overspend: overspend.reduce((sum, r) => sum + r.overspend, 0),
      categories: overspend,
    };
  },
};

// ----------------------------------------------------------------------------
// Tool: get_category_spending
// ----------------------------------------------------------------------------

const getCategorySpending: ToolDefinition = {
  name: 'get_category_spending',
  description:
    'Devuelve el gasto por categoría para el periodo activo (o el indicado), con ' +
    'desglose por método de pago (efectivo/débito/crédito). Permite filtrar por ' +
    'categoría específica o método de pago.',
  inputSchema: {
    type: 'object',
    properties: {
      period_id: { type: 'string', description: 'ID del periodo. Default: activo.' },
      category_id: { type: 'string', description: 'Filtrar por categoría específica.' },
      payment_method: {
        type: 'string',
        enum: ['cash', 'debit', 'credit'],
        description: 'Filtrar por método de pago.',
      },
    },
    additionalProperties: false,
  },
  async handler(input) {
    const periodId = (input.period_id as string) || (await getActivePeriod())?.id;
    if (!periodId) return { error: 'No hay periodo activo.' };

    const paymentMethod = (input.payment_method as string) || null;
    const categoryId = (input.category_id as string) || null;

    const rows = await sql`
      SELECT
        c.id AS category_id,
        c.name AS category_name,
        c.tipo_gasto,
        COALESCE(SUM(e.amount), 0) AS total,
        SUM(CASE WHEN e.payment_method = 'credit' THEN e.amount ELSE 0 END) AS credit,
        SUM(CASE WHEN e.payment_method = 'debit' THEN e.amount ELSE 0 END) AS debit,
        SUM(CASE WHEN e.payment_method = 'cash' THEN e.amount ELSE 0 END) AS cash
      FROM categories c
      LEFT JOIN expenses e
        ON e.category_id = c.id
        AND e.period_id = ${periodId}
        AND (e.pending IS NULL OR e.pending = false)
        AND (${paymentMethod}::text IS NULL OR e.payment_method = ${paymentMethod})
      WHERE (${categoryId}::text IS NULL OR c.id = ${categoryId})
      GROUP BY c.id, c.name, c.tipo_gasto
      HAVING COALESCE(SUM(e.amount), 0) > 0
      ORDER BY total DESC
    `;

    return {
      period_id: periodId,
      payment_method_filter: paymentMethod || 'all',
      categories: (rows as any[]).map((r) => ({
        category_id: r.category_id,
        category_name: r.category_name,
        tipo_gasto: r.tipo_gasto,
        tipo_gasto_label: TIPO_GASTO_LABELS[r.tipo_gasto as string] || null,
        total: num(r.total),
        credit: num(r.credit),
        debit: num(r.debit),
        cash: num(r.cash),
      })),
    };
  },
};

// ----------------------------------------------------------------------------
// Tool: list_recent_expenses
// ----------------------------------------------------------------------------

const listRecentExpenses: ToolDefinition = {
  name: 'list_recent_expenses',
  description:
    'Devuelve los gastos más recientes del periodo activo, con categoría, monto, ' +
    'método de pago, fecha, tienda y descripción. Útil para inspeccionar ' +
    'transacciones específicas.',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Cantidad a devolver (default 10, máx 50).',
      },
      category_id: { type: 'string', description: 'Filtrar por categoría.' },
      period_id: { type: 'string', description: 'ID del periodo. Default: activo.' },
    },
    additionalProperties: false,
  },
  async handler(input) {
    const periodId = (input.period_id as string) || (await getActivePeriod())?.id;
    if (!periodId) return { error: 'No hay periodo activo.' };

    const limit = Math.min(Math.max(Number(input.limit) || 10, 1), 50);
    const categoryId = (input.category_id as string) || null;

    const rows = await sql`
      SELECT
        e.id, e.amount, e.payment_method, e.date, e.description, e.store_name,
        e.pending, e.created_at,
        c.name AS category_name,
        c.tipo_gasto
      FROM expenses e
      JOIN categories c ON c.id = e.category_id
      WHERE e.period_id = ${periodId}
        AND (${categoryId}::text IS NULL OR e.category_id = ${categoryId})
      ORDER BY e.created_at DESC
      LIMIT ${limit}
    `;

    return {
      period_id: periodId,
      count: (rows as any[]).length,
      expenses: (rows as any[]).map((r) => ({
        id: r.id,
        amount: num(r.amount),
        payment_method: r.payment_method,
        date: r.date,
        description: r.description,
        store_name: r.store_name,
        pending: r.pending,
        category_name: r.category_name,
        tipo_gasto: r.tipo_gasto,
      })),
    };
  },
};

// ----------------------------------------------------------------------------
// Tool: get_fund_balances
// ----------------------------------------------------------------------------

const getFundBalances: ToolDefinition = {
  name: 'get_fund_balances',
  description:
    'Devuelve todos los fondos (pools de dinero) con su balance actual y balance ' +
    'inicial. Útil cuando el usuario pregunta cuánto dinero tiene disponible o en ' +
    'qué fondo está su dinero.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  async handler() {
    const rows = await sql`
      SELECT id, name, initial_balance, current_balance, start_date
      FROM funds
      ORDER BY name ASC
    `;
    return {
      funds: (rows as any[]).map((r) => ({
        id: r.id,
        name: r.name,
        initial_balance: num(r.initial_balance),
        current_balance: num(r.current_balance),
        start_date: r.start_date,
      })),
    };
  },
};

// ----------------------------------------------------------------------------
// Tool: get_budget_execution
// ----------------------------------------------------------------------------

const getBudgetExecution: ToolDefinition = {
  name: 'get_budget_execution',
  description:
    'Devuelve la ejecución presupuestaria proyectada del periodo: pagos planificados ' +
    'agrupados por fecha. Útil para planificación de flujo de caja y saber cuándo ' +
    'vencen pagos.',
  inputSchema: {
    type: 'object',
    properties: {
      period_id: { type: 'string', description: 'ID del periodo. Default: activo.' },
    },
    additionalProperties: false,
  },
  async handler(input) {
    const periodId = (input.period_id as string) || (await getActivePeriod())?.id;
    if (!periodId) return { error: 'No hay periodo activo.' };

    const rows = await sql`
      SELECT
        b.id AS budget_id,
        b.expected_amount,
        b.payment_method,
        b.default_date,
        c.id AS category_id,
        c.name AS category_name,
        c.tipo_gasto
      FROM budgets b
      JOIN categories c ON c.id = b.category_id
      WHERE b.period_id = ${periodId}
      ORDER BY b.default_date ASC
    `;

    const byDate = new Map<string, { date: string; total: number; items: any[] }>();
    for (const r of rows as any[]) {
      const date = r.default_date ? String(r.default_date).slice(0, 10) : 'sin_fecha';
      if (!byDate.has(date)) byDate.set(date, { date, total: 0, items: [] });
      const entry = byDate.get(date)!;
      entry.total += num(r.expected_amount);
      entry.items.push({
        budget_id: r.budget_id,
        category_name: r.category_name,
        tipo_gasto: r.tipo_gasto,
        amount: num(r.expected_amount),
        payment_method: r.payment_method,
      });
    }

    return {
      period_id: periodId,
      total_budgeted: num((rows as any[]).reduce((s, r) => s + num(r.expected_amount), 0)),
      by_date: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)),
    };
  },
};

// ----------------------------------------------------------------------------
// Tool: get_spending_history
// ----------------------------------------------------------------------------

const getSpendingHistory: ToolDefinition = {
  name: 'get_spending_history',
  description:
    'Devuelve el historial de gasto de los últimos N periodos (default 6), con ' +
    'desglose por método de pago. Útil para detectar tendencias y comparar el ' +
    'periodo actual con periodos anteriores.',
  inputSchema: {
    type: 'object',
    properties: {
      periods: {
        type: 'number',
        description: 'Cantidad de periodos a devolver (default 6, máx 13).',
      },
      category_id: {
        type: 'string',
        description: 'Filtrar por categoría específica para ver su tendencia.',
      },
    },
    additionalProperties: false,
  },
  async handler(input) {
    const periods = Math.min(Math.max(Number(input.periods) || 6, 1), 13);
    const categoryId = (input.category_id as string) || null;

    const rows = await sql`
      WITH recent AS (
        SELECT id, name, month, year FROM periods
        ORDER BY year DESC, month DESC LIMIT ${periods}
      )
      SELECT
        p.id AS period_id, p.name AS period_name, p.month, p.year,
        COALESCE(SUM(e.amount), 0) AS total,
        SUM(CASE WHEN e.payment_method = 'credit' THEN e.amount ELSE 0 END) AS credit,
        SUM(CASE WHEN e.payment_method IN ('cash','debit') THEN e.amount ELSE 0 END) AS cash_debit
      FROM recent p
      LEFT JOIN expenses e ON e.period_id = p.id
        AND (e.pending IS NULL OR e.pending = false)
        AND (${categoryId}::text IS NULL OR e.category_id = ${categoryId})
      GROUP BY p.id, p.name, p.month, p.year
      ORDER BY p.year ASC, p.month ASC
    `;

    return {
      category_filter: categoryId || null,
      periods: (rows as any[]).map((r) => ({
        period_id: r.period_id,
        period_name: r.period_name,
        month: r.month,
        year: r.year,
        total: num(r.total),
        credit: num(r.credit),
        cash_debit: num(r.cash_debit),
      })),
    };
  },
};

// ----------------------------------------------------------------------------
// Tool: suggest_savings (the headline tool)
// ----------------------------------------------------------------------------

const suggestSavings: ToolDefinition = {
  name: 'suggest_savings',
  description:
    'Calcula opciones concretas para ahorrar una cantidad objetivo (target_amount) ' +
    'en el periodo activo. Devuelve candidatos ordenados por potencial de ahorro, ' +
    'priorizando categorías variables (V) y semi-fijas (SF) sobre fijas (F), y ' +
    'categorias con excedente primero. Cada opción incluye cuánto se puede ahorrar ' +
    'y de dónde. USA ESTA HERRAMIENTA cuando el usuario pregunte cómo ahorrar X, ' +
    'cómo recortar gastos, u optimizar su presupuesto. NO inventes montos: apóyate ' +
    'en los resultados de esta herramienta.',
  inputSchema: {
    type: 'object',
    properties: {
      target_amount: {
        type: 'number',
        description: 'Cantidad objetivo a ahorrar en el periodo.',
      },
      period_id: { type: 'string', description: 'ID del periodo. Default: activo.' },
    },
    required: ['target_amount'],
    additionalProperties: false,
  },
  async handler(input) {
    const periodId = (input.period_id as string) || (await getActivePeriod())?.id;
    if (!periodId) return { error: 'No hay periodo activo.' };

    const target = Number(input.target_amount);
    if (!Number.isFinite(target) || target <= 0) {
      return { error: 'target_amount debe ser un número positivo.' };
    }

    const rows = await sql`
      WITH spend AS (
        SELECT category_id,
          COALESCE(SUM(amount), 0) AS spent,
          SUM(CASE WHEN payment_method = 'credit' THEN amount ELSE 0 END) AS credit,
          SUM(CASE WHEN payment_method IN ('cash','debit') THEN amount ELSE 0 END) AS cash_debit
        FROM expenses
        WHERE period_id = ${periodId} AND (pending IS NULL OR pending = false)
        GROUP BY category_id
      ),
      planned AS (
        SELECT category_id, COALESCE(SUM(expected_amount), 0) AS budgeted
        FROM budgets WHERE period_id = ${periodId}
        GROUP BY category_id
      )
      SELECT
        c.id AS category_id, c.name AS category_name, c.tipo_gasto,
        COALESCE(p.budgeted, 0) AS budgeted,
        COALESCE(s.spent, 0) AS spent,
        COALESCE(s.credit, 0) AS credit,
        COALESCE(s.cash_debit, 0) AS cash_debit
      FROM categories c
      LEFT JOIN planned p ON p.category_id = c.id
      LEFT JOIN spend s ON s.category_id = c.id
      WHERE COALESCE(s.spent, 0) > 0
    `;

    // Priority: overspent variable/semi-fixed categories first, then by flexibility.
    const tipoPriority: Record<string, number> = { V: 0, SF: 1, E: 2, F: 3 };

    const candidates = (rows as any[])
      .map((r) => {
        const budgeted = num(r.budgeted);
        const spent = num(r.spent);
        const overspend = Math.max(0, spent - budgeted);
        const tipo = (r.tipo_gasto as string) || 'F';

        // Two savings options per category:
        // 1) cut_to_budget: only available if overspent. Savings = overspend.
        // 2) cut_10_pct: cut 10% of total spent (variable categories are most realistic).
        const options: Array<{
          type: string;
          label: string;
          potential_savings: number;
          rationale: string;
        }> = [];

        if (overspend > 0) {
          options.push({
            type: 'cut_to_budget',
            label: `Recortar a lo presupuestado (${budgeted.toLocaleString('es-MX')})`,
            potential_savings: overspend,
            rationale: `Gastado ${spent.toLocaleString('es-MX')} vs presupuestado ${budgeted.toLocaleString('es-MX')}`,
          });
        }

        const cutPct = tipo === 'V' ? 0.2 : tipo === 'SF' ? 0.1 : 0.05;
        const cutAmount = spent * cutPct;
        if (cutAmount > 0) {
          options.push({
            type: `cut_${Math.round(cutPct * 100)}_pct`,
            label: `Recortar ${Math.round(cutPct * 100)}% del gasto actual`,
            potential_savings: cutAmount,
            rationale: `Categoría ${TIPO_GASTO_LABELS[tipo] || tipo} — ajuste realista del ${Math.round(cutPct * 100)}% sobre ${spent.toLocaleString('es-MX')}`,
          });
        }

        return {
          category_id: r.category_id,
          category_name: r.category_name,
          tipo_gasto: tipo,
          tipo_gasto_label: TIPO_GASTO_LABELS[tipo] || tipo,
          budgeted,
          spent,
          overspend,
          priority: tipoPriority[tipo] ?? 9,
          options: options.sort((a, b) => b.potential_savings - a.potential_savings),
        };
      })
      .filter((c) => c.options.length > 0)
      .sort((a, b) => {
        // Overspend categories first (highest saving potential from cut_to_budget),
        // then by tipo priority, then by total spent descending.
        const aBest = a.options[0]?.potential_savings || 0;
        const bBest = b.options[0]?.potential_savings || 0;
        if (bBest !== aBest) return bBest - aBest;
        return a.priority - b.priority;
      });

    // Greedily build a suggested plan that meets the target.
    let remaining = target;
    const plan: Array<{
      category_name: string;
      tipo_gasto_label: string;
      action: string;
      savings: number;
    }> = [];
    for (const c of candidates) {
      if (remaining <= 0) break;
      const best = c.options[0];
      if (!best) continue;
      const contribution = Math.min(best.potential_savings, remaining);
      plan.push({
        category_name: c.category_name,
        tipo_gasto_label: c.tipo_gasto_label,
        action: best.label,
        savings: contribution,
      });
      remaining -= contribution;
    }

    return {
      period_id: periodId,
      target_amount: target,
      achievable: remaining <= 0,
      shortfall: Math.max(0, remaining),
      suggested_plan: plan,
      total_plan_savings: plan.reduce((s, x) => s + x.savings, 0),
      all_candidates: candidates,
    };
  },
};

// ----------------------------------------------------------------------------
// Tool: get_category_breakdown
// ----------------------------------------------------------------------------

const getCategoryBreakdown: ToolDefinition = {
  name: 'get_category_breakdown',
  description:
    'Devuelve el gasto del periodo agrupado por tipo de gasto (F=Fijo, V=Variable, ' +
    'SF=Semi Fijo, E=Eventual). Útil para entender la composición estructural del ' +
    'gasto del usuario.',
  inputSchema: {
    type: 'object',
    properties: {
      period_id: { type: 'string', description: 'ID del periodo. Default: activo.' },
    },
    additionalProperties: false,
  },
  async handler(input) {
    const periodId = (input.period_id as string) || (await getActivePeriod())?.id;
    if (!periodId) return { error: 'No hay periodo activo.' };

    const rows = await sql`
      SELECT
        COALESCE(c.tipo_gasto, 'F') AS tipo_gasto,
        COALESCE(SUM(e.amount), 0) AS total,
        COUNT(DISTINCT c.id) AS category_count
      FROM categories c
      LEFT JOIN expenses e ON e.category_id = c.id AND e.period_id = ${periodId}
        AND (e.pending IS NULL OR e.pending = false)
      GROUP BY COALESCE(c.tipo_gasto, 'F')
      ORDER BY total DESC
    `;

    return {
      period_id: periodId,
      breakdown: (rows as any[]).map((r) => ({
        tipo_gasto: r.tipo_gasto,
        tipo_gasto_label: TIPO_GASTO_LABELS[r.tipo_gasto as string] || r.tipo_gasto,
        total: num(r.total),
        category_count: Number(r.category_count),
      })),
    };
  },
};

// ----------------------------------------------------------------------------
// Registry
// ----------------------------------------------------------------------------

export const TOOLS: ToolDefinition[] = [
  getActivePeriodSummary,
  getOverspendByCategory,
  getCategorySpending,
  listRecentExpenses,
  getFundBalances,
  getBudgetExecution,
  getSpendingHistory,
  suggestSavings,
  getCategoryBreakdown,
];

export const TOOLS_BY_NAME: Record<string, ToolDefinition> = Object.fromEntries(
  TOOLS.map((t) => [t.name, t])
);

export async function dispatchTool(
  name: string,
  input: Record<string, unknown>
): Promise<{ ok: true; result: unknown } | { ok: false; error: string }> {
  const tool = TOOLS_BY_NAME[name];
  if (!tool) return { ok: false, error: `Herramienta desconocida: ${name}` };
  try {
    const result = await tool.handler(input || {});
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// Helper exported for tests / consumers that need just the schemas.
export function getToolsAsJsonSchema() {
  return TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));
}
