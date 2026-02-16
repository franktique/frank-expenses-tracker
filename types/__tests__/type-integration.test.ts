import { describe, it, expect } from '@jest/globals';

// Test that types can be imported from different modules without conflicts
describe('Type Integration', () => {
  it('should import PaymentMethod from estudios module', async () => {
    const { PaymentMethod, VALID_PAYMENT_METHODS } =
      await import('../estudios');
    expect(VALID_PAYMENT_METHODS).toEqual(['cash', 'credit', 'debit']);
  });

  it('should import PaymentMethod from funds module (re-export)', async () => {
    const { PaymentMethod, VALID_PAYMENT_METHODS } = await import('../funds');
    expect(VALID_PAYMENT_METHODS).toEqual(['cash', 'credit', 'debit']);
  });

  it('should import dashboard types with payment method support', async () => {
    const { DashboardGrouperResult, hasPaymentMethodFiltering } =
      await import('../dashboard');

    const mockFilter = {
      expense_payment_methods: ['cash'],
    };

    expect(hasPaymentMethodFiltering(mockFilter)).toBe(true);
  });

  it('should work with API response structures', async () => {
    const { EstudioGrouperResponse } = await import('../estudios');

    const mockResponse: EstudioGrouperResponse = {
      id: 1,
      name: 'Test Grouper',
      is_assigned: true,
      percentage: 75,
      payment_methods: ['cash', 'credit'],
    };

    expect(mockResponse.payment_methods).toEqual(['cash', 'credit']);
  });

  it('should validate update request structures', async () => {
    const { UpdateEstudioGrouperRequestSchema } = await import('../estudios');

    const validRequest = {
      percentage: 50,
      payment_methods: ['debit'],
    };

    const result = UpdateEstudioGrouperRequestSchema.parse(validRequest);
    expect(result).toEqual(validRequest);
  });
});
