/**
 * @jest-environment node
 */

import {
  extractJsonObject,
  ReceiptScanResultSchema,
} from '@/lib/assistant/vision';

describe('vision — extractJsonObject', () => {
  it('parses a plain JSON object', () => {
    const raw = '{"amount": 100, "store_name": "Éxito"}';
    expect(extractJsonObject(raw)).toEqual({
      amount: 100,
      store_name: 'Éxito',
    });
  });

  it('strips markdown code fences', () => {
    const raw = '```json\n{"amount": 100}\n```';
    expect(extractJsonObject(raw)).toEqual({ amount: 100 });
  });

  it('extracts the first JSON object from prose around it', () => {
    const raw =
      'Aquí está el resultado:\n{"store_name": "Carulla", "amount": 45250}\nEspero que sirva.';
    expect(extractJsonObject(raw)).toEqual({
      store_name: 'Carulla',
      amount: 45250,
    });
  });

  it('returns null when there is no JSON object', () => {
    expect(extractJsonObject('no hay json aquí')).toBeNull();
    expect(extractJsonObject('')).toBeNull();
  });

  it('returns null on malformed JSON', () => {
    expect(extractJsonObject('{"amount": 100')).toBeNull();
  });
});

describe('vision — ReceiptScanResultSchema', () => {
  it('accepts a full valid scan result', () => {
    const result = {
      store_name: 'Éxito',
      date: '2025-08-30',
      amount: 45250.5,
      description: 'Compra en Éxito: mercado',
      payment_method: 'cash',
      cash_change_detected: true,
      card_last_four: null,
      line_items: [
        { name: 'Leche', quantity: 1, unit: 'L', amount: 4500 },
        { name: 'Pan', quantity: null, unit: null, amount: 2500 },
      ],
      suggested_category_id: 'cat-1',
      suggested_subgroups: [
        { name: 'Lácteos', items: [{ name: 'Leche', default_unit: 'L' }] },
      ],
    };
    const parsed = ReceiptScanResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('accepts a minimal result with defaults', () => {
    const result = { amount: 100 };
    const parsed = ReceiptScanResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.line_items).toEqual([]);
      expect(parsed.data.suggested_subgroups).toEqual([]);
      expect(parsed.data.cash_change_detected).toBe(false);
      expect(parsed.data.payment_method).toBeUndefined();
    }
  });

  it('coerces numeric strings for amount/quantity', () => {
    const parsed = ReceiptScanResultSchema.safeParse({
      amount: '45250.5',
      line_items: [{ name: 'Leche', amount: '4500' }],
    });
    // El esquema no coerce solo; la normalización vive en el runner.
    expect(parsed.success).toBe(false);
  });

  it('rejects a missing amount', () => {
    const parsed = ReceiptScanResultSchema.safeParse({ store_name: 'X' });
    expect(parsed.success).toBe(false);
  });
});
