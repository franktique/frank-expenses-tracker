import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { toClientProvider } from '@/lib/assistant/providers';
import {
  CreateAIProviderSchema,
  AI_PROVIDER_ERROR_MESSAGES,
} from '@/types/ai-providers';

/**
 * GET  /api/ai-providers — list all providers (API keys masked)
 * POST /api/ai-providers — create a provider
 */

export async function GET() {
  try {
    const rows = await sql`
      SELECT id, name, protocol, base_url, api_key, model, vision_model,
             enable_thinking, max_tokens, max_tool_calls, is_active,
             created_at, updated_at
      FROM ai_providers
      ORDER BY created_at ASC
    `;
    return NextResponse.json({
      providers: (rows as any[]).map(toClientProvider),
    });
  } catch (error) {
    console.error('Error listing AI providers:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const validation = CreateAIProviderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error:
            validation.error.issues[0]?.message ??
            AI_PROVIDER_ERROR_MESSAGES.NAME_REQUIRED,
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    const id = crypto.randomUUID();

    const [created] = await sql`
      INSERT INTO ai_providers (
        id, name, protocol, base_url, api_key, model, vision_model,
        enable_thinking, max_tokens, max_tool_calls, is_active
      )
      VALUES (
        ${id}, ${data.name}, ${data.protocol}, ${data.base_url}, ${data.api_key},
        ${data.model}, ${data.vision_model}, ${data.enable_thinking},
        ${data.max_tokens}, ${data.max_tool_calls}, false
      )
      RETURNING id, name, protocol, base_url, api_key, model, vision_model,
                enable_thinking, max_tokens, max_tool_calls, is_active,
                created_at, updated_at
    `;

    return NextResponse.json(
      { provider: toClientProvider(created as any) },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating AI provider:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
