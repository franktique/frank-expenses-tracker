/**
 * Payment Method Validation Utilities
 * Provides client-side validation for payment method selections
 */

export type PaymentMethod = "cash" | "credit" | "debit";

export const VALID_PAYMENT_METHODS: PaymentMethod[] = [
  "cash",
  "credit",
  "debit",
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  credit: "Crédito",
  debit: "Débito",
};

export interface PaymentMethodValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates payment method array
 */
export function validatePaymentMethods(
  paymentMethods: unknown
): PaymentMethodValidationResult {
  const result: PaymentMethodValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Allow null/undefined for "all methods"
  if (paymentMethods === null || paymentMethods === undefined) {
    result.warnings.push(
      "No se han especificado métodos de pago. Se incluirán todos los métodos por defecto."
    );
    return result;
  }

  // Must be an array
  if (!Array.isArray(paymentMethods)) {
    result.isValid = false;
    result.errors.push("Los métodos de pago deben ser un array.");
    return result;
  }

  // Empty array is not allowed (use null for "all methods")
  if (paymentMethods.length === 0) {
    result.isValid = false;
    result.errors.push(
      "El array de métodos de pago no puede estar vacío. Use null para incluir todos los métodos."
    );
    return result;
  }

  // Check for valid payment method values
  const invalidMethods = paymentMethods.filter(
    (method) => !VALID_PAYMENT_METHODS.includes(method as PaymentMethod)
  );

  if (invalidMethods.length > 0) {
    result.isValid = false;
    result.errors.push(
      `Métodos de pago inválidos: ${invalidMethods.join(
        ", "
      )}. Valores válidos: ${VALID_PAYMENT_METHODS.join(", ")}`
    );
  }

  // Check for duplicates
  const uniqueMethods = [...new Set(paymentMethods)];
  if (uniqueMethods.length !== paymentMethods.length) {
    result.isValid = false;
    result.errors.push("No se permiten métodos de pago duplicados.");
  }

  // Check if all methods are selected (suggest using null instead)
  if (
    paymentMethods.length === VALID_PAYMENT_METHODS.length &&
    VALID_PAYMENT_METHODS.every((method) => paymentMethods.includes(method))
  ) {
    result.warnings.push(
      "Tienes todos los métodos seleccionados. Considera usar 'Todos los métodos' para mayor claridad."
    );
  }

  return result;
}

/**
 * Validates a single payment method value
 */
export function validateSinglePaymentMethod(method: unknown): boolean {
  return (
    typeof method === "string" &&
    VALID_PAYMENT_METHODS.includes(method as PaymentMethod)
  );
}

/**
 * Sanitizes payment methods array by removing invalid values
 */
export function sanitizePaymentMethods(
  paymentMethods: unknown
): PaymentMethod[] | null {
  if (paymentMethods === null || paymentMethods === undefined) {
    return null;
  }

  if (!Array.isArray(paymentMethods)) {
    return null;
  }

  const validMethods = paymentMethods.filter(
    validateSinglePaymentMethod
  ) as PaymentMethod[];

  // Remove duplicates
  const uniqueMethods = [...new Set(validMethods)];

  return uniqueMethods.length > 0 ? uniqueMethods : null;
}

/**
 * Formats payment methods for display
 */
export function formatPaymentMethodsForDisplay(
  paymentMethods: PaymentMethod[] | null
): string {
  if (!paymentMethods || paymentMethods.length === 0) {
    return "Todos los métodos";
  }

  return paymentMethods
    .map((method) => PAYMENT_METHOD_LABELS[method])
    .join(", ");
}

/**
 * Checks if payment methods configuration is equivalent to "all methods"
 */
export function isAllMethodsConfiguration(
  paymentMethods: PaymentMethod[] | null
): boolean {
  if (!paymentMethods || paymentMethods.length === 0) {
    return true;
  }

  return (
    paymentMethods.length === VALID_PAYMENT_METHODS.length &&
    VALID_PAYMENT_METHODS.every((method) => paymentMethods.includes(method))
  );
}
