import { z } from 'zod';

// ---------------------------------------------------------------------------
// AI Provider protocol enum
// ---------------------------------------------------------------------------

/**
 * `anthropic` — Anthropic Messages API (Anthropic directo, o cualquier endpoint
 *              compatible como Moonshot/Kimi `.../anthropic`).
 * `openai`    — OpenAI-compatible chat completions API (DeepSeek, Ollama,
 *              LM Studio, OpenAI).
 */
export type AIProviderProtocol = 'anthropic' | 'openai';

export const AIProviderProtocolEnum = z.enum(['anthropic', 'openai']);

export const AI_PROVIDER_PROTOCOLS: AIProviderProtocol[] = [
  'anthropic',
  'openai',
];

// ---------------------------------------------------------------------------
// Provider model (DB row)
// ---------------------------------------------------------------------------

export interface AIProvider {
  id: string;
  name: string;
  protocol: AIProviderProtocol;
  base_url: string;
  api_key: string;
  model: string;
  /** Modelo con capacidades de visión (ej: gpt-4o, claude-3-5-sonnet). Vacío = usar `model`. */
  vision_model: string;
  enable_thinking: boolean;
  max_tokens: number;
  max_tool_calls: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Provider shape returned to the client. The API key is never exposed: we send
 * a masked tail plus a boolean so the UI can show "configured" vs "empty".
 */
export interface AIProviderClient {
  id: string;
  name: string;
  protocol: AIProviderProtocol;
  base_url: string;
  has_api_key: boolean;
  api_key_masked: string;
  model: string;
  vision_model: string;
  enable_thinking: boolean;
  max_tokens: number;
  max_tool_calls: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Validation schemas (for API requests)
// ---------------------------------------------------------------------------

export const CreateAIProviderSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(200, 'El nombre es demasiado largo'),
  protocol: AIProviderProtocolEnum,
  base_url: z
    .string()
    .max(1000, 'La URL es demasiado larga')
    .optional()
    .default(''),
  api_key: z
    .string()
    .max(1000, 'La API key es demasiado larga')
    .optional()
    .default(''),
  model: z
    .string()
    .min(1, 'El modelo es obligatorio')
    .max(300, 'El modelo es demasiado largo'),
  vision_model: z
    .string()
    .max(300, 'El modelo de visión es demasiado largo')
    .optional()
    .default(''),
  enable_thinking: z.boolean().optional().default(false),
  max_tokens: z.number().int().min(1).max(200000).optional().default(4096),
  max_tool_calls: z.number().int().min(1).max(50).optional().default(10),
});

// Partial update schema WITHOUT defaults: an omitted field means "keep the
// existing value" (the PATCH route merges with the current row), whereas an
// explicitly sent `base_url: ''` clears it.
export const UpdateAIProviderSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(200).optional(),
  protocol: AIProviderProtocolEnum.optional(),
  base_url: z.string().max(1000, 'La URL es demasiado larga').optional(),
  api_key: z.string().max(1000, 'La API key es demasiado larga').optional(),
  model: z.string().min(1, 'El modelo es obligatorio').max(300).optional(),
  vision_model: z
    .string()
    .max(300, 'El modelo de visión es demasiado largo')
    .optional(),
  enable_thinking: z.boolean().optional(),
  max_tokens: z.number().int().min(1).max(200000).optional(),
  max_tool_calls: z.number().int().min(1).max(50).optional(),
});

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

export interface AIProviderListResponse {
  providers: AIProviderClient[];
}

export interface AIProviderOperationResult {
  provider: AIProviderClient;
}

export interface AIProviderTestResult {
  ok: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Labels / helpers
// ---------------------------------------------------------------------------

export const AI_PROVIDER_PROTOCOL_LABELS: Record<AIProviderProtocol, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
};

/** Mask an API key for display: keep only the last 4 characters. */
export function maskApiKey(apiKey: string): string {
  const key = apiKey || '';
  if (!key) return '';
  if (key.length <= 4) return '••••';
  return `••••${key.slice(-4)}`;
}

export const AI_PROVIDER_ERROR_MESSAGES = {
  NOT_FOUND: 'El proveedor de IA especificado no existe',
  NAME_REQUIRED: 'El nombre es obligatorio',
  PROTOCOL_INVALID: 'El protocolo debe ser "anthropic" u "openai"',
  MODEL_REQUIRED: 'El modelo es obligatorio',
  CREATE_SUCCESS: 'Proveedor de IA creado correctamente',
  UPDATE_SUCCESS: 'Proveedor de IA actualizado correctamente',
  DELETE_SUCCESS: 'Proveedor de IA eliminado correctamente',
  ACTIVATED: 'Proveedor activado correctamente',
} as const;
