/**
 * Loan Calculation Utilities
 *
 * Functions for calculating loan payments, amortization schedules,
 * and comparing different interest rate scenarios.
 *
 * Uses EA (Effective Annual) rate converted to monthly rate.
 */

import type {
  LoanScenario,
  AmortizationPayment,
  LoanSummary,
  LoanComparison,
  ExtraPayment,
} from '@/types/loan-simulator';
import { SUPPORTED_CURRENCIES } from '@/types/loan-simulator';

// ============================================================================
// Constants
// ============================================================================

/**
 * Decimal places for currency calculations
 */
const DECIMAL_PLACES = 2;

/**
 * Days in a month for payment date calculations
 */
const DAYS_IN_MONTH = 30;

/**
 * Months to add for each payment
 */
const MONTHS_PER_PAYMENT = 1;

// ============================================================================
// Core Calculation Functions
// ============================================================================

/**
 * Convert EA (Effective Annual) rate to monthly rate
 *
 * Formula: monthlyRate = (1 + EA)^(1/12) - 1
 *
 * @param annualRate - EA interest rate as percentage (e.g., 8.5 for 8.5%)
 * @returns Monthly interest rate as decimal
 */
export function convertEAtoMonthlyRate(annualRate: number): number {
  const rateAsDecimal = annualRate / 100;
  return Math.pow(1 + rateAsDecimal, 1 / 12) - 1;
}

/**
 * Calculate monthly payment using the PMT formula
 *
 * Formula: M = P * [r(1 + r)^n] / [(1 + r)^n - 1]
 *
 * Where:
 * - M = Monthly payment
 * - P = Principal (loan amount)
 * - r = Monthly interest rate
 * - n = Total number of payments
 *
 * @param principal - Loan amount
 * @param annualRate - EA interest rate as percentage
 * @param termMonths - Loan term in months
 * @returns Monthly payment amount
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  if (principal <= 0 || annualRate <= 0 || termMonths <= 0) {
    throw new Error(
      'Principal, interest rate, and term must be positive numbers'
    );
  }

  const monthlyRate = convertEAtoMonthlyRate(annualRate);

  // Handle zero interest rate edge case
  if (monthlyRate === 0) {
    return roundCurrency(principal / termMonths);
  }

  const numerator = monthlyRate * Math.pow(1 + monthlyRate, termMonths);
  const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;

  const monthlyPayment = principal * (numerator / denominator);

  return roundCurrency(monthlyPayment);
}

/**
 * Calculate loan summary statistics
 *
 * @param principal - Loan amount
 * @param annualRate - EA interest rate as percentage
 * @param termMonths - Loan term in months
 * @param startDate - Loan start date (ISO string)
 * @returns Loan summary with monthly payment, totals, and payoff date
 */
export function calculateLoanSummary(
  principal: number,
  annualRate: number,
  termMonths: number,
  startDate: string
): LoanSummary {
  const monthlyPayment = calculateMonthlyPayment(
    principal,
    annualRate,
    termMonths
  );

  const totalPayment = monthlyPayment * termMonths;
  const totalInterest = totalPayment - principal;

  // Calculate payoff date
  const payoffDate = calculatePayoffDate(startDate, termMonths);

  return {
    monthlyPayment,
    totalPrincipal: principal,
    totalInterest,
    totalPayment,
    payoffDate,
    termMonths,
  };
}

/**
 * Calculate the payoff date based on start date and term
 *
 * @param startDate - Loan start date (ISO string)
 * @param termMonths - Loan term in months
 * @returns Payoff date as ISO string
 */
export function calculatePayoffDate(
  startDate: string,
  termMonths: number
): string {
  let date = new Date(startDate);

  // Check if date is invalid
  if (isNaN(date.getTime())) {
    // Try parsing as YYYY-MM-DD format
    const parts = startDate.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      date = new Date(year, month - 1, day);
    }
  }

  // Still invalid? Use today's date
  if (isNaN(date.getTime())) {
    date = new Date();
  }

  // Handle invalid dates by setting to the last day of the target month
  const originalDay = date.getDate();
  date.setMonth(date.getMonth() + termMonths);

  // If the day changed, it means we rolled over to next month due to invalid date
  // (e.g., Jan 31 + 1 month = March 2 or 3 instead of Feb 28/29)
  // In this case, set to the last day of the previous month
  if (date.getDate() !== originalDay) {
    date.setDate(0); // Set to last day of previous month
  }

  const isoString = date.toISOString();
  return isoString.split('T')[0];
}

/**
 * Round a number to currency precision
 *
 * @param value - Value to round
 * @returns Rounded value with 2 decimal places
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

// ============================================================================
// Amortization Schedule
// ============================================================================

/**
 * Generate a complete amortization schedule
 *
 * @param scenario - Loan scenario configuration
 * @param extraPayments - Optional array of extra payments
 * @returns Array of amortization payments
 */
export function generateAmortizationSchedule(
  scenario: LoanScenario,
  extraPayments: ExtraPayment[] = []
): AmortizationPayment[] {
  const { principal, interestRate, termMonths, startDate } = scenario;

  const monthlyPayment = calculateMonthlyPayment(
    principal,
    interestRate,
    termMonths
  );
  const monthlyRate = convertEAtoMonthlyRate(interestRate);

  // Create a map of extra payments by payment number for quick lookup
  const extraPaymentsMap = new Map<number, number>();
  extraPayments.forEach((ep) => {
    const currentAmount = extraPaymentsMap.get(ep.paymentNumber) || 0;
    extraPaymentsMap.set(ep.paymentNumber, currentAmount + ep.amount);
  });

  const schedule: AmortizationPayment[] = [];
  let remainingBalance = principal;
  let paymentDate = new Date(startDate);

  for (let paymentNumber = 1; paymentNumber <= termMonths; paymentNumber++) {
    // Calculate interest portion for this payment
    const interestPortion = roundCurrency(remainingBalance * monthlyRate);

    // Calculate principal portion
    let principalPortion = monthlyPayment - interestPortion;

    // Check if there's an extra payment for this payment number
    const extraAmount = extraPaymentsMap.get(paymentNumber) || 0;
    const hasExtraPayment = extraAmount > 0;

    // Add extra payment to principal portion
    if (hasExtraPayment) {
      principalPortion += extraAmount;
    }

    // Don't pay more than the remaining balance
    if (principalPortion > remainingBalance) {
      principalPortion = remainingBalance;
    }

    // Calculate total payment amount
    const paymentAmount = hasExtraPayment
      ? monthlyPayment + extraAmount
      : monthlyPayment;

    // Update remaining balance
    remainingBalance = roundCurrency(remainingBalance - principalPortion);

    // Ensure balance doesn't go negative due to rounding
    if (remainingBalance < 0.01) {
      remainingBalance = 0;
    }

    // Format payment date
    const dateString = paymentDate.toISOString().split('T')[0];

    schedule.push({
      paymentNumber,
      date: dateString,
      paymentAmount: roundCurrency(paymentAmount),
      principalPortion: roundCurrency(principalPortion),
      interestPortion: roundCurrency(interestPortion),
      remainingBalance,
      isExtraPayment: hasExtraPayment,
      extraAmount: hasExtraPayment ? extraAmount : undefined,
    });

    // Move to next month
    paymentDate.setMonth(paymentDate.getMonth() + MONTHS_PER_PAYMENT);

    // Loan is paid off
    if (remainingBalance === 0) {
      break;
    }
  }

  return schedule;
}

/**
 * Calculate the impact of extra payments on a loan
 *
 * @param scenario - Original loan scenario
 * @param extraPayments - Array of extra payments
 * @returns Object containing months saved, interest saved, and new summary
 */
export function calculateExtraPaymentImpact(
  scenario: LoanScenario,
  extraPayments: ExtraPayment[]
): {
  originalSummary: LoanSummary;
  newSummary: LoanSummary;
  monthsSaved: number;
  interestSaved: number;
} {
  // Calculate original loan summary
  const originalSummary = calculateLoanSummary(
    scenario.principal,
    scenario.interestRate,
    scenario.termMonths,
    scenario.startDate
  );

  // Generate schedule with extra payments
  const schedule = generateAmortizationSchedule(scenario, extraPayments);

  if (schedule.length === 0) {
    return {
      originalSummary,
      newSummary: originalSummary,
      monthsSaved: 0,
      interestSaved: 0,
    };
  }

  // Calculate new totals from the schedule
  const totalPayment = schedule.reduce(
    (sum, payment) => sum + payment.paymentAmount,
    0
  );
  const totalInterest = totalPayment - scenario.principal;

  // The actual term is the number of payments made
  const actualTermMonths = schedule.length;
  const monthlyPayment = originalSummary.monthlyPayment; // Base payment doesn't change

  // Calculate payoff date from last payment
  const lastPayment = schedule[schedule.length - 1];
  const newPayoffDate = lastPayment.date;

  const newSummary: LoanSummary = {
    monthlyPayment,
    totalPrincipal: scenario.principal,
    totalInterest,
    totalPayment,
    payoffDate: newPayoffDate,
    termMonths: actualTermMonths,
  };

  // Calculate savings
  const monthsSaved = originalSummary.termMonths - actualTermMonths;
  const interestSaved = originalSummary.totalInterest - totalInterest;

  return {
    originalSummary,
    newSummary,
    monthsSaved: Math.max(0, monthsSaved),
    interestSaved: Math.max(0, interestSaved),
  };
}

// ============================================================================
// Interest Rate Comparison
// ============================================================================

/**
 * Compare loan scenarios with different interest rates
 *
 * @param baseScenario - Base loan scenario (uses its principal, term, start date)
 * @param interestRates - Array of interest rates to compare
 * @returns Array of loan comparisons sorted by interest rate
 */
export function compareInterestRates(
  baseScenario: LoanScenario,
  interestRates: number[]
): LoanComparison[] {
  const { principal, termMonths } = baseScenario;

  const comparisons: LoanComparison[] = interestRates.map((rate) => {
    const monthlyPayment = calculateMonthlyPayment(principal, rate, termMonths);

    const totalPayment = monthlyPayment * termMonths;
    const totalInterest = totalPayment - principal;

    return {
      interestRate: rate,
      monthlyPayment,
      totalInterest,
      totalPayment,
    };
  });

  // Sort by interest rate
  return comparisons.sort((a, b) => a.interestRate - b.interestRate);
}

/**
 * Generate comparison data including the base scenario's rate
 *
 * @param scenario - Loan scenario
 * @param additionalRates - Additional rates to compare (optional)
 * @returns Array of loan comparisons including the base scenario
 */
export function generateLoanComparisons(
  scenario: LoanScenario,
  additionalRates: number[] = []
): LoanComparison[] {
  // Always include the base scenario's rate
  const allRates = [scenario.interestRate, ...additionalRates];

  // Remove duplicates
  const uniqueRates = [...new Set(allRates)];

  return compareInterestRates(scenario, uniqueRates);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format a currency value for display
 *
 * @param value - Numeric value to format
 * @param currencyCode - Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  currencyCode: keyof typeof SUPPORTED_CURRENCIES = 'USD'
): string {
  const currency =
    SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.USD;
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
  }).format(value);
}

/**
 * Format a date for display
 *
 * @param dateString - ISO date string
 * @param locale - Locale for formatting (default: es-MX)
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string,
  locale: string = 'es-MX'
): string {
  let date = new Date(dateString);

  // Check if date is invalid
  if (isNaN(date.getTime())) {
    // Try parsing as YYYY-MM-DD format
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      date = new Date(year, month - 1, day);
    }
  }

  // Still invalid? Return the original string
  if (isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Calculate the percentage of principal paid at a given payment number
 *
 * @param scenario - Loan scenario
 * @param paymentNumber - Payment number to check
 * @returns Percentage of principal paid (0-100)
 */
export function calculatePrincipalPaidPercentage(
  scenario: LoanScenario,
  paymentNumber: number
): number {
  const schedule = generateAmortizationSchedule(scenario);

  if (paymentNumber >= schedule.length) {
    return 100;
  }

  const payment = schedule[paymentNumber - 1];
  const principalPaid = scenario.principal - payment.remainingBalance;

  return (principalPaid / scenario.principal) * 100;
}

/**
 * Get a payment schedule summary for a range of payments
 *
 * @param scenario - Loan scenario
 * @param startPayment - Starting payment number (default: 1)
 * @param endPayment - Ending payment number (default: term)
 * @returns Summary statistics for the payment range
 */
export function getPaymentRangeSummary(
  scenario: LoanScenario,
  startPayment: number = 1,
  endPayment?: number
): {
  paymentCount: number;
  totalPrincipal: number;
  totalInterest: number;
  totalPaid: number;
} {
  const schedule = generateAmortizationSchedule(scenario);
  const end = endPayment || scenario.termMonths;

  const startIndex = Math.max(0, startPayment - 1);
  const endIndex = Math.min(schedule.length, end);

  const paymentsInRange = schedule.slice(startIndex, endIndex);

  const totalPrincipal = paymentsInRange.reduce(
    (sum, p) => sum + p.principalPortion,
    0
  );
  const totalInterest = paymentsInRange.reduce(
    (sum, p) => sum + p.interestPortion,
    0
  );
  const totalPaid = totalPrincipal + totalInterest;

  return {
    paymentCount: paymentsInRange.length,
    totalPrincipal: roundCurrency(totalPrincipal),
    totalInterest: roundCurrency(totalInterest),
    totalPaid: roundCurrency(totalPaid),
  };
}
