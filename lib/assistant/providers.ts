import { sql } from '@/lib/db';
import { maskApiKey, type AIProviderProtocol } from '@/types/ai-providers';

/**
 * Provider configuration resolution.
 *
 * The assistant now reads its active provider from the `ai_providers` table
 * (hot-swappable: changing the active provider takes effect on the next
 * message, no restart required). When no provider is active in the DB — e.g.
 * the migration hasn't been run yet, or the user hasn't configured one — it
 * falls back to the legacy `ANTHROPIC_*` / `ASSISTANT_*` environment variables
 * so existing setups keep working.
 */

export interface ProviderConfig {
  id?: string;
  name?: string;
  protocol: AIProviderProtocol;
  baseUrl: string;
  apiKey: string;
  model: string;
  enableThinking: boolean;
  maxTokens: number;
  maxToolCalls: number;
}

export const DEFAULT_MAX_TOKENS = 4096;
export const DEFAULT_MAX_TOOL_CALLS = 10;
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-6';

function resolveEnvThinking(): boolean {
  const override = process.env.ASSISTANT_ENABLE_THINKING;
  if (override === 'true') return true;
  if (override === 'false') return false;
  // Default: only request extended thinking against Anthropic's own endpoint.
  return !process.env.ANTHROPIC_BASE_URL;
}

function envFallbackConfig(): ProviderConfig | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  return {
    name: 'Anthropic (.env)',
    protocol: 'anthropic',
    baseUrl: process.env.ANTHROPIC_BASE_URL || '',
    apiKey,
    model: process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL,
    enableThinking: resolveEnvThinking(),
    maxTokens: Number(process.env.ASSISTANT_MAX_TOKENS) || DEFAULT_MAX_TOKENS,
    maxToolCalls:
      Number(process.env.ASSISTANT_MAX_TOOL_CALLS) || DEFAULT_MAX_TOOL_CALLS,
  };
}

function rowToConfig(row: Record<string, unknown>): ProviderConfig {
  return {
    id: row.id as string,
    name: row.name as string,
    protocol: row.protocol as AIProviderProtocol,
    baseUrl: (row.base_url as string) || '',
    apiKey: (row.api_key as string) || '',
    model: row.model as string,
    enableThinking: (row.enable_thinking as boolean) === true,
    maxTokens: Number(row.max_tokens) || DEFAULT_MAX_TOKENS,
    maxToolCalls: Number(row.max_tool_calls) || DEFAULT_MAX_TOOL_CALLS,
  };
}

/**
 * Resolve the provider to use for the next assistant turn.
 *
 * Reads from the DB on every call so provider changes are picked up in
 * "caliente" (per request). Falls back to env when there is no active provider
 * or the table does not exist yet.
 */
export async function getActiveProvider(): Promise<ProviderConfig | null> {
  try {
    const rows = await sql`
      SELECT id, name, protocol, base_url, api_key, model,
             enable_thinking, max_tokens, max_tool_calls
      FROM ai_providers
      WHERE is_active = true
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    if (rows.length > 0) {
      return rowToConfig(rows[0] as Record<string, unknown>);
    }
  } catch (err) {
    // Migration may not have run yet, or the DB is unavailable. Fall through to
    // env so the assistant can still work in a legacy configuration.
    console.warn(
      'getActiveProvider: DB lookup failed, falling back to .env:',
      (err as Error).message
    );
  }

  return envFallbackConfig();
}

/**
 * Map a raw `ai_providers` row to the client-safe shape (API key masked, never
 * exposed). Shared by the list/detail API routes.
 */
export function toClientProvider(row: Record<string, unknown>) {
  const apiKey = (row.api_key as string) || '';
  return {
    id: row.id as string,
    name: row.name as string,
    protocol: row.protocol as AIProviderProtocol,
    base_url: (row.base_url as string) || '',
    has_api_key: !!apiKey,
    api_key_masked: maskApiKey(apiKey),
    model: row.model as string,
    enable_thinking: (row.enable_thinking as boolean) === true,
    max_tokens: Number(row.max_tokens) || DEFAULT_MAX_TOKENS,
    max_tool_calls: Number(row.max_tool_calls) || DEFAULT_MAX_TOOL_CALLS,
    is_active: (row.is_active as boolean) === true,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
