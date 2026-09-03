/**
 * @jest-environment node
 */

import {
  analyzeReceiptImage,
  extractJsonObject,
  ReceiptScanResultSchema,
} from '@/lib/assistant/vision';
import type { ProviderConfig } from '@/lib/assistant/providers';

const mockOpenAICreate = jest.fn();
const mockAnthropicCreate = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockOpenAICreate } },
  }));
});

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockAnthropicCreate },
  }));
});

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

describe('vision — analyzeReceiptImage truncation handling', () => {
  const input = {
    images: [{ imageBase64: 'abc', mimeType: 'image/jpeg' as const }],
    categories: [],
  };

  const openAIConfig: ProviderConfig = {
    protocol: 'openai',
    baseUrl: '',
    apiKey: 'test-key',
    model: 'gpt-4o',
    visionModel: 'gpt-4o',
    enableThinking: false,
    maxTokens: 4096,
    maxToolCalls: 10,
  };

  const anthropicConfig: ProviderConfig = {
    protocol: 'anthropic',
    baseUrl: '',
    apiKey: 'test-key',
    model: 'claude-sonnet-4-6',
    visionModel: '',
    enableThinking: false,
    maxTokens: 4096,
    maxToolCalls: 10,
  };

  afterEach(() => {
    mockOpenAICreate.mockReset();
    mockAnthropicCreate.mockReset();
  });

  it('reports a truncation-specific error when OpenAI cuts the response at max_tokens', async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [
        {
          // Recibo largo: el JSON queda a mitad de camino.
          message: { content: '{"amount": 100, "line_items": [{"name": "Leche"' },
          finish_reason: 'length',
        },
      ],
    });

    const outcome = await analyzeReceiptImage(openAIConfig, input);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error).toContain('se truncó');
    }
  });

  it('reports a truncation-specific error when Anthropic stops at max_tokens', async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '{"amount": 100, "line_items": [{"name": "Leche"',
        },
      ],
      stop_reason: 'max_tokens',
    });

    const outcome = await analyzeReceiptImage(anthropicConfig, input);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error).toContain('se truncó');
    }
  });

  it('still reports the generic JSON error when parsing fails without truncation', async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [
        { message: { content: 'no es json' }, finish_reason: 'stop' },
      ],
    });

    const outcome = await analyzeReceiptImage(openAIConfig, input);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error).not.toContain('se truncó');
      expect(outcome.error).toContain('No se pudo interpretar');
    }
  });
});
