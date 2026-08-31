import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { toClientProvider } from '@/lib/assistant/providers';
import { AI_PROVIDER_ERROR_MESSAGES } from '@/types/ai-providers';

/**
 * POST /api/ai-providers/[id]/activate
 *
 * Sets this provider as the single active one (clearing any previous active
 * flag). The assistant resolves the active provider on every turn, so this
 * takes effect on the next message without a restart.
 */

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const [existing] = await sql`SELECT id FROM ai_providers WHERE id = ${id}`;
    if (!existing) {
      return NextResponse.json(
        { error: AI_PROVIDER_ERROR_MESSAGES.NOT_FOUND },
        { status: 404 }
      );
    }

    await sql`BEGIN`;
    try {
      await sql`UPDATE ai_providers SET is_active = false WHERE is_active = true`;
      const [activated] = await sql`
        UPDATE ai_providers
        SET is_active = true, updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, name, protocol, base_url, api_key, model, vision_model,
                  enable_thinking, max_tokens, max_tool_calls, is_active,
                  created_at, updated_at
      `;
      await sql`COMMIT`;

      return NextResponse.json({
        provider: toClientProvider(activated as any),
      });
    } catch (err) {
      await sql`ROLLBACK`;
      throw err;
    }
  } catch (error) {
    console.error('Error activating AI provider:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
