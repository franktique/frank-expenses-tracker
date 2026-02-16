import { describe, it, expect } from '@jest/globals';
import {
  PaymentMethodEnum,
  PaymentMethodsArraySchema,
  EstudioGrouperResponseSchema,
  UpdateEstudioGrouperRequestSchema,
  isValidPaymentMethod,
  validatePaymentMethods,
  hasPaymentMethodFiltering,
  VALID_PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type EstudioGrouperResponse,
  type UpdateEstudioGrouperRequest,
} from '../estudios';

describe('Estudios Types', () => {
  describe('PaymentMethod validation', () => {
    it('should validate valid payment methods', () => {
      expect(PaymentMethodEnum.parse('cash')).toBe('cash');
      expect(PaymentMethodEnum.parse('credit')).toBe('credit');
      expect(PaymentMethodEnum.parse('debit')).toBe('debit');
    });

    it('should reject invalid payment methods', () => {
      expect(() => PaymentMethodEnum.parse('invalid')).toThrow();
      expect(() => PaymentMethodEnum.parse('')).toThrow();
      expect(() => PaymentMethodEnum.parse(null)).toThrow();
    });

    it('should validate payment method arrays', () => {
      // Valid arrays
      expect(PaymentMethodsArraySchema.parse(['cash'])).toEqual(['cash']);
      expect(PaymentMethodsArraySchema.parse(['cash', 'credit'])).toEqual([
        'cash',
        'credit',
      ]);
      expect(PaymentMethodsArraySchema.parse(null)).toBe(null);

      // Invalid arrays
      expect(() => PaymentMethodsArraySchema.parse([])).toThrow(); // Empty array not allowed
      expect(() => PaymentMethodsArraySchema.parse(['invalid'])).toThrow();
      expect(() => PaymentMethodsArraySchema.parse(['cash', 'cash'])).toThrow(); // Duplicates
    });
  });

  describe('EstudioGrouperResponse validation', () => {
    it('should validate valid EstudioGrouperResponse', () => {
      const validResponse: EstudioGrouperResponse = {
        id: 1,
        name: 'Test Grouper',
        is_assigned: true,
        percentage: 50,
        payment_methods: ['cash', 'credit'],
      };

      expect(EstudioGrouperResponseSchema.parse(validResponse)).toEqual(
        validResponse
      );
    });

    it('should validate EstudioGrouperResponse with null payment methods', () => {
      const validResponse: EstudioGrouperResponse = {
        id: 1,
        name: 'Test Grouper',
        is_assigned: false,
        percentage: null,
        payment_methods: null,
      };

      expect(EstudioGrouperResponseSchema.parse(validResponse)).toEqual(
        validResponse
      );
    });

    it('should reject invalid EstudioGrouperResponse', () => {
      // Invalid percentage
      expect(() =>
        EstudioGrouperResponseSchema.parse({
          id: 1,
          name: 'Test',
          percentage: 150, // > 100
        })
      ).toThrow();

      // Invalid payment methods
      expect(() =>
        EstudioGrouperResponseSchema.parse({
          id: 1,
          name: 'Test',
          payment_methods: [], // Empty array not allowed
        })
      ).toThrow();
    });
  });

  describe('UpdateEstudioGrouperRequest validation', () => {
    it('should validate valid update requests', () => {
      const validRequest: UpdateEstudioGrouperRequest = {
        percentage: 75,
        payment_methods: ['debit'],
      };

      expect(UpdateEstudioGrouperRequestSchema.parse(validRequest)).toEqual(
        validRequest
      );
    });

    it('should validate partial update requests', () => {
      // Only percentage
      expect(
        UpdateEstudioGrouperRequestSchema.parse({ percentage: 25 })
      ).toEqual({ percentage: 25 });

      // Only payment methods
      expect(
        UpdateEstudioGrouperRequestSchema.parse({
          payment_methods: ['cash', 'debit'],
        })
      ).toEqual({ payment_methods: ['cash', 'debit'] });

      // Null values (to clear)
      expect(
        UpdateEstudioGrouperRequestSchema.parse({
          percentage: null,
          payment_methods: null,
        })
      ).toEqual({ percentage: null, payment_methods: null });
    });
  });

  describe('Utility functions', () => {
    describe('isValidPaymentMethod', () => {
      it('should correctly identify valid payment methods', () => {
        expect(isValidPaymentMethod('cash')).toBe(true);
        expect(isValidPaymentMethod('credit')).toBe(true);
        expect(isValidPaymentMethod('debit')).toBe(true);
        expect(isValidPaymentMethod('invalid')).toBe(false);
        expect(isValidPaymentMethod('')).toBe(false);
      });
    });

    describe('validatePaymentMethods', () => {
      it('should validate payment method arrays', () => {
        expect(validatePaymentMethods(null)).toBe(true);
        expect(validatePaymentMethods(undefined)).toBe(true);
        expect(validatePaymentMethods(['cash'])).toBe(true);
        expect(validatePaymentMethods(['cash', 'credit', 'debit'])).toBe(true);

        expect(validatePaymentMethods('not-array')).toBe(false);
        expect(validatePaymentMethods([])).toBe(false); // Empty array not allowed
        expect(validatePaymentMethods(['invalid'])).toBe(false);
        expect(validatePaymentMethods(['cash', 'invalid'])).toBe(false);
      });
    });

    describe('hasPaymentMethodFiltering', () => {
      it('should detect when payment method filtering is active', () => {
        expect(
          hasPaymentMethodFiltering({
            id: 1,
            name: 'Test',
            payment_methods: ['cash'],
          })
        ).toBe(true);

        expect(
          hasPaymentMethodFiltering({
            id: 1,
            name: 'Test',
            payment_methods: null,
          })
        ).toBe(false);

        expect(
          hasPaymentMethodFiltering({
            id: 1,
            name: 'Test',
            payment_methods: undefined,
          })
        ).toBe(false);

        expect(
          hasPaymentMethodFiltering({
            id: 1,
            name: 'Test',
          })
        ).toBe(false);
      });
    });
  });

  describe('Constants', () => {
    it('should have correct payment method constants', () => {
      expect(VALID_PAYMENT_METHODS).toEqual(['cash', 'credit', 'debit']);
      expect(PAYMENT_METHOD_LABELS).toEqual({
        cash: 'Efectivo',
        credit: 'Crédito',
        debit: 'Débito',
      });
    });
  });

  describe('Type compatibility', () => {
    it('should be compatible with existing PaymentMethod usage', () => {
      const method: PaymentMethod = 'cash';
      expect(VALID_PAYMENT_METHODS.includes(method)).toBe(true);
    });

    it('should work with array operations', () => {
      const methods: PaymentMethod[] = ['cash', 'credit'];
      const filtered = methods.filter((m) => m !== 'debit');
      expect(filtered).toEqual(['cash', 'credit']);
    });
  });
});
