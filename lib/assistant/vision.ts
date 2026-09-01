import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { z } from 'zod';
import type { ProviderConfig } from './providers';

/**
 * Vision runner — receipt scanning.
 *
 * Single-shot image + text call against the active provider's vision model
 * (`vision_model` from the provider config, falling back to the main `model`).
 * Unlike the chat runners this does NOT use tool calls: the model is asked to
 * answer with a single JSON object that we validate with zod.
 *
 * Supported protocols:
 *  - `openai`    — `image_url` content part with a base64 data URL.
 *  - `anthropic` — `image` content block with a base64 source.
 */

// ---------------------------------------------------------------------------
// Response schema (what the model must produce)
// ---------------------------------------------------------------------------

export const ReceiptLineItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive().nullable().optional(),
  unit: z.string().nullable().optional(),
  amount: z.number().nonnegative(),
});

export const SuggestedSubgroupSchema = z.object({
  name: z.string().min(1),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        default_unit: z.string().nullable().optional(),
      })
    )
    .default([]),
});

export const ReceiptScanResultSchema = z.object({
  store_name: z.string().nullable().optional(),
  /** Fecha del recibo en formato YYYY-MM-DD (o null si no se lee). */
  date: z.string().nullable().optional(),
  /** Total pagado (monto del gasto). */
  amount: z.number().positive(),
  description: z.string().nullable().optional(),
  payment_method: z
    .enum(['cash', 'credit', 'debit'])
    .nullable()
    .optional(),
  /** true cuando la factura muestra monto entregado + cambio devuelto (efectivo). */
  cash_change_detected: z.boolean().optional().default(false),
  /** Últimos 4 dígitos de la tarjeta si la factura los muestra (pago con tarjeta). */
  card_last_four: z.string().nullable().optional(),
  /** Detalle de la factura (líneas). */
  line_items: z.array(ReceiptLineItemSchema).default([]),
  /** Categoría de presupuesto sugerida (id de una categoría provista). */
  suggested_category_id: z.string().nullable().optional(),
  /** Subcategorías/ítems del catálogo que habría que crear para este recibo. */
  suggested_subgroups: z.array(SuggestedSubgroupSchema).default([]),
});

export type ReceiptScanResult = z.infer<typeof ReceiptScanResultSchema>;
export type ReceiptLineItem = z.infer<typeof ReceiptLineItemSchema>;
export type SuggestedSubgroup = z.infer<typeof SuggestedSubgroupSchema>;

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface ReceiptScanInput {
  /** Base64 (sin prefijo data:) de la imagen del recibo. */
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Categorías de presupuesto disponibles, para que el modelo sugiera una. */
  categories: { id: string; name: string }[];
  /** Últimos 4 dígitos de las tarjetas de crédito activas. */
  creditCardsLastFour?: string[];
}

export type ReceiptScanOutcome =
  | { ok: true; result: ReceiptScanResult }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildPrompt(input: ReceiptScanInput): string {
  const categoriesBlock =
    input.categories.length > 0
      ? input.categories
          .map((c) => `- ${c.id} → ${c.name}`)
          .join('\n')
      : '(no se proveyeron categorías)';

  const cardsBlock =
    input.creditCardsLastFour && input.creditCardsLastFour.length > 0
      ? input.creditCardsLastFour.join(', ')
      : '(ninguna)';

  return `Eres un extractor de recibos. Analiza la imagen y responde SOLO con JSON válido (sin markdown, sin texto extra).

Reglas:
- store_name: comercio (o null).
- date: fecha "YYYY-MM-DD" (o null).
- amount: total pagado, número sin formato (ej 45250.5). Si hay monto entregado + cambio, usa el entregado.
- description: resumen corto (ej "Compra en Éxito: mercado").
- payment_method: "cash" si efectivo (dice EFECTIVO o muestra cambio/vueltas); "debit" si dice DÉBITO; "credit" si dice CRÉDITO o muestra marca de tarjeta + últimos 4 dígitos; null si no hay evidencia.
- cash_change_detected: true solo si se ve monto entregado + cambio devuelto.
- card_last_four: últimos 4 dígitos de la tarjeta si aparecen; sino null.
- line_items: líneas del detalle como {name, quantity (o null), unit (o null), amount}. FUSIONA repetidas sumando quantity (ej 2x "Leche" → {name:"Leche", quantity:2, amount: suma}). Ignora descuentos, IVA, subtotales y totales. Máximo 30 líneas.
- suggested_category_id: id de la categoría que mejor calza (lista abajo) o null.
- suggested_subgroups: subcategorías nuevas necesarias para registrar el detalle, cada una con items [{name, default_unit|null}]. Máximo 4 subgrupos y 15 ítems en total. [] si no hacen falta.

Categorías disponibles:
${categoriesBlock}
Tarjetas activas (últimos 4): ${cardsBlock}
Si card_last_four coincide con una, devolvela igual (la app la pre-selecciona).

JSON:
{"store_name":..., "date":..., "amount":..., "description":..., "payment_method":..., "cash_change_detected":..., "card_last_four":..., "line_items":[...], "suggested_category_id":..., "suggested_subgroups":[...]}`;
}

// ---------------------------------------------------------------------------
// Loose JSON parsing + normalization
// ---------------------------------------------------------------------------

/** Extract the first JSON object from a model reply (tolerates code fences, prose). */
export function extractJsonObject(raw: string): unknown | null {
  const text = raw.trim();
  // Strip markdown code fences if present.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  const start = candidate.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const slice = candidate.slice(start, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

const NUMBER_KEYS = new Set(['amount', 'quantity']);

function normalizeNode(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(normalizeNode);
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      let v = normalizeNode(value);
      if (NUMBER_KEYS.has(key) && typeof v === 'string') {
        const cleaned = v.replace(/[^\d.,-]/g, '').replace(/\.(?=.*\.)/g, '');
        const num = parseFloat(cleaned.replace(',', '.'));
        if (!Number.isNaN(num)) v = num;
      }
      if (key === 'date' && typeof v === 'string') {
        const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) {
          v = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        }
      }
      out[key] = v;
    }
    return out;
  }
  return node;
}

function validateResult(parsed: unknown): ReceiptScanResult | null {
  const normalized = normalizeNode(parsed);
  const result = ReceiptScanResultSchema.safeParse(normalized);
  if (!result.success) return null;
  return result.data;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export async function analyzeReceiptImage(
  config: ProviderConfig,
  input: ReceiptScanInput
): Promise<ReceiptScanOutcome> {
  const model = config.visionModel || config.model;
  const prompt = buildPrompt(input);

  let raw: string;

  try {
    if (config.protocol === 'openai') {
      raw = await runOpenAIVision(config, model, prompt, input);
    } else {
      raw = await runAnthropicVision(config, model, prompt, input);
    }
  } catch (err) {
    const message = (err as Error).message;
    // Map the most common "this model has no vision" style errors.
    if (/image|vision|multimodal|content type/i.test(message)) {
      return {
        ok: false,
        error: `El modelo "${model}" no pudo procesar la imagen (¿soporta visión?). Detalle: ${message}`,
      };
    }
    return { ok: false, error: message };
  }

  if (!raw || !raw.trim()) {
    return { ok: false, error: 'El modelo no devolvió ninguna respuesta' };
  }

  const parsed = extractJsonObject(raw);
  if (parsed === null) {
    return {
      ok: false,
      error: `No se pudo interpretar la respuesta del modelo como JSON. Respuesta cruda: ${raw.slice(0, 500)}`,
    };
  }

  const result = validateResult(parsed);
  if (!result) {
    return {
      ok: false,
      error: `La respuesta del modelo no cumple el esquema esperado. Respuesta cruda: ${raw.slice(0, 500)}`,
    };
  }

  return { ok: true, result };
}

async function runOpenAIVision(
  config: ProviderConfig,
  model: string,
  prompt: string,
  input: ReceiptScanInput
): Promise<string> {
  const client = new OpenAI({
    apiKey: config.apiKey || 'not-needed',
    ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
  });

  const completion = await client.chat.completions.create({
    model,
    max_tokens: config.maxTokens,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${input.mimeType};base64,${input.imageBase64}`,
              // Auto: deja que el proveedor decida el detalle; reduce tokens de
              // visión en imágenes grandes (ignorado por endpoints sin soporte).
              detail: 'auto',
            },
          },
        ],
      },
    ],
  });

  return completion.choices[0]?.message?.content || '';
}

async function runAnthropicVision(
  config: ProviderConfig,
  model: string,
  prompt: string,
  input: ReceiptScanInput
): Promise<string> {
  if (!config.apiKey) {
    throw new Error(
      'El proveedor activo no tiene API key configurada. Agrégalo en la configuración de proveedores.'
    );
  }

  const client = new Anthropic({
    apiKey: config.apiKey,
    ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
  });

  const response = await client.messages.create({
    model,
    max_tokens: config.maxTokens,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: input.mimeType,
              data: input.imageBase64,
            },
          },
        ],
      },
    ],
  });

  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );
  return textBlocks.map((block) => block.text).join('\n');
}
