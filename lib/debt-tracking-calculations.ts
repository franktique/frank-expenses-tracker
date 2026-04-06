/**
 * Debt Tracking Calculation Utilities
 *
 * Functions for generating amortization projections from the current state
 * of a debt (saldo_actual + cuotas_pendientes), supporting both EA and EM
 * interest rates and two extra-payment reduction modes.
 *
 * Reuses convertEAtoMonthlyRate and roundCurrency from loan-calculations.ts.
 */

import { convertEAtoMonthlyRate, roundCurrency } from '@/lib/loan-calculations';
import type {
  DebtObligation,
  DebtProjectionRow,
  DebtProjectionResponse,
  ReductionMode,
} from '@/types/debt-tracking';

// ============================================================================
// Rate Conversion
// ============================================================================

/**
 * Convert interest rate to monthly rate based on tipo_tasa.
 *
 * @param rate - Interest rate as percentage (e.g. 24.5 for 24.5%)
 * @param tipo_tasa - 'EA' (Effective Annual) or 'EM' (Effective Monthly)
 * @returns Monthly rate as decimal
 */
export function convertRateToMonthly(
  rate: number,
  tipo_tasa: 'EA' | 'EM'
): number {
  if (tipo_tasa === 'EM') {
    return rate / 100;
  }
  return convertEAtoMonthlyRate(rate);
}

// ============================================================================
// PMT Helper
// ============================================================================

/**
 * Calculate the fixed periodic payment (PMT) for a loan.
 * This is the theoretical capital+interest payment, excluding insurance.
 *
 * @param balance - Current balance
 * @param monthlyRate - Monthly interest rate as decimal
 * @param periods - Number of remaining periods
 * @returns Fixed periodic payment amount
 */
function calcPMT(balance: number, monthlyRate: number, periods: number): number {
  if (periods <= 0 || balance <= 0) return 0;
  if (monthlyRate === 0) return roundCurrency(balance / periods);
  const num = monthlyRate * Math.pow(1 + monthlyRate, periods);
  const den = Math.pow(1 + monthlyRate, periods) - 1;
  return roundCurrency(balance * (num / den));
}

// ============================================================================
// Monthly Breakdown
// ============================================================================

/**
 * Calculate the capital, interest, and insurance breakdown for the current
 * period's payment, based on PMT formula (not pago_mensual directly).
 *
 * @param debt - The debt obligation
 * @returns { capital, intereses, seguro, total }
 */
export function calculateDebtMonthlyBreakdown(debt: DebtObligation): {
  capital: number;
  intereses: number;
  seguro: number;
  total: number;
} {
  if (debt.saldo_actual <= 0 || debt.cuotas_pendientes <= 0) {
    return { capital: 0, intereses: 0, seguro: 0, total: 0 };
  }

  const monthlyRate = convertRateToMonthly(debt.tasa_interes, debt.tipo_tasa);
  const pmt = calcPMT(debt.saldo_actual, monthlyRate, debt.cuotas_pendientes);
  const intereses = roundCurrency(debt.saldo_actual * monthlyRate);
  const capital = roundCurrency(Math.max(0, pmt - intereses));

  // Insurance: the residual between the actual payment and the theoretical PMT,
  // capped at the entered valor_seguro.
  const residual = roundCurrency(Math.max(0, debt.pago_mensual - pmt));
  const seguro = roundCurrency(Math.min(residual, debt.valor_seguro ?? 0));

  return {
    capital,
    intereses,
    seguro,
    total: roundCurrency(capital + intereses + seguro),
  };
}

// ============================================================================
// Apply One Payment
// ============================================================================

/**
 * Apply one amortization period to a debt, returning the updated saldo and cuotas.
 * Uses PMT-based capital calculation so the balance declines correctly.
 *
 * @param debt - Current debt state
 * @returns Updated { saldo_actual, cuotas_pendientes }
 */
export function applyOnePayment(debt: DebtObligation): {
  saldo_actual: number;
  cuotas_pendientes: number;
} {
  if (debt.saldo_actual <= 0 || debt.cuotas_pendientes <= 0) {
    return {
      saldo_actual: debt.saldo_actual,
      cuotas_pendientes: debt.cuotas_pendientes,
    };
  }

  const monthlyRate = convertRateToMonthly(debt.tasa_interes, debt.tipo_tasa);
  const pmt = calcPMT(debt.saldo_actual, monthlyRate, debt.cuotas_pendientes);
  const intereses = roundCurrency(debt.saldo_actual * monthlyRate);
  const capitalPaid = roundCurrency(Math.max(0, pmt - intereses));
  const newSaldo = roundCurrency(Math.max(0, debt.saldo_actual - capitalPaid));
  const newCuotas = Math.max(0, debt.cuotas_pendientes - 1);

  return {
    saldo_actual: newSaldo,
    cuotas_pendientes: newCuotas,
  };
}

// ============================================================================
// Projection Generation
// ============================================================================

/**
 * Generate the next payment date based on dia_pago and a reference date.
 */
function getNextPaymentDate(
  referenceDate: Date,
  diaPago: number | null,
  paymentNumber: number
): string {
  const d = new Date(referenceDate);
  d.setMonth(d.getMonth() + paymentNumber);

  if (diaPago !== null) {
    const year = d.getFullYear();
    const month = d.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    d.setDate(Math.min(diaPago, lastDay));
  }

  return d.toISOString().split('T')[0];
}

/**
 * Build the reference start date from the debt's dia_pago and today's date.
 */
function buildStartDate(debt: DebtObligation): Date {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  if (debt.dia_pago !== null) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const day = Math.min(debt.dia_pago, lastDay);
    if (today.getDate() > day) {
      return new Date(year, month + 1, day);
    }
    return new Date(year, month, day);
  }

  return new Date(year, month, 1);
}

/**
 * Generate amortization projection from the current state of a debt.
 *
 * The base installment (capital + interest) is calculated via PMT formula using
 * saldo_actual, tasa_interes, and cuotas_pendientes. The insurance component is
 * derived as: min(pago_mensual - PMT, valor_seguro) and remains fixed.
 *
 * Supports two reduction modes when extra payments are provided:
 * - 'reducir_cuota': Extra payments reduce the installment amount (same periods)
 * - 'reducir_plazo': Extra payments reduce the number of remaining periods
 *
 * @param debt - Current debt state
 * @param extraPayments - Map of paymentNumber (1-based) to extra amount
 * @param reductionMode - How extra payments affect the schedule
 * @returns Projection response with rows and summary
 */
export function generateDebtProjection(
  debt: DebtObligation,
  extraPayments: Record<number, number> = {},
  reductionMode: ReductionMode = 'reducir_plazo'
): DebtProjectionResponse {
  if (debt.saldo_actual <= 0 || debt.cuotas_pendientes <= 0) {
    return {
      rows: [],
      summary: {
        totalPayments: 0,
        totalPrincipal: 0,
        totalInterest: 0,
        totalInsurance: 0,
        totalExtraPayments: 0,
        payoffDate: new Date().toISOString().split('T')[0],
        monthlyPayment: debt.pago_mensual,
        baseMonthlyPayment: 0,
        insurancePerMonth: 0,
      },
    };
  }

  const monthlyRate = convertRateToMonthly(debt.tasa_interes, debt.tipo_tasa);
  const startDate = buildStartDate(debt);

  // Calculate the theoretical PMT (capital + interest only, no insurance)
  const initialPMT = calcPMT(debt.saldo_actual, monthlyRate, debt.cuotas_pendientes);

  // Derive effective insurance: residual between actual payment and theoretical PMT,
  // capped at the entered valor_seguro.
  const residual = Math.max(0, debt.pago_mensual - initialPMT);
  const insurancePerMonth = roundCurrency(
    Math.min(residual, debt.valor_seguro ?? 0)
  );

  const rows: DebtProjectionRow[] = [];
  let remainingBalance = debt.saldo_actual;
  let remainingCuotas = debt.cuotas_pendientes;
  let currentPMT = initialPMT;

  let totalPrincipal = 0;
  let totalInterest = 0;
  let totalInsurance = 0;
  let totalExtraPayments = 0;
  let paymentNumber = 1;

  // Safety bound: never exceed original cuotas + extras + a small buffer
  const maxPayments = remainingCuotas + Object.keys(extraPayments).length + 2;

  while (remainingBalance > 0.01 && paymentNumber <= maxPayments) {
    const extra = extraPayments[paymentNumber] ?? 0;
    const interestPortion = roundCurrency(remainingBalance * monthlyRate);

    if (reductionMode === 'reducir_cuota' && extra > 0) {
      // Apply extra to principal this period, then recalculate PMT for remaining periods.
      const normalCapital = roundCurrency(Math.max(0, currentPMT - interestPortion));
      let principalPortion = roundCurrency(normalCapital + extra);

      if (principalPortion > remainingBalance) {
        principalPortion = remainingBalance;
      }

      remainingBalance = roundCurrency(remainingBalance - principalPortion);
      if (remainingBalance < 0.01) remainingBalance = 0;

      const paymentAmount = roundCurrency(interestPortion + principalPortion + insurancePerMonth);
      const date = getNextPaymentDate(startDate, debt.dia_pago, paymentNumber - 1);

      rows.push({
        paymentNumber,
        date,
        paymentAmount,
        principalPortion: roundCurrency(normalCapital),
        interestPortion,
        insurancePortion: insurancePerMonth,
        remainingBalance,
        extraPayment: extra > 0 ? extra : undefined,
      });

      totalPrincipal += normalCapital;
      totalInterest += interestPortion;
      totalInsurance += insurancePerMonth;
      totalExtraPayments += extra;

      // Recalculate PMT for remaining periods
      const periodsLeft = remainingCuotas - paymentNumber;
      if (periodsLeft > 0 && remainingBalance > 0) {
        currentPMT = calcPMT(remainingBalance, monthlyRate, periodsLeft);
      }
    } else {
      // reducir_plazo (default): fixed PMT, extra principal shortens the term.
      let principalPortion = roundCurrency(Math.max(0, currentPMT - interestPortion));

      if (extra > 0) {
        principalPortion = roundCurrency(principalPortion + extra);
      }

      if (principalPortion > remainingBalance) {
        principalPortion = remainingBalance;
      }

      remainingBalance = roundCurrency(remainingBalance - principalPortion);
      if (remainingBalance < 0.01) remainingBalance = 0;

      const normalCapital = principalPortion - extra;
      const paymentAmount = roundCurrency(
        interestPortion + principalPortion + insurancePerMonth
      );
      const date = getNextPaymentDate(startDate, debt.dia_pago, paymentNumber - 1);

      rows.push({
        paymentNumber,
        date,
        paymentAmount,
        principalPortion: roundCurrency(Math.max(0, normalCapital)),
        interestPortion,
        insurancePortion: insurancePerMonth,
        remainingBalance,
        extraPayment: extra > 0 ? extra : undefined,
      });

      totalPrincipal += Math.max(0, normalCapital);
      totalInterest += interestPortion;
      totalInsurance += insurancePerMonth;
      totalExtraPayments += extra;
    }

    if (remainingBalance === 0) break;
    paymentNumber++;
  }

  const lastRow = rows[rows.length - 1];
  const payoffDate = lastRow?.date ?? new Date().toISOString().split('T')[0];

  return {
    rows,
    summary: {
      totalPayments: rows.length,
      totalPrincipal: roundCurrency(totalPrincipal),
      totalInterest: roundCurrency(totalInterest),
      totalInsurance: roundCurrency(totalInsurance),
      totalExtraPayments: roundCurrency(totalExtraPayments),
      payoffDate,
      monthlyPayment: debt.pago_mensual,
      baseMonthlyPayment: initialPMT,
      insurancePerMonth,
    },
  };
}

// ============================================================================
// Credit Card Group Totals
// ============================================================================

/**
 * Calculate consolidated monthly totals for a group of credit card debts.
 */
export function calculateCreditCardGroupTotals(debts: DebtObligation[]): {
  saldo_total: number;
  capital_mensual: number;
  intereses_mensual: number;
  seguro_mensual: number;
  pago_mensual_total: number;
} {
  let saldo_total = 0;
  let capital_mensual = 0;
  let intereses_mensual = 0;
  let seguro_mensual = 0;
  let pago_mensual_total = 0;

  for (const debt of debts) {
    const breakdown = calculateDebtMonthlyBreakdown(debt);
    saldo_total += debt.saldo_actual;
    capital_mensual += breakdown.capital;
    intereses_mensual += breakdown.intereses;
    seguro_mensual += breakdown.seguro;
    pago_mensual_total += debt.pago_mensual;
  }

  return {
    saldo_total: roundCurrency(saldo_total),
    capital_mensual: roundCurrency(capital_mensual),
    intereses_mensual: roundCurrency(intereses_mensual),
    seguro_mensual: roundCurrency(seguro_mensual),
    pago_mensual_total: roundCurrency(pago_mensual_total),
  };
}

/**
 * Generate a consolidated monthly projection for all debts of a credit card.
 */
export function generateConsolidatedCardProjection(
  debts: DebtObligation[]
): Array<{
  month: string;
  totalPayment: number;
  totalPrincipal: number;
  totalInterest: number;
  totalInsurance: number;
  debtBreakdown: Array<{
    name: string;
    payment: number;
    principal: number;
    interest: number;
    insurance: number;
  }>;
}> {
  const monthMap: Map<
    string,
    {
      totalPayment: number;
      totalPrincipal: number;
      totalInterest: number;
      totalInsurance: number;
      debtBreakdown: Array<{
        name: string;
        payment: number;
        principal: number;
        interest: number;
        insurance: number;
      }>;
    }
  > = new Map();

  for (const debt of debts) {
    const projection = generateDebtProjection(debt);
    for (const row of projection.rows) {
      const monthKey = row.date.substring(0, 7);
      const existing = monthMap.get(monthKey) ?? {
        totalPayment: 0,
        totalPrincipal: 0,
        totalInterest: 0,
        totalInsurance: 0,
        debtBreakdown: [],
      };
      existing.totalPayment = roundCurrency(existing.totalPayment + row.paymentAmount);
      existing.totalPrincipal = roundCurrency(existing.totalPrincipal + row.principalPortion);
      existing.totalInterest = roundCurrency(existing.totalInterest + row.interestPortion);
      existing.totalInsurance = roundCurrency(existing.totalInsurance + row.insurancePortion);
      existing.debtBreakdown.push({
        name: debt.name,
        payment: row.paymentAmount,
        principal: row.principalPortion,
        interest: row.interestPortion,
        insurance: row.insurancePortion,
      });
      monthMap.set(monthKey, existing);
    }
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));
}
