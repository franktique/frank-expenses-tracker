import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { AIProviderProtocolEnum } from '@/types/ai-providers';

/**
 * POST /api/ai-providers/test
 *
 * Body: { protocol: 'anthropic'|'openai', base_url?: string, api_key?: string,
 *         model: string }
 *
 * Makes a minimal non-streaming call (max_tokens=1) to verify the endpoint, key
 * and model are reachable. Returns { ok: true } or { ok: false, error }.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TEST_TIMEOUT_MS = 15000;

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const protocol = body.protocol;
  const model = (body.model as string)?.trim();
  const baseUrl = (body.base_url as string)?.trim() || '';
  const apiKey = (body.api_key as string)?.trim() || '';

  const protocolCheck = AIProviderProtocolEnum.safeParse(protocol);
  if (!protocolCheck.success) {
    return NextResponse.json(
      { ok: false, error: 'El protocolo debe ser "anthropic" u "openai"' },
      { status: 400 }
    );
  }
  if (!model) {
    return NextResponse.json(
      { ok: false, error: 'El modelo es obligatorio' },
      { status: 400 }
    );
  }

  const signal = AbortSignal.timeout(TEST_TIMEOUT_MS);

  try {
    if (protocol === 'anthropic') {
      if (!apiKey) {
        return NextResponse.json(
          { ok: false, error: 'La API key es obligatoria para Anthropic' },
          { status: 400 }
        );
      }
      const client = new Anthropic({
        apiKey,
        ...(baseUrl ? { baseURL: baseUrl } : {}),
      });
      await client.messages.create(
        {
          model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        },
        { signal }
      );
    } else {
      const client = new OpenAI({
        apiKey: apiKey || 'not-needed',
        ...(baseUrl ? { baseURL: baseUrl } : {}),
      });
      await client.chat.completions.create(
        {
          model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        },
        { signal }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      (err as Error)?.name === 'TimeoutError' ||
      (err as Error)?.name === 'AbortError'
        ? 'La conexión superó el tiempo límite'
        : (err as Error).message;
    return NextResponse.json({ ok: false, error: message });
  }
}
