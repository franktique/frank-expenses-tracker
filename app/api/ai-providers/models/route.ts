import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@/lib/db';

/**
 * POST /api/ai-providers/models
 *
 * Body: { base_url?: string, api_key?: string, provider_id?: string }
 *
 * Descubre los modelos disponibles en la API de Anthropic (GET /v1/models) para
 * poblar los dropdowns de modelo de chat y de visión. Si no llega `api_key` y sí
 * `provider_id`, usa la key guardada (la key nunca sale del servidor).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 15000;

export interface DiscoveredModel {
  id: string;
  display_name: string;
  /** true/false si la API informa la capacidad; null si no se sabe. */
  vision: boolean | null;
  max_tokens: number | null;
}

type RawModel = {
  id: string;
  display_name?: string;
  max_tokens?: number | null;
  capabilities?: { image_input?: { supported?: boolean } | null } | null;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const baseUrl = ((body.base_url as string) || '').trim();
  let apiKey = ((body.api_key as string) || '').trim();

  try {
    if (!apiKey && typeof body.provider_id === 'string') {
      const rows = await sql`
        SELECT api_key FROM ai_providers WHERE id = ${body.provider_id} LIMIT 1
      `;
      apiKey = ((rows[0]?.api_key as string) || '').trim();
    }
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: 'Ingresa la API key para listar los modelos' },
        { status: 400 }
      );
    }

    const client = new Anthropic({
      apiKey,
      ...(baseUrl ? { baseURL: baseUrl } : {}),
    });

    const models: DiscoveredModel[] = [];
    const page = client.models.list(
      { limit: 100 },
      { signal: AbortSignal.timeout(TIMEOUT_MS) }
    );
    for await (const m of page) {
      const raw = m as unknown as RawModel;
      const image = raw.capabilities?.image_input;
      models.push({
        id: raw.id,
        display_name: raw.display_name || raw.id,
        vision: image ? image.supported === true : null,
        max_tokens: raw.max_tokens ?? null,
      });
    }

    return NextResponse.json({ ok: true, models });
  } catch (err) {
    const name = (err as Error)?.name;
    return NextResponse.json({
      ok: false,
      error:
        name === 'TimeoutError' || name === 'AbortError'
          ? 'La consulta superó el tiempo límite'
          : (err as Error).message,
    });
  }
}
