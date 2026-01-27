import type { RateType, RateConversionResult, RateConversionDisplay } from "@/types/interest-rate-simulator";
import { RATE_TYPES } from "@/types/interest-rate-simulator";

// ============================================================================
// Constants
// ============================================================================

const DAYS_PER_YEAR = 365;
const MONTHS_PER_YEAR = 12;

// ============================================================================
// Rounding Utilities
// ============================================================================

/**
 * Round to specified decimal places
 */
function roundTo(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

/**
 * Round rate to 8 decimal places (for internal calculations)
 */
function roundRate(rate: number): number {
  return roundTo(rate, 8);
}

/**
 * Round rate to 6 decimal places (for display)
 */
function roundRateForDisplay(rate: number): number {
  return roundTo(rate, 6);
}

// ============================================================================
// EA (Efectiva Anual) Conversion Functions
// ============================================================================

/**
 * Convert EA to EM (Efectiva Mensual)
 * Formula: EM = (1 + EA)^(1/12) - 1
 * @param ea - Efectiva Anual as decimal (e.g., 0.12 for 12%)
 */
export function convertEAtoEM(ea: number): number {
  if (ea < 0) return 0;
  return roundRate(Math.pow(1 + ea, 1 / MONTHS_PER_YEAR) - 1);
}

/**
 * Convert EA to ED (Efectiva Diaria)
 * Formula: ED = (1 + EA)^(1/365) - 1
 * @param ea - Efectiva Anual as decimal
 */
export function convertEAtoED(ea: number): number {
  if (ea < 0) return 0;
  return roundRate(Math.pow(1 + ea, 1 / DAYS_PER_YEAR) - 1);
}

/**
 * Convert EA to NM (Nominal Mensual - tasa mensual)
 * Formula: NM = (1 + EA)^(1/12) - 1
 * This is the monthly rate equivalent to the EA
 * @param ea - Efectiva Anual as decimal
 */
export function convertEAtoNM(ea: number): number {
  if (ea < 0) return 0;
  // NM is essentially the same as EM (monthly rate)
  return convertEAtoEM(ea);
}

/**
 * Convert EA to NA (Nominal Anual - tasa anual nominal)
 * Formula: NA = 12 × EM = 12 × [(1 + EA)^(1/12) - 1]
 * This is the annualized nominal rate (monthly rate × 12)
 * @param ea - Efectiva Anual as decimal
 */
export function convertEAtoNA(ea: number): number {
  if (ea < 0) return 0;
  const em = convertEAtoEM(ea);
  return roundRate(MONTHS_PER_YEAR * em);
}

// ============================================================================
// EM (Efectiva Mensual) Conversion Functions
// ============================================================================

/**
 * Convert EM to EA
 * Formula: EA = (1 + EM)^12 - 1
 * @param em - Efectiva Mensual as decimal
 */
export function convertEMtoEA(em: number): number {
  if (em < 0) return 0;
  return roundRate(Math.pow(1 + em, MONTHS_PER_YEAR) - 1);
}

/**
 * Convert EM to ED
 * First convert to EA, then to ED
 * @param em - Efectiva Mensual as decimal
 */
export function convertEMtoED(em: number): number {
  const ea = convertEMtoEA(em);
  return convertEAtoED(ea);
}

/**
 * Convert EM to NM
 * EM ≈ NM (both are monthly rates)
 * @param em - Efectiva Mensual as decimal
 */
export function convertEMtoNM(em: number): number {
  if (em < 0) return 0;
  return roundRate(em);
}

/**
 * Convert EM to NA
 * NA = EM × 12 (annualized nominal rate)
 * @param em - Efectiva Mensual as decimal
 */
export function convertEMtoNA(em: number): number {
  if (em < 0) return 0;
  return roundRate(MONTHS_PER_YEAR * em);
}

// ============================================================================
// ED (Efectiva Diaria) Conversion Functions
// ============================================================================

/**
 * Convert ED to EA
 * Formula: EA = (1 + ED)^365 - 1
 * @param ed - Efectiva Diaria as decimal
 */
export function convertEDtoEA(ed: number): number {
  if (ed < 0) return 0;
  return roundRate(Math.pow(1 + ed, DAYS_PER_YEAR) - 1);
}

/**
 * Convert ED to EM
 * First convert to EA, then to EM
 * @param ed - Efectiva Diaria as decimal
 */
export function convertEDtoEM(ed: number): number {
  const ea = convertEDtoEA(ed);
  return convertEAtoEM(ea);
}

/**
 * Convert ED to NM
 * First convert to EA, then to EM (which equals NM)
 * @param ed - Efectiva Diaria as decimal
 */
export function convertEDtoNM(ed: number): number {
  const ea = convertEDtoEA(ed);
  return convertEAtoEM(ea); // NM = EM (monthly rate)
}

/**
 * Convert ED to NA
 * NA = NM × 12 (annualized)
 * @param ed - Efectiva Diaria as decimal
 */
export function convertEDtoNA(ed: number): number {
  const nm = convertEDtoNM(ed);
  return roundRate(nm * MONTHS_PER_YEAR);
}

// ============================================================================
// NM (Nominal Mensual) Conversion Functions
// NM is treated as a MONTHLY rate (what you see on a bill/statement)
// ============================================================================

/**
 * Convert NM to EA
 * Formula: EA = (1 + NM)^12 - 1
 * NM is the monthly rate (e.g., 1.1% monthly)
 * @param nm - Nominal Mensual as decimal (monthly rate)
 */
export function convertNMtoEA(nm: number): number {
  if (nm < 0) return 0;
  return roundRate(Math.pow(1 + nm, MONTHS_PER_YEAR) - 1);
}

/**
 * Convert NM to EM
 * NM (nominal monthly) ≈ EM (effective monthly) for practical purposes
 * @param nm - Nominal Mensual as decimal
 */
export function convertNMtoEM(nm: number): number {
  if (nm < 0) return 0;
  return roundRate(nm);
}

/**
 * Convert NM to ED
 * @param nm - Nominal Mensual as decimal
 */
export function convertNMtoED(nm: number): number {
  const ea = convertNMtoEA(nm);
  return convertEAtoED(ea);
}

/**
 * Convert NM to NA
 * NA = NM * 12 (annualized nominal rate)
 * @param nm - Nominal Mensual as decimal
 */
export function convertNMtoNA(nm: number): number {
  if (nm < 0) return 0;
  return roundRate(nm * MONTHS_PER_YEAR);
}

// ============================================================================
// NA (Nominal Anual) Conversion Functions
// NA is the annual nominal rate (NM * 12)
// ============================================================================

/**
 * Convert NA to EA
 * Formula: EA = (1 + NA/12)^12 - 1
 * NA is the annual nominal rate, divided by 12 for monthly compounding
 * @param na - Nominal Anual as decimal (annual rate)
 */
export function convertNAtoEA(na: number): number {
  if (na < 0) return 0;
  const monthlyRate = na / MONTHS_PER_YEAR;
  return roundRate(Math.pow(1 + monthlyRate, MONTHS_PER_YEAR) - 1);
}

/**
 * Convert NA to EM
 * EM = NA / 12
 * @param na - Nominal Anual as decimal
 */
export function convertNAtoEM(na: number): number {
  if (na < 0) return 0;
  return roundRate(na / MONTHS_PER_YEAR);
}

/**
 * Convert NA to ED
 * @param na - Nominal Anual as decimal
 */
export function convertNAtoED(na: number): number {
  const ea = convertNAtoEA(na);
  return convertEAtoED(ea);
}

/**
 * Convert NA to NM
 * NM = NA / 12 (monthly rate from annual)
 * @param na - Nominal Anual as decimal
 */
export function convertNAtoNM(na: number): number {
  if (na < 0) return 0;
  return roundRate(na / MONTHS_PER_YEAR);
}

// ============================================================================
// Main Conversion Function
// ============================================================================

/**
 * Convert a rate from one type to all other types
 * @param rate - The rate value as decimal (e.g., 0.12 for 12%)
 * @param fromType - The type of the input rate
 * @returns Object with all rate conversions
 */
export function convertRate(rate: number, fromType: RateType): RateConversionResult {
  // Handle edge cases
  if (rate < 0) {
    return { ea: 0, em: 0, ed: 0, nm: 0, na: 0 };
  }

  let ea: number;

  // First, convert to EA as the base
  switch (fromType) {
    case "EA":
      ea = rate;
      break;
    case "EM":
      ea = convertEMtoEA(rate);
      break;
    case "ED":
      ea = convertEDtoEA(rate);
      break;
    case "NM":
      ea = convertNMtoEA(rate);
      break;
    case "NA":
      ea = convertNAtoEA(rate);
      break;
    default:
      ea = rate; // Default to treating as EA
  }

  // Then convert EA to all other types
  return {
    ea: roundRateForDisplay(ea),
    em: roundRateForDisplay(convertEAtoEM(ea)),
    ed: roundRateForDisplay(convertEAtoED(ea)),
    nm: roundRateForDisplay(convertEAtoNM(ea)),
    na: roundRateForDisplay(convertEAtoNA(ea)),
  };
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Get conversion results with display metadata
 * @param rate - Input rate as decimal
 * @param fromType - Input rate type
 * @returns Array of conversion results with display info
 */
export function getConversionDisplay(
  rate: number,
  fromType: RateType
): RateConversionDisplay[] {
  const conversions = convertRate(rate, fromType);

  const formulas: Record<RateType, string> = {
    EA: getFormulaToEA(fromType),
    EM: `EM = (1 + EA)^(1/12) - 1`,
    ED: `ED = (1 + EA)^(1/365) - 1`,
    NM: `NM = EM (tasa mensual)`,
    NA: `NA = EM × 12`,
  };

  // If input is EA, update the formula
  if (fromType === "EA") {
    formulas.EA = "Valor ingresado";
  }

  return [
    {
      rateType: "EA",
      value: conversions.ea,
      isInput: fromType === "EA",
      formula: formulas.EA,
    },
    {
      rateType: "EM",
      value: conversions.em,
      isInput: fromType === "EM",
      formula: fromType === "EM" ? "Valor ingresado" : formulas.EM,
    },
    {
      rateType: "ED",
      value: conversions.ed,
      isInput: fromType === "ED",
      formula: fromType === "ED" ? "Valor ingresado" : formulas.ED,
    },
    {
      rateType: "NM",
      value: conversions.nm,
      isInput: fromType === "NM",
      formula: fromType === "NM" ? "Valor ingresado" : formulas.NM,
    },
    {
      rateType: "NA",
      value: conversions.na,
      isInput: fromType === "NA",
      formula: fromType === "NA" ? "Valor ingresado" : formulas.NA,
    },
  ];
}

/**
 * Get the formula string for converting to EA from a given type
 */
function getFormulaToEA(fromType: RateType): string {
  switch (fromType) {
    case "EA":
      return "Valor ingresado";
    case "EM":
      return "EA = (1 + EM)^12 - 1";
    case "ED":
      return "EA = (1 + ED)^365 - 1";
    case "NM":
      return "EA = (1 + NM)^12 - 1";
    case "NA":
      return "EA = (1 + NA/12)^12 - 1";
    default:
      return "";
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate if a rate is within acceptable bounds
 * @param rate - Rate as decimal
 * @returns true if valid, false otherwise
 */
export function isValidRate(rate: number): boolean {
  return rate >= 0 && rate <= 10; // 0% to 1000%
}

/**
 * Get a user-friendly error message for invalid rates
 */
export function getRateValidationError(rate: number): string | null {
  if (rate < 0) {
    return "La tasa no puede ser negativa";
  }
  if (rate > 10) {
    return "La tasa no puede exceder 1000%";
  }
  return null;
}

// ============================================================================
// Comparison Functions
// ============================================================================

/**
 * Compare two rates by converting them to EA
 * @param rate1 - First rate as decimal
 * @param type1 - First rate type
 * @param rate2 - Second rate as decimal
 * @param type2 - Second rate type
 * @returns Difference in EA (rate1 - rate2)
 */
export function compareRates(
  rate1: number,
  type1: RateType,
  rate2: number,
  type2: RateType
): number {
  const ea1 = convertRate(rate1, type1).ea;
  const ea2 = convertRate(rate2, type2).ea;
  return roundRateForDisplay(ea1 - ea2);
}

/**
 * Check if two rates are equivalent (same EA)
 * @param rate1 - First rate as decimal
 * @param type1 - First rate type
 * @param rate2 - Second rate as decimal
 * @param type2 - Second rate type
 * @param tolerance - Acceptable difference (default: 0.0001%)
 */
export function areRatesEquivalent(
  rate1: number,
  type1: RateType,
  rate2: number,
  type2: RateType,
  tolerance: number = 0.000001
): boolean {
  const diff = Math.abs(compareRates(rate1, type1, rate2, type2));
  return diff <= tolerance;
}
