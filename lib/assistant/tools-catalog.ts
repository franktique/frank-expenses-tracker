import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import {
  getActivePeriod,
  num,
  TIPO_GASTO_LABELS,
  type ToolDefinition,
} from '@/lib/assistant/tool-utils';
import { GET as getCreditCardProjection } from '@/app/api/credit-cards/projection/route';

/**
 * Read-only catalog/listing tools: periods, categories, incomes, expense
 * search, credit cards, debts, groupers, events and expense item details.
 * Everything here is SELECT-only.
 */

const PERIOD_ID_PROP = {
  type: 'string',
  description: 'ID del periodo. Default: periodo activo.',
};

function clampInt(v: unknown, def: number, min: number, max: number): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, min), max);
}

function optStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

function optNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function like(v: unknown): string | null {
  const s = optStr(v);
  return s ? `%${s}%` : null;
}

// ----------------------------------------------------------------------------
// list_periods
// ----------------------------------------------------------------------------

const listPeriods: ToolDefinition = {
  name: 'list_periods',
  description:
    'Lista los periodos (mes/año) del presupuesto, del más reciente al más antiguo, ' +
    'con ingresos, gastos y presupuesto totales de cada uno. Usa esto para obtener ' +
    'el period_id de otros meses. Nota: month es 0-indexado (0 = enero).',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Cantidad de periodos (default 12, máx 60).',
      },
    },
    additionalProperties: false,
  },
  async handler(input) {
    const limit = clampInt(input.limit, 12, 1, 60);
    const rows = await sql`
      SELECT
        p.id, p.name, p.month, p.year, p.is_open,
        (SELECT COALESCE(SUM(i.amount), 0) FROM incomes i WHERE i.period_id = p.id) AS total_income,
        (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e
           WHERE e.period_id = p.id AND (e.pending IS NULL OR e.pending = false)) AS total_expenses,
        (SELECT COALESCE(SUM(b.expected_amount), 0) FROM budgets b WHERE b.period_id = p.id) AS total_budgeted
      FROM periods p
      ORDER BY p.year DESC, p.month DESC
      LIMIT ${limit}
    `;
    return {
      count: rows.length,
      periods: (rows as any[]).map((r) => ({
        id: r.id,
        name: r.name,
        month: r.month,
        year: r.year,
        is_open: r.is_open,
        total_income: num(r.total_income),
        total_expenses: num(r.total_expenses),
        total_budgeted: num(r.total_budgeted),
      })),
    };
  },
};

// ----------------------------------------------------------------------------
// list_categories
// ----------------------------------------------------------------------------

const listCategories: ToolDefinition = {
  name: 'list_categories',
  description:
    'Lista todas las categorías de gasto con su tipo (F/V/SF/E), fondos asociados, ' +
    'frecuencia de recurrencia, día de pago por defecto y tarjeta de crédito por ' +
    'defecto. Usa esto para obtener category_id.',
  inputSchema: {
    type: 'object',
    properties: {
      tipo_gasto: {
        type: 'string',
        enum: ['F', 'V', 'SF', 'E'],
        description: 'Filtrar por tipo de gasto.',
      },
      search: { type: 'string', description: 'Texto contenido en el nombre.' },
    },
    additionalProperties: false,
  },
  async handler(input) {
    const tipo = optStr(input.tipo_gasto);
    const search = like(input.search);
    const rows = await sql`
      SELECT
        c.id, c.name, c.tipo_gasto, c.default_day, c.recurrence_frequency,
        cc.bank_name, cc.franchise, cc.last_four_digits,
        COALESCE(
          (SELECT json_agg(f.name ORDER BY f.name)
             FROM category_fund_relationships cfr
             JOIN funds f ON f.id = cfr.fund_id
            WHERE cfr.category_id = c.id),
          '[]'::json
        ) AS funds
      FROM categories c
      LEFT JOIN credit_cards cc ON cc.id = c.default_credit_card_id
      WHERE (${tipo}::text IS NULL OR c.tipo_gasto = ${tipo})
        AND (${search}::text IS NULL OR c.name ILIKE ${search})
      ORDER BY c.name
    `;
    return {
      count: rows.length,
      categories: (rows as any[]).map((r) => ({
        id: r.id,
        name: r.name,
        tipo_gasto: r.tipo_gasto ?? null,
        tipo_gasto_label: r.tipo_gasto
          ? TIPO_GASTO_LABELS[r.tipo_gasto as string] || r.tipo_gasto
          : null,
        funds: r.funds,
        recurrence_frequency: r.recurrence_frequency ?? null,
        default_day: r.default_day ?? null,
        default_credit_card: r.bank_name
          ? `${r.bank_name} ${r.franchise} ****${r.last_four_digits}`
          : null,
      })),
    };
  },
};

// ----------------------------------------------------------------------------
// list_incomes
// ----------------------------------------------------------------------------

const listIncomes: ToolDefinition = {
  name: 'list_incomes',
  description:
    'Lista los ingresos de un periodo (default: activo) con descripción, monto, ' +
    'fecha, evento y fondo destino.',
  inputSchema: {
    type: 'object',
    properties: { period_id: PERIOD_ID_PROP },
    additionalProperties: false,
  },
  async handler(input) {
    const periodId =
      optStr(input.period_id) || (await getActivePeriod())?.id || null;
    if (!periodId) return { error: 'No hay periodo activo.' };
    const rows = await sql`
      SELECT i.id, i.description, i.amount, i.event, i.date, f.name AS fund_name
      FROM incomes i
      LEFT JOIN funds f ON f.id = i.fund_id
      WHERE i.period_id = ${periodId}
      ORDER BY i.date DESC
    `;
    const list = (rows as any[]).map((r) => ({
      id: r.id,
      description: r.description,
      amount: num(r.amount),
      event: r.event,
      date: r.date,
      fund_name: r.fund_name,
    }));
    return {
      period_id: periodId,
      count: list.length,
      total: list.reduce((s, x) => s + x.amount, 0),
      incomes: list,
    };
  },
};

// ----------------------------------------------------------------------------
// search_expenses
// ----------------------------------------------------------------------------

const searchExpenses: ToolDefinition = {
  name: 'search_expenses',
  description:
    'Búsqueda flexible de gastos con filtros combinables: periodo, categoría, fondo ' +
    'origen, tienda, texto en la descripción, método de pago, rango de fechas, ' +
    'rango de monto, evento, pendientes. Devuelve página de resultados y el total ' +
    'coincidente (total_count, total_amount). Para gastos recientes sin filtros ' +
    'usa list_recent_expenses. Las transferencias entre fondos tienen ' +
    'destination_fund_name.',
  inputSchema: {
    type: 'object',
    properties: {
      period_id: {
        type: 'string',
        description:
          'ID del periodo, o "all" para todos los periodos. Default: activo.',
      },
      category_id: { type: 'string' },
      fund_id: { type: 'string', description: 'Fondo origen del gasto.' },
      event_id: { type: 'number', description: 'ID del evento.' },
      store: { type: 'string', description: 'Texto contenido en la tienda.' },
      text: {
        type: 'string',
        description: 'Texto contenido en la descripción.',
      },
      payment_method: {
        type: 'string',
        description: 'Método de pago exacto (p. ej. cash, credit, debit).',
      },
      date_from: { type: 'string', description: 'YYYY-MM-DD (inclusive).' },
      date_to: { type: 'string', description: 'YYYY-MM-DD (inclusive).' },
      min_amount: { type: 'number' },
      max_amount: { type: 'number' },
      pending: {
        type: 'boolean',
        description:
          'true = solo pendientes, false = solo no pendientes. Default: ambos.',
      },
      limit: { type: 'number', description: 'Default 25, máx 100.' },
      offset: { type: 'number', description: 'Para paginar. Default 0.' },
    },
    additionalProperties: false,
  },
  async handler(input) {
    const rawPeriod = optStr(input.period_id);
    const periodId =
      rawPeriod === 'all'
        ? null
        : rawPeriod || (await getActivePeriod())?.id || null;
    if (rawPeriod !== 'all' && !periodId) {
      return { error: 'No hay periodo activo.' };
    }
    const categoryId = optStr(input.category_id);
    const fundId = optStr(input.fund_id);
    const eventId = optNum(input.event_id);
    const store = like(input.store);
    const text = like(input.text);
    const method = optStr(input.payment_method);
    const dateFrom = optStr(input.date_from);
    const dateTo = optStr(input.date_to);
    const minAmount = optNum(input.min_amount);
    const maxAmount = optNum(input.max_amount);
    const pending = typeof input.pending === 'boolean' ? input.pending : null;
    const limit = clampInt(input.limit, 25, 1, 100);
    const offset = clampInt(input.offset, 0, 0, 1_000_000);

    const rows = await sql`
      SELECT
        e.id, e.amount, e.payment_method, e.date, e.description, e.store_name,
        e.pending, c.name AS category_name, c.tipo_gasto,
        sf.name AS source_fund_name, df.name AS destination_fund_name,
        ev.name AS event_name,
        COUNT(*) OVER() AS total_count,
        COALESCE(SUM(e.amount) OVER(), 0) AS total_amount
      FROM expenses e
      JOIN categories c ON c.id = e.category_id
      LEFT JOIN funds sf ON sf.id = e.source_fund_id
      LEFT JOIN funds df ON df.id = e.destination_fund_id
      LEFT JOIN events ev ON ev.id = e.event_id
      WHERE (${periodId}::text IS NULL OR e.period_id = ${periodId})
        AND (${categoryId}::text IS NULL OR e.category_id = ${categoryId})
        AND (${fundId}::text IS NULL OR e.source_fund_id = ${fundId})
        AND (${eventId}::int IS NULL OR e.event_id = ${eventId})
        AND (${store}::text IS NULL OR e.store_name ILIKE ${store})
        AND (${text}::text IS NULL OR e.description ILIKE ${text})
        AND (${method}::text IS NULL OR e.payment_method = ${method})
        AND (${dateFrom}::date IS NULL OR e.date >= ${dateFrom}::date)
        AND (${dateTo}::date IS NULL OR e.date < ${dateTo}::date + 1)
        AND (${minAmount}::numeric IS NULL OR e.amount >= ${minAmount})
        AND (${maxAmount}::numeric IS NULL OR e.amount <= ${maxAmount})
        AND (${pending}::boolean IS NULL OR COALESCE(e.pending, false) = ${pending})
      ORDER BY e.date DESC, e.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const first = (rows as any[])[0];
    return {
      period_id: periodId,
      total_count: first ? Number(first.total_count) : 0,
      total_amount: first ? num(first.total_amount) : 0,
      offset,
      returned: rows.length,
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
        source_fund_name: r.source_fund_name,
        destination_fund_name: r.destination_fund_name,
        event_name: r.event_name,
      })),
    };
  },
};

// ----------------------------------------------------------------------------
// list_credit_cards
// ----------------------------------------------------------------------------

const listCreditCards: ToolDefinition = {
  name: 'list_credit_cards',
  description:
    'Lista las tarjetas de crédito con banco, franquicia, últimos 4 dígitos, día de ' +
    'corte, si está activa y lo cargado en el periodo (default: activo).',
  inputSchema: {
    type: 'object',
    properties: { period_id: PERIOD_ID_PROP },
    additionalProperties: false,
  },
  async handler(input) {
    const periodId =
      optStr(input.period_id) || (await getActivePeriod())?.id || null;
    const rows = await sql`
      SELECT
        cc.id, cc.bank_name, cc.franchise, cc.last_four_digits, cc.is_active,
        cc.cutoff_day,
        COALESCE(SUM(e.amount), 0) AS period_charges,
        COUNT(e.id) AS period_expense_count
      FROM credit_cards cc
      LEFT JOIN expenses e ON e.credit_card_id = cc.id
        AND e.payment_method = 'credit'
        AND (e.pending IS NULL OR e.pending = false)
        AND (${periodId}::text IS NOT NULL AND e.period_id = ${periodId})
      GROUP BY cc.id
      ORDER BY cc.bank_name, cc.franchise, cc.last_four_digits
    `;
    return {
      period_id: periodId,
      credit_cards: (rows as any[]).map((r) => ({
        id: r.id,
        bank_name: r.bank_name,
        franchise: r.franchise,
        last_four_digits: r.last_four_digits,
        is_active: r.is_active,
        cutoff_day: r.cutoff_day,
        period_charges: num(r.period_charges),
        period_expense_count: Number(r.period_expense_count),
      })),
    };
  },
};

// ----------------------------------------------------------------------------
// get_credit_card_projection
// ----------------------------------------------------------------------------

const getCreditCardProjectionTool: ToolDefinition = {
  name: 'get_credit_card_projection',
  description:
    'Proyección del pago de tarjetas de crédito del mes siguiente al periodo dado ' +
    '(default: activo), por tarjeta: consumos en la ventana de corte más cuotas de ' +
    'deudas activas. Es la misma lógica que usa la app.',
  inputSchema: {
    type: 'object',
    properties: { period_id: PERIOD_ID_PROP },
    additionalProperties: false,
  },
  async handler(input) {
    const periodId = optStr(input.period_id);
    const url = new URL('http://internal/api/credit-cards/projection');
    if (periodId) url.searchParams.set('period_id', periodId);
    const res = await getCreditCardProjection(new NextRequest(url));
    return res.json();
  },
};

// ----------------------------------------------------------------------------
// list_debts
// ----------------------------------------------------------------------------

const listDebts: ToolDefinition = {
  name: 'list_debts',
  description:
    'Lista las deudas activas (seguimiento de deudas): monto original, saldo actual, ' +
    'cuotas pendientes, pago mensual, tasa de interés, seguro, día de pago, tarjeta ' +
    'y categoría asociadas.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  async handler() {
    const rows = await sql`
      SELECT
        d.id, d.name, d.monto_original, d.plazo_original, d.fecha_inicio,
        d.cuotas_pendientes, d.tasa_interes, d.tipo_tasa, d.saldo_actual,
        d.pago_mensual, d.valor_seguro, d.dia_pago,
        cc.bank_name, cc.franchise, cc.last_four_digits,
        cat.name AS category_name
      FROM debt_obligations d
      LEFT JOIN credit_cards cc ON cc.id = d.credit_card_id
      LEFT JOIN categories cat ON cat.id = d.category_id
      WHERE d.is_active = true
      ORDER BY d.created_at ASC
    `;
    const debts = (rows as any[]).map((r) => ({
      id: r.id,
      name: r.name,
      monto_original: num(r.monto_original),
      plazo_original: r.plazo_original,
      fecha_inicio: r.fecha_inicio,
      cuotas_pendientes: r.cuotas_pendientes,
      tasa_interes: num(r.tasa_interes),
      tipo_tasa: r.tipo_tasa,
      saldo_actual: num(r.saldo_actual),
      pago_mensual: num(r.pago_mensual),
      valor_seguro: num(r.valor_seguro),
      dia_pago: r.dia_pago,
      credit_card: r.bank_name
        ? `${r.bank_name} ${r.franchise} ****${r.last_four_digits}`
        : null,
      category_name: r.category_name,
    }));
    return {
      count: debts.length,
      total_balance: debts.reduce((s, d) => s + d.saldo_actual, 0),
      total_monthly_payment: debts.reduce((s, d) => s + d.pago_mensual, 0),
      debts,
    };
  },
};

// ----------------------------------------------------------------------------
// list_groupers
// ----------------------------------------------------------------------------

const listGroupers: ToolDefinition = {
  name: 'list_groupers',
  description:
    'Lista los agrupadores (grupos de categorías) con sus categorías y, para el ' +
    'periodo indicado (default: activo), presupuesto y gasto agregados.',
  inputSchema: {
    type: 'object',
    properties: { period_id: PERIOD_ID_PROP },
    additionalProperties: false,
  },
  async handler(input) {
    const periodId =
      optStr(input.period_id) || (await getActivePeriod())?.id || null;
    const rows = await sql`
      SELECT
        g.id, g.name,
        COALESCE(json_agg(c.name ORDER BY c.name) FILTER (WHERE c.id IS NOT NULL), '[]'::json) AS categories,
        COALESCE(SUM(b.budgeted), 0) AS budgeted,
        COALESCE(SUM(s.spent), 0) AS spent
      FROM groupers g
      LEFT JOIN grouper_categories gc ON gc.grouper_id = g.id
      LEFT JOIN categories c ON c.id = gc.category_id
      LEFT JOIN (
        SELECT category_id, SUM(expected_amount) AS budgeted
        FROM budgets WHERE period_id = ${periodId} GROUP BY category_id
      ) b ON b.category_id = c.id
      LEFT JOIN (
        SELECT category_id, SUM(amount) AS spent
        FROM expenses
        WHERE period_id = ${periodId} AND (pending IS NULL OR pending = false)
        GROUP BY category_id
      ) s ON s.category_id = c.id
      GROUP BY g.id, g.name
      ORDER BY g.name
    `;
    return {
      period_id: periodId,
      groupers: (rows as any[]).map((r) => ({
        id: r.id,
        name: r.name,
        categories: r.categories,
        budgeted: num(r.budgeted),
        spent: num(r.spent),
        remaining: num(r.budgeted) - num(r.spent),
      })),
    };
  },
};

// ----------------------------------------------------------------------------
// list_events
// ----------------------------------------------------------------------------

const listEvents: ToolDefinition = {
  name: 'list_events',
  description:
    'Lista los eventos (viajes, celebraciones, etc.) con su cantidad de gastos y ' +
    'monto total. Usa el id como event_id en search_expenses.',
  inputSchema: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Texto contenido en el nombre.' },
      limit: { type: 'number', description: 'Default 20, máx 100.' },
    },
    additionalProperties: false,
  },
  async handler(input) {
    const search = like(input.search);
    const limit = clampInt(input.limit, 20, 1, 100);
    const rows = await sql`
      SELECT
        ev.id, ev.name, ev.description, ev.start_date, ev.end_date,
        COUNT(e.id)::int AS expense_count,
        COALESCE(SUM(e.amount), 0) AS total_amount
      FROM events ev
      LEFT JOIN expenses e ON e.event_id = ev.id
      WHERE (${search}::text IS NULL OR ev.name ILIKE ${search})
      GROUP BY ev.id
      ORDER BY ev.name ASC
      LIMIT ${limit}
    `;
    return {
      count: rows.length,
      events: (rows as any[]).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        start_date: r.start_date,
        end_date: r.end_date,
        expense_count: r.expense_count,
        total_amount: num(r.total_amount),
      })),
    };
  },
};

// ----------------------------------------------------------------------------
// get_expense_details
// ----------------------------------------------------------------------------

const getExpenseDetails: ToolDefinition = {
  name: 'get_expense_details',
  description:
    'Devuelve el desglose por ítems (producto, monto, cantidad, unidad, subgrupo) ' +
    'de un gasto específico. Requiere expense_id (ver search_expenses).',
  inputSchema: {
    type: 'object',
    properties: { expense_id: { type: 'string' } },
    required: ['expense_id'],
    additionalProperties: false,
  },
  async handler(input) {
    const expenseId = optStr(input.expense_id);
    if (!expenseId) return { error: 'expense_id es requerido.' };
    const rows = await sql`
      SELECT
        ed.amount, ed.quantity, ed.unit,
        ci.name AS item_name, cs.name AS subgroup_name
      FROM expense_details ed
      JOIN category_items ci ON ci.id = ed.item_id
      JOIN category_subgroups cs ON cs.id = ci.subgroup_id
      WHERE ed.expense_id = ${expenseId}
      ORDER BY cs.display_order, ci.display_order
    `;
    const items = (rows as any[]).map((r) => ({
      item_name: r.item_name,
      subgroup_name: r.subgroup_name,
      amount: num(r.amount),
      quantity: r.quantity === null ? null : num(r.quantity),
      unit: r.unit,
    }));
    return {
      expense_id: expenseId,
      count: items.length,
      total: items.reduce((s, i) => s + i.amount, 0),
      items,
    };
  },
};

// ----------------------------------------------------------------------------
// search_item_purchases
// ----------------------------------------------------------------------------

const searchItemPurchases: ToolDefinition = {
  name: 'search_item_purchases',
  description:
    'Busca compras de un producto/ítem por nombre (p. ej. "leche") en el desglose ' +
    'de gastos, en todos los periodos o en uno. Devuelve cada compra (fecha, tienda, ' +
    'monto, cantidad, unidad) y totales. Útil para comparar precios y frecuencia.',
  inputSchema: {
    type: 'object',
    properties: {
      item: { type: 'string', description: 'Texto contenido en el nombre.' },
      period_id: {
        type: 'string',
        description: 'ID del periodo. Default: todos los periodos.',
      },
      limit: { type: 'number', description: 'Default 50, máx 200.' },
    },
    required: ['item'],
    additionalProperties: false,
  },
  async handler(input) {
    const item = like(input.item);
    if (!item) return { error: 'item es requerido.' };
    const periodId = optStr(input.period_id);
    const limit = clampInt(input.limit, 50, 1, 200);
    const rows = await sql`
      SELECT
        e.date, e.store_name, ed.amount, ed.quantity, ed.unit,
        ci.name AS item_name, c.name AS category_name,
        COUNT(*) OVER() AS total_count,
        SUM(ed.amount) OVER() AS total_amount
      FROM expense_details ed
      JOIN category_items ci ON ci.id = ed.item_id
      JOIN expenses e ON e.id = ed.expense_id
      JOIN categories c ON c.id = e.category_id
      WHERE ci.name ILIKE ${item}
        AND (${periodId}::text IS NULL OR e.period_id = ${periodId})
      ORDER BY e.date DESC
      LIMIT ${limit}
    `;
    const first = (rows as any[])[0];
    return {
      total_count: first ? Number(first.total_count) : 0,
      total_amount: first ? num(first.total_amount) : 0,
      purchases: (rows as any[]).map((r) => ({
        date: r.date,
        store_name: r.store_name,
        item_name: r.item_name,
        category_name: r.category_name,
        amount: num(r.amount),
        quantity: r.quantity === null ? null : num(r.quantity),
        unit: r.unit,
      })),
    };
  },
};

export const CATALOG_TOOLS: ToolDefinition[] = [
  listPeriods,
  listCategories,
  listIncomes,
  searchExpenses,
  listCreditCards,
  getCreditCardProjectionTool,
  listDebts,
  listGroupers,
  listEvents,
  getExpenseDetails,
  searchItemPurchases,
];
