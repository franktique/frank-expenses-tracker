import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { toClientProvider } from '@/lib/assistant/providers';
import {
  UpdateAIProviderSchema,
  AI_PROVIDER_ERROR_MESSAGES,
} from '@/types/ai-providers';

/**
 * PATCH  /api/ai-providers/[id] — update fields (omitted fields are preserved)
 * DELETE /api/ai-providers/[id] — delete a provider
 */

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const validation = UpdateAIProviderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error:
            validation.error.issues[0]?.message ??
            'Datos inválidos para actualizar el proveedor',
        },
        { status: 400 }
      );
    }

    const [existing] = await sql`
      SELECT name, protocol, base_url, api_key, model, vision_model,
             enable_thinking, max_tokens, max_tool_calls
      FROM ai_providers WHERE id = ${id}
    `;

    if (!existing) {
      return NextResponse.json(
        { error: AI_PROVIDER_ERROR_MESSAGES.NOT_FOUND },
        { status: 404 }
      );
    }

    const data = validation.data;
    // api_key is special: an omitted/empty value keeps the stored key so the UI
    // can show a blank "sin cambios" field without clobbering it.
    const apiKey =
      data.api_key !== undefined && data.api_key !== ''
        ? data.api_key
        : (existing.api_key as string);

    const merged = {
      name: data.name ?? existing.name,
      protocol: data.protocol ?? existing.protocol,
      base_url: data.base_url ?? existing.base_url,
      api_key: apiKey,
      model: data.model ?? existing.model,
      vision_model: data.vision_model ?? existing.vision_model,
      enable_thinking: data.enable_thinking ?? existing.enable_thinking,
      max_tokens: data.max_tokens ?? existing.max_tokens,
      max_tool_calls: data.max_tool_calls ?? existing.max_tool_calls,
    };

    const [updated] = await sql`
      UPDATE ai_providers
      SET name = ${merged.name},
          protocol = ${merged.protocol},
          base_url = ${merged.base_url},
          api_key = ${merged.api_key},
          model = ${merged.model},
          vision_model = ${merged.vision_model},
          enable_thinking = ${merged.enable_thinking},
          max_tokens = ${merged.max_tokens},
          max_tool_calls = ${merged.max_tool_calls},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, protocol, base_url, api_key, model, vision_model,
                enable_thinking, max_tokens, max_tool_calls, is_active,
                created_at, updated_at
    `;

    return NextResponse.json({ provider: toClientProvider(updated as any) });
  } catch (error) {
    console.error('Error updating AI provider:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const [deleted] = await sql`
      DELETE FROM ai_providers WHERE id = ${id} RETURNING id
    `;

    if (!deleted) {
      return NextResponse.json(
        { error: AI_PROVIDER_ERROR_MESSAGES.NOT_FOUND },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting AI provider:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
