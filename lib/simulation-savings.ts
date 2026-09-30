/**
 * Pure helpers for proposing and validating changes to the savings columns
 * (`ahorro_efectivo_amount` / `ahorro_credito_amount`) of a simulation.
 *
 * Shared by the assistant's `propose_savings_changes` tool and by the
 * `apply-savings` endpoint so that both enforce the same rules.
 */

export interface SimulationBudgetRow {
  category_id: string;
  category_name: string;
  efectivo_amount: number;
  credito_amount: number;
  ahorro_efectivo_amount: number;
  ahorro_credito_amount: number;
}

export interface SavingsChangeInput {
  category_id: string;
  ahorro_efectivo_amount?: number;
  ahorro_credito_amount?: number;
}

export interface SavingsValues {
  ahorro_efectivo_amount: number;
  ahorro_credito_amount: number;
}

export interface SavingsChange {
  category_id: string;
  category_name: string;
  efectivo_amount: number;
  credito_amount: number;
  before: SavingsValues;
  after: SavingsValues;
}

export interface SavingsTotals {
  ahorro_efectivo: number;
  ahorro_credito: number;
  total_ahorro: number;
}

export interface SavingsProposal {
  changes: SavingsChange[];
  errors: string[];
  totals_before: SavingsTotals;
  totals_after: SavingsTotals;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toNumber(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeBudgetRow(
  row: Record<string, unknown>
): SimulationBudgetRow {
  return {
    category_id: String(row.category_id),
    category_name: String(row.category_name ?? ''),
    efectivo_amount: toNumber(row.efectivo_amount),
    credito_amount: toNumber(row.credito_amount),
    ahorro_efectivo_amount: toNumber(row.ahorro_efectivo_amount),
    ahorro_credito_amount: toNumber(row.ahorro_credito_amount),
  };
}

export function sumSavings(rows: SimulationBudgetRow[]): SavingsTotals {
  const ahorro_efectivo = round2(
    rows.reduce((s, r) => s + r.ahorro_efectivo_amount, 0)
  );
  const ahorro_credito = round2(
    rows.reduce((s, r) => s + r.ahorro_credito_amount, 0)
  );
  return {
    ahorro_efectivo,
    ahorro_credito,
    total_ahorro: round2(ahorro_efectivo + ahorro_credito),
  };
}

/**
 * Validates `changes` against the current budget rows and computes the
 * before → after diff. Never throws: invalid entries are reported in `errors`
 * and excluded from `changes`. Entries that would not change anything are
 * dropped too.
 */
export function buildSavingsProposal(
  rows: SimulationBudgetRow[],
  changes: SavingsChangeInput[]
): SavingsProposal {
  const byCategory = new Map(rows.map((r) => [r.category_id, r]));
  const after = new Map(rows.map((r) => [r.category_id, { ...r }]));
  const valid: SavingsChange[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const change of changes) {
    const categoryId = String(change.category_id);
    const row = byCategory.get(categoryId);
    if (!row) {
      errors.push(
        `La categoría ${change.category_id} no está configurada en esta simulación.`
      );
      continue;
    }
    if (seen.has(categoryId)) {
      errors.push(`La categoría "${row.category_name}" está repetida.`);
      continue;
    }
    seen.add(categoryId);

    const nextEfectivo =
      change.ahorro_efectivo_amount === undefined
        ? row.ahorro_efectivo_amount
        : round2(toNumber(change.ahorro_efectivo_amount));
    const nextCredito =
      change.ahorro_credito_amount === undefined
        ? row.ahorro_credito_amount
        : round2(toNumber(change.ahorro_credito_amount));

    if (nextEfectivo < 0 || nextCredito < 0) {
      errors.push(`"${row.category_name}": el ahorro no puede ser negativo.`);
      continue;
    }
    if (nextEfectivo > row.efectivo_amount) {
      errors.push(
        `"${row.category_name}": el ahorro efectivo (${nextEfectivo}) excede el monto efectivo (${row.efectivo_amount}).`
      );
      continue;
    }
    if (nextCredito > row.credito_amount) {
      errors.push(
        `"${row.category_name}": el ahorro crédito (${nextCredito}) excede el monto crédito (${row.credito_amount}).`
      );
      continue;
    }
    if (
      nextEfectivo === row.ahorro_efectivo_amount &&
      nextCredito === row.ahorro_credito_amount
    ) {
      continue;
    }

    const target = after.get(categoryId)!;
    target.ahorro_efectivo_amount = nextEfectivo;
    target.ahorro_credito_amount = nextCredito;
    valid.push({
      category_id: categoryId,
      category_name: row.category_name,
      efectivo_amount: row.efectivo_amount,
      credito_amount: row.credito_amount,
      before: {
        ahorro_efectivo_amount: row.ahorro_efectivo_amount,
        ahorro_credito_amount: row.ahorro_credito_amount,
      },
      after: {
        ahorro_efectivo_amount: nextEfectivo,
        ahorro_credito_amount: nextCredito,
      },
    });
  }

  return {
    changes: valid,
    errors,
    totals_before: sumSavings(rows),
    totals_after: sumSavings([...after.values()]),
  };
}
