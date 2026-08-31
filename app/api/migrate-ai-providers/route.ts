import { NextResponse } from 'next/server';
import { sql, testConnection } from '@/lib/db';

/**
 * API endpoint to migrate the database schema for the AI Providers feature.
 *
 * Creates the ai_providers table used to persist LLM provider configuration
 * (Anthropic, DeepSeek, Kimi K3, Ollama, LM Studio) instead of reading .env.
 * Idempotent — safe to call multiple times.
 *
 * GET  /api/migrate-ai-providers
 * POST /api/migrate-ai-providers
 */

async function runMigration() {
  const connectionTest = await testConnection();

  if (!connectionTest.connected) {
    return NextResponse.json(
      {
        success: false,
        message: 'Could not connect to the database: ' + connectionTest.error,
      },
      { status: 500 }
    );
  }

  await sql`
    CREATE TABLE IF NOT EXISTS ai_providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      protocol TEXT NOT NULL CHECK (protocol IN ('anthropic', 'openai')),
      base_url TEXT NOT NULL DEFAULT '',
      api_key TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL,
      vision_model TEXT NOT NULL DEFAULT '',
      enable_thinking BOOLEAN NOT NULL DEFAULT false,
      max_tokens INTEGER NOT NULL DEFAULT 4096,
      max_tool_calls INTEGER NOT NULL DEFAULT 10,
      is_active BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_ai_providers_active
    ON ai_providers(is_active)
  `;

  // Idempotent: add vision_model to tables created before this column existed.
  await sql`
    ALTER TABLE ai_providers
    ADD COLUMN IF NOT EXISTS vision_model TEXT NOT NULL DEFAULT ''
  `;

  return NextResponse.json({
    success: true,
    message: 'AI providers table ready',
    details: {
      tables: ['ai_providers'],
      index: 'idx_ai_providers_active',
      column: 'vision_model',
    },
  });
}

export async function GET() {
  try {
    return await runMigration();
  } catch (error) {
    console.error('AI providers migration failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Migration failed: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
