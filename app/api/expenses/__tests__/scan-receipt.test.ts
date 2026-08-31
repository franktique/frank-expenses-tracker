/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../scan-receipt/route';
import { getActiveProvider } from '@/lib/assistant/providers';
import { analyzeReceiptImage } from '@/lib/assistant/vision';

// Mock dependencies
jest.mock('@/lib/assistant/providers', () => ({
  getActiveProvider: jest.fn(),
}));

jest.mock('@/lib/assistant/vision', () => ({
  analyzeReceiptImage: jest.fn(),
}));

const mockGetActiveProvider = getActiveProvider as jest.MockedFunction<
  typeof getActiveProvider
>;
const mockAnalyzeReceiptImage = analyzeReceiptImage as jest.MockedFunction<
  typeof analyzeReceiptImage
>;

const VALID_IMAGE = 'a'.repeat(200); // base64 dummy

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/expenses/scan-receipt', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/expenses/scan-receipt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveProvider.mockResolvedValue({
      protocol: 'openai',
      baseUrl: '',
      apiKey: 'test-key',
      model: 'gpt-4o',
      visionModel: 'gpt-4o',
      enableThinking: false,
      maxTokens: 4096,
      maxToolCalls: 10,
    });
  });

  it('rejects a missing/invalid body', async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it('rejects an unsupported mime type', async () => {
    const response = await POST(
      makeRequest({ image_base64: VALID_IMAGE, mime_type: 'image/gif' })
    );
    expect(response.status).toBe(400);
  });

  it('returns 400 when there is no active provider', async () => {
    mockGetActiveProvider.mockResolvedValue(null);
    const response = await POST(
      makeRequest({ image_base64: VALID_IMAGE, mime_type: 'image/jpeg' })
    );
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('No hay proveedor de IA activo');
  });

  it('returns 502 when the vision model fails', async () => {
    mockAnalyzeReceiptImage.mockResolvedValue({
      ok: false,
      error: 'El modelo no soporta imágenes',
    });
    const response = await POST(
      makeRequest({ image_base64: VALID_IMAGE, mime_type: 'image/jpeg' })
    );
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error).toContain('no soporta imágenes');
  });

  it('returns the scan result with 200', async () => {
    mockAnalyzeReceiptImage.mockResolvedValue({
      ok: true,
      result: {
        store_name: 'Éxito',
        date: '2025-08-30',
        amount: 45250,
        description: 'Compra en Éxito',
        payment_method: 'cash',
        cash_change_detected: true,
        card_last_four: null,
        line_items: [{ name: 'Leche', amount: 4500 }],
        suggested_category_id: 'cat-1',
        suggested_subgroups: [],
      },
    });

    const response = await POST(
      makeRequest({
        image_base64: VALID_IMAGE,
        mime_type: 'image/jpeg',
        categories: [{ id: 'cat-1', name: 'Mercado' }],
        credit_cards_last_four: ['1234'],
      })
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.result.store_name).toBe('Éxito');
    expect(data.result.amount).toBe(45250);

    // El proveedor activo recibe las categorías para sugerir
    expect(mockAnalyzeReceiptImage).toHaveBeenCalledWith(
      expect.objectContaining({ protocol: 'openai' }),
      expect.objectContaining({
        categories: [{ id: 'cat-1', name: 'Mercado' }],
        creditCardsLastFour: ['1234'],
      })
    );
  });
});
