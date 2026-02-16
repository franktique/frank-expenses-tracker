/**
 * Investment Calculations Library
 *
 * Provides financial calculation functions for investment projections
 * with compound interest and periodic contributions.
 */

import type {
  InvestmentScenario,
  InvestmentSummary,
  InvestmentPeriodDetail,
  RateComparisonResult,
  CompoundingFrequency,
} from '@/types/invest-simulator';
import { COMPOUNDING_FREQUENCIES } from '@/types/invest-simulator';

// ============================================================================
// Rate Conversion Functions
// ============================================================================

/**
 * Convert annual effective rate (EA) to periodic rate
 *
 * Formula: periodic_rate = (1 + EA)^(1/periods_per_year) - 1
 *
 * @param annualRate - Annual effective rate as percentage (e.g., 8.25 for 8.25%)
 * @param frequency - Compounding frequency ('daily' or 'monthly')
 * @returns Periodic rate as decimal
 */
export function convertEAToPeriodicRate(
  annualRate: number,
  frequency: CompoundingFrequency
): number {
  const periodsPerYear = COMPOUNDING_FREQUENCIES[frequency].periodsPerYear;
  const annualRateDecimal = annualRate / 100;
  return Math.pow(1 + annualRateDecimal, 1 / periodsPerYear) - 1;
}

/**
 * Convert annual effective rate (EA) to monthly rate
 *
 * @param annualRate - Annual effective rate as percentage
 * @returns Monthly rate as decimal
 */
export function convertEAToMonthlyRate(annualRate: number): number {
  return convertEAToPeriodicRate(annualRate, 'monthly');
}

/**
 * Convert annual effective rate (EA) to daily rate
 *
 * @param annualRate - Annual effective rate as percentage
 * @returns Daily rate as decimal
 */
export function convertEAToDailyRate(annualRate: number): number {
  return convertEAToPeriodicRate(annualRate, 'daily');
}

// ============================================================================
// Compound Interest Calculation Functions
// ============================================================================

/**
 * Calculate future value with compound interest and regular contributions
 *
 * For a single principal: FV = P * (1 + r)^n
 * For regular contributions: FV_contrib = PMT * [((1 + r)^n - 1) / r]
 * Total: FV = P * (1 + r)^n + PMT * [((1 + r)^n - 1) / r]
 *
 * @param principal - Initial investment amount
 * @param periodicRate - Interest rate per period (as decimal)
 * @param periods - Number of compounding periods
 * @param periodicContribution - Contribution per period (default 0)
 * @returns Future value
 */
export function calculateFutureValue(
  principal: number,
  periodicRate: number,
  periods: number,
  periodicContribution: number = 0
): number {
  // Handle zero rate case
  if (periodicRate === 0) {
    return principal + periodicContribution * periods;
  }

  // Future value of principal
  const fvPrincipal = principal * Math.pow(1 + periodicRate, periods);

  // Future value of contributions (annuity due - contributions at beginning of period)
  // For contributions at beginning of each period: PMT * ((1+r)^n - 1) / r * (1+r)
  // For contributions at end of period (ordinary annuity): PMT * ((1+r)^n - 1) / r
  // We use ordinary annuity (contribution at end of period)
  const fvContributions =
    periodicContribution *
    ((Math.pow(1 + periodicRate, periods) - 1) / periodicRate);

  return fvPrincipal + fvContributions;
}

/**
 * Calculate total interest earned
 *
 * @param finalBalance - Final investment value
 * @param totalContributions - Total of initial + periodic contributions
 * @returns Total interest earned
 */
export function calculateTotalInterest(
  finalBalance: number,
  totalContributions: number
): number {
  return finalBalance - totalContributions;
}

// ============================================================================
// Projection Schedule Generation
// ============================================================================

/**
 * Generate detailed projection schedule for an investment scenario
 *
 * @param scenario - Investment scenario configuration
 * @returns Array of period details
 */
export function generateProjectionSchedule(
  scenario: Pick<
    InvestmentScenario,
    | 'initialAmount'
    | 'monthlyContribution'
    | 'termMonths'
    | 'annualRate'
    | 'compoundingFrequency'
  >
): InvestmentPeriodDetail[] {
  const {
    initialAmount,
    monthlyContribution,
    termMonths,
    annualRate,
    compoundingFrequency,
  } = scenario;

  const schedule: InvestmentPeriodDetail[] = [];

  if (compoundingFrequency === 'monthly') {
    // Monthly compounding - one entry per month
    const monthlyRate = convertEAToMonthlyRate(annualRate);
    let balance = initialAmount;
    let cumulativeContributions = initialAmount;
    let cumulativeInterest = 0;

    for (let month = 1; month <= termMonths; month++) {
      const openingBalance = balance;

      // Interest calculated on opening balance
      const interestEarned = openingBalance * monthlyRate;

      // Monthly contribution added after interest
      const contribution = monthlyContribution;

      // Closing balance
      const closingBalance = openingBalance + interestEarned + contribution;

      // Update cumulative totals
      cumulativeContributions += contribution;
      cumulativeInterest += interestEarned;

      // Calculate date (from today)
      const date = new Date();
      date.setMonth(date.getMonth() + month);

      schedule.push({
        periodNumber: month,
        date: date.toISOString().split('T')[0],
        openingBalance: roundToTwo(openingBalance),
        contribution: roundToTwo(contribution),
        interestEarned: roundToTwo(interestEarned),
        closingBalance: roundToTwo(closingBalance),
        cumulativeContributions: roundToTwo(cumulativeContributions),
        cumulativeInterest: roundToTwo(cumulativeInterest),
      });

      balance = closingBalance;
    }
  } else {
    // Daily compounding - one entry per day
    const dailyRate = convertEAToDailyRate(annualRate);
    const totalDays = termMonths * 30; // Approximate 30 days per month
    let balance = initialAmount;
    let cumulativeContributions = initialAmount;
    let cumulativeInterest = 0;
    let lastContributionMonth = 0;

    for (let day = 1; day <= totalDays; day++) {
      const openingBalance = balance;

      // Interest calculated on opening balance (daily)
      const interestEarned = openingBalance * dailyRate;

      // Monthly contribution added on first day of each month
      const currentMonth = Math.ceil(day / 30);
      const contribution =
        currentMonth > lastContributionMonth ? monthlyContribution : 0;
      if (contribution > 0) {
        lastContributionMonth = currentMonth;
      }

      // Closing balance
      const closingBalance = openingBalance + interestEarned + contribution;

      // Update cumulative totals
      cumulativeContributions += contribution;
      cumulativeInterest += interestEarned;

      // Calculate date (from today)
      const date = new Date();
      date.setDate(date.getDate() + day);

      schedule.push({
        periodNumber: day,
        date: date.toISOString().split('T')[0],
        openingBalance: roundToTwo(openingBalance),
        contribution: roundToTwo(contribution),
        interestEarned: roundToTwo(interestEarned),
        closingBalance: roundToTwo(closingBalance),
        cumulativeContributions: roundToTwo(cumulativeContributions),
        cumulativeInterest: roundToTwo(cumulativeInterest),
      });

      balance = closingBalance;
    }
  }

  return schedule;
}

/**
 * Generate summary-only projection schedule (monthly summary even for daily compounding)
 * Useful for charts and high-level views
 *
 * @param scenario - Investment scenario configuration
 * @returns Array of monthly period details
 */
export function generateMonthlySummarySchedule(
  scenario: Pick<
    InvestmentScenario,
    | 'initialAmount'
    | 'monthlyContribution'
    | 'termMonths'
    | 'annualRate'
    | 'compoundingFrequency'
  >
): InvestmentPeriodDetail[] {
  const {
    initialAmount,
    monthlyContribution,
    termMonths,
    annualRate,
    compoundingFrequency,
  } = scenario;

  const schedule: InvestmentPeriodDetail[] = [];

  if (compoundingFrequency === 'monthly') {
    // For monthly compounding, just use the regular schedule
    return generateProjectionSchedule(scenario);
  }

  // For daily compounding, calculate monthly summaries
  const dailyRate = convertEAToDailyRate(annualRate);
  let balance = initialAmount;
  let cumulativeContributions = initialAmount;
  let cumulativeInterest = 0;

  for (let month = 1; month <= termMonths; month++) {
    const openingBalance = balance;
    let monthlyInterest = 0;

    // Simulate 30 days within the month
    for (let day = 1; day <= 30; day++) {
      monthlyInterest += balance * dailyRate;
      balance = balance * (1 + dailyRate);

      // Add contribution on first day of month
      if (day === 1 && month > 0) {
        balance += monthlyContribution;
      }
    }

    // Update cumulative totals
    cumulativeContributions += monthlyContribution;
    cumulativeInterest += monthlyInterest;

    // Calculate date (from today)
    const date = new Date();
    date.setMonth(date.getMonth() + month);

    schedule.push({
      periodNumber: month,
      date: date.toISOString().split('T')[0],
      openingBalance: roundToTwo(openingBalance),
      contribution: roundToTwo(monthlyContribution),
      interestEarned: roundToTwo(monthlyInterest),
      closingBalance: roundToTwo(balance),
      cumulativeContributions: roundToTwo(cumulativeContributions),
      cumulativeInterest: roundToTwo(cumulativeInterest),
    });
  }

  return schedule;
}

// ============================================================================
// Investment Summary Calculation
// ============================================================================

/**
 * Calculate investment summary for a scenario
 *
 * @param scenario - Investment scenario configuration
 * @returns Investment summary with all totals
 */
export function calculateInvestmentSummary(
  scenario: Pick<
    InvestmentScenario,
    | 'initialAmount'
    | 'monthlyContribution'
    | 'termMonths'
    | 'annualRate'
    | 'compoundingFrequency'
  >
): InvestmentSummary {
  const {
    initialAmount,
    monthlyContribution,
    termMonths,
    annualRate,
    compoundingFrequency,
  } = scenario;

  let finalBalance: number;
  const totalMonthlyContributions = monthlyContribution * termMonths;
  const totalContributions = initialAmount + totalMonthlyContributions;

  if (compoundingFrequency === 'monthly') {
    // Monthly compounding calculation
    const monthlyRate = convertEAToMonthlyRate(annualRate);
    finalBalance = calculateFutureValue(
      initialAmount,
      monthlyRate,
      termMonths,
      monthlyContribution
    );
  } else {
    // Daily compounding - more complex calculation
    // We need to account for daily compounding with monthly contributions
    const dailyRate = convertEAToDailyRate(annualRate);
    const daysPerMonth = 30;
    const totalDays = termMonths * daysPerMonth;

    // Calculate future value of initial amount with daily compounding
    let balance = initialAmount * Math.pow(1 + dailyRate, totalDays);

    // Add future value of each monthly contribution
    for (let month = 1; month <= termMonths; month++) {
      const daysRemaining = (termMonths - month) * daysPerMonth + daysPerMonth;
      balance += monthlyContribution * Math.pow(1 + dailyRate, daysRemaining);
    }

    finalBalance = balance;
  }

  const totalInterestEarned = finalBalance - totalContributions;

  return {
    finalBalance: roundToTwo(finalBalance),
    totalContributions: roundToTwo(totalContributions),
    totalInterestEarned: roundToTwo(totalInterestEarned),
    initialAmount: roundToTwo(initialAmount),
    totalMonthlyContributions: roundToTwo(totalMonthlyContributions),
    annualRate,
    effectiveMonthlyRate: roundToSix(convertEAToMonthlyRate(annualRate) * 100),
    effectiveDailyRate: roundToSix(convertEAToDailyRate(annualRate) * 100),
    termMonths,
    compoundingFrequency,
  };
}

// ============================================================================
// Rate Comparison Functions
// ============================================================================

/**
 * Compare investment results across multiple rates
 *
 * @param scenario - Base investment scenario
 * @param additionalRates - Array of additional rates to compare (with optional labels)
 * @returns Array of comparison results sorted by rate
 */
export function compareRates(
  scenario: Pick<
    InvestmentScenario,
    | 'initialAmount'
    | 'monthlyContribution'
    | 'termMonths'
    | 'annualRate'
    | 'compoundingFrequency'
  >,
  additionalRates: Array<{ rate: number; label?: string }>
): RateComparisonResult[] {
  const {
    initialAmount,
    monthlyContribution,
    termMonths,
    compoundingFrequency,
    annualRate,
  } = scenario;

  // Calculate base scenario results
  const baseSummary = calculateInvestmentSummary(scenario);

  // Build results array starting with base rate
  const results: RateComparisonResult[] = [
    {
      rate: annualRate,
      label: 'Tasa Base',
      finalBalance: baseSummary.finalBalance,
      totalInterestEarned: baseSummary.totalInterestEarned,
      differenceFromBase: 0,
      isBaseRate: true,
    },
  ];

  // Calculate for each additional rate
  for (const { rate, label } of additionalRates) {
    // Skip if same as base rate
    if (rate === annualRate) continue;

    const comparison = calculateInvestmentSummary({
      initialAmount,
      monthlyContribution,
      termMonths,
      annualRate: rate,
      compoundingFrequency,
    });

    results.push({
      rate,
      label,
      finalBalance: comparison.finalBalance,
      totalInterestEarned: comparison.totalInterestEarned,
      differenceFromBase: roundToTwo(
        comparison.finalBalance - baseSummary.finalBalance
      ),
      isBaseRate: false,
    });
  }

  // Sort by rate ascending
  return results.sort((a, b) => a.rate - b.rate);
}

/**
 * Generate comparison data for a range of rates
 *
 * @param scenario - Base investment scenario
 * @param minRate - Minimum rate to compare (percentage)
 * @param maxRate - Maximum rate to compare (percentage)
 * @param step - Step between rates (default 0.5%)
 * @returns Array of comparison results
 */
export function compareRateRange(
  scenario: Pick<
    InvestmentScenario,
    | 'initialAmount'
    | 'monthlyContribution'
    | 'termMonths'
    | 'annualRate'
    | 'compoundingFrequency'
  >,
  minRate: number,
  maxRate: number,
  step: number = 0.5
): RateComparisonResult[] {
  const rates: Array<{ rate: number; label?: string }> = [];

  for (let rate = minRate; rate <= maxRate; rate += step) {
    if (rate !== scenario.annualRate) {
      rates.push({ rate: roundToTwo(rate) });
    }
  }

  return compareRates(scenario, rates);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Round to 2 decimal places
 */
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Round to 6 decimal places (for rates)
 */
function roundToSix(num: number): number {
  return Math.round(num * 1000000) / 1000000;
}

/**
 * Calculate how long to reach a target amount
 *
 * @param targetAmount - Target balance to reach
 * @param scenario - Investment scenario
 * @returns Number of months to reach target, or -1 if impossible
 */
export function calculateTimeToTarget(
  targetAmount: number,
  scenario: Pick<
    InvestmentScenario,
    | 'initialAmount'
    | 'monthlyContribution'
    | 'annualRate'
    | 'compoundingFrequency'
  >
): number {
  const {
    initialAmount,
    monthlyContribution,
    annualRate,
    compoundingFrequency,
  } = scenario;

  // If target is less than initial, return 0
  if (targetAmount <= initialAmount) {
    return 0;
  }

  // If no contributions and no interest, impossible to grow
  if (monthlyContribution === 0 && annualRate === 0) {
    return -1;
  }

  // Binary search for the month that reaches target
  let low = 1;
  let high = 1200; // 100 years max

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const summary = calculateInvestmentSummary({
      initialAmount,
      monthlyContribution,
      termMonths: mid,
      annualRate,
      compoundingFrequency,
    });

    if (summary.finalBalance >= targetAmount) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  // Verify we actually reached the target
  const finalSummary = calculateInvestmentSummary({
    initialAmount,
    monthlyContribution,
    termMonths: low,
    annualRate,
    compoundingFrequency,
  });

  return finalSummary.finalBalance >= targetAmount ? low : -1;
}

/**
 * Calculate required monthly contribution to reach target
 *
 * @param targetAmount - Target balance to reach
 * @param initialAmount - Starting amount
 * @param termMonths - Number of months
 * @param annualRate - Annual rate (percentage)
 * @param compoundingFrequency - Compounding frequency
 * @returns Required monthly contribution
 */
export function calculateRequiredContribution(
  targetAmount: number,
  initialAmount: number,
  termMonths: number,
  annualRate: number,
  compoundingFrequency: CompoundingFrequency
): number {
  // For monthly compounding
  if (compoundingFrequency === 'monthly') {
    const monthlyRate = convertEAToMonthlyRate(annualRate);

    // FV = P(1+r)^n + PMT * ((1+r)^n - 1) / r
    // PMT = (FV - P(1+r)^n) * r / ((1+r)^n - 1)

    const growthFactor = Math.pow(1 + monthlyRate, termMonths);
    const principalFV = initialAmount * growthFactor;

    if (annualRate === 0) {
      return (targetAmount - initialAmount) / termMonths;
    }

    const required =
      ((targetAmount - principalFV) * monthlyRate) / (growthFactor - 1);

    return Math.max(0, roundToTwo(required));
  }

  // For daily compounding, use iterative approach
  // Binary search for required contribution
  let low = 0;
  let high = targetAmount;
  const tolerance = 0.01;

  while (high - low > tolerance) {
    const mid = (low + high) / 2;
    const summary = calculateInvestmentSummary({
      initialAmount,
      monthlyContribution: mid,
      termMonths,
      annualRate,
      compoundingFrequency,
    });

    if (summary.finalBalance >= targetAmount) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return roundToTwo(high);
}
