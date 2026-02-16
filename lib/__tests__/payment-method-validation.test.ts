import {
  validatePaymentMethods,
  sanitizePaymentMethods,
  formatPaymentMethodsForDisplay,
  isAllMethodsConfiguration,
  validateSinglePaymentMethod,
  VALID_PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from '../payment-method-validation';

describe('Payment Method Validation', () => {
  describe('validatePaymentMethods', () => {
    it('should validate null as valid (all methods)', () => {
      const result = validatePaymentMethods(null);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain(
        'No se han especificado métodos de pago'
      );
    });

    it('should validate undefined as valid (all methods)', () => {
      const result = validatePaymentMethods(undefined);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
    });

    it('should validate valid payment methods array', () => {
      const result = validatePaymentMethods(['cash', 'credit']);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-array values', () => {
      const result = validatePaymentMethods('cash');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('deben ser un array');
    });

    it('should reject empty arrays', () => {
      const result = validatePaymentMethods([]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('no puede estar vacío');
    });

    it('should reject invalid payment method values', () => {
      const result = validatePaymentMethods(['cash', 'invalid', 'credit']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Métodos de pago inválidos');
    });

    it('should reject duplicate payment methods', () => {
      const result = validatePaymentMethods(['cash', 'credit', 'cash']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('duplicados');
    });

    it('should warn when all methods are selected', () => {
      const result = validatePaymentMethods(['cash', 'credit', 'debit']);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('todos los métodos seleccionados');
    });
  });

  describe('validateSinglePaymentMethod', () => {
    it('should validate valid payment methods', () => {
      expect(validateSinglePaymentMethod('cash')).toBe(true);
      expect(validateSinglePaymentMethod('credit')).toBe(true);
      expect(validateSinglePaymentMethod('debit')).toBe(true);
    });

    it('should reject invalid payment methods', () => {
      expect(validateSinglePaymentMethod('invalid')).toBe(false);
      expect(validateSinglePaymentMethod(123)).toBe(false);
      expect(validateSinglePaymentMethod(null)).toBe(false);
      expect(validateSinglePaymentMethod(undefined)).toBe(false);
    });
  });

  describe('sanitizePaymentMethods', () => {
    it('should return null for null input', () => {
      expect(sanitizePaymentMethods(null)).toBe(null);
    });

    it('should return null for undefined input', () => {
      expect(sanitizePaymentMethods(undefined)).toBe(null);
    });

    it('should return null for non-array input', () => {
      expect(sanitizePaymentMethods('cash')).toBe(null);
      expect(sanitizePaymentMethods(123)).toBe(null);
    });

    it('should filter out invalid methods', () => {
      const result = sanitizePaymentMethods([
        'cash',
        'invalid',
        'credit',
        'another_invalid',
      ]);
      expect(result).toEqual(['cash', 'credit']);
    });

    it('should remove duplicates', () => {
      const result = sanitizePaymentMethods([
        'cash',
        'credit',
        'cash',
        'debit',
      ]);
      expect(result).toEqual(['cash', 'credit', 'debit']);
    });

    it('should return null for empty result after filtering', () => {
      const result = sanitizePaymentMethods(['invalid1', 'invalid2']);
      expect(result).toBe(null);
    });

    it('should preserve valid methods', () => {
      const result = sanitizePaymentMethods(['cash', 'credit']);
      expect(result).toEqual(['cash', 'credit']);
    });
  });

  describe('formatPaymentMethodsForDisplay', () => {
    it("should format null as 'Todos los métodos'", () => {
      expect(formatPaymentMethodsForDisplay(null)).toBe('Todos los métodos');
    });

    it("should format empty array as 'Todos los métodos'", () => {
      expect(formatPaymentMethodsForDisplay([])).toBe('Todos los métodos');
    });

    it('should format single method', () => {
      expect(formatPaymentMethodsForDisplay(['cash'])).toBe('Efectivo');
    });

    it('should format multiple methods', () => {
      const result = formatPaymentMethodsForDisplay(['cash', 'credit']);
      expect(result).toBe('Efectivo, Crédito');
    });

    it('should format all methods', () => {
      const result = formatPaymentMethodsForDisplay([
        'cash',
        'credit',
        'debit',
      ]);
      expect(result).toBe('Efectivo, Crédito, Débito');
    });
  });

  describe('isAllMethodsConfiguration', () => {
    it('should return true for null', () => {
      expect(isAllMethodsConfiguration(null)).toBe(true);
    });

    it('should return true for empty array', () => {
      expect(isAllMethodsConfiguration([])).toBe(true);
    });

    it('should return true when all methods are selected', () => {
      expect(isAllMethodsConfiguration(['cash', 'credit', 'debit'])).toBe(true);
      expect(isAllMethodsConfiguration(['debit', 'cash', 'credit'])).toBe(true);
    });

    it('should return false for partial selection', () => {
      expect(isAllMethodsConfiguration(['cash'])).toBe(false);
      expect(isAllMethodsConfiguration(['cash', 'credit'])).toBe(false);
    });
  });

  describe('Constants', () => {
    it('should have correct valid payment methods', () => {
      expect(VALID_PAYMENT_METHODS).toEqual(['cash', 'credit', 'debit']);
    });

    it('should have correct payment method labels', () => {
      expect(PAYMENT_METHOD_LABELS).toEqual({
        cash: 'Efectivo',
        credit: 'Crédito',
        debit: 'Débito',
      });
    });

    it('should have labels for all valid methods', () => {
      VALID_PAYMENT_METHODS.forEach((method) => {
        expect(PAYMENT_METHOD_LABELS[method]).toBeDefined();
        expect(typeof PAYMENT_METHOD_LABELS[method]).toBe('string');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle mixed case input gracefully', () => {
      // Note: Our validation is case-sensitive, so this should fail
      const result = validatePaymentMethods(['CASH', 'Credit', 'debit']);
      expect(result.isValid).toBe(false);
    });

    it('should handle numeric values', () => {
      const result = validatePaymentMethods([1, 2, 3]);
      expect(result.isValid).toBe(false);
    });

    it('should handle object values', () => {
      const result = validatePaymentMethods([{ method: 'cash' }]);
      expect(result.isValid).toBe(false);
    });

    it('should handle very large arrays', () => {
      const largeArray = new Array(1000).fill('cash');
      const result = validatePaymentMethods(largeArray);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('duplicados');
    });
  });
});
