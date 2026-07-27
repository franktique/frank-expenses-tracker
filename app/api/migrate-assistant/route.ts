import { NextResponse } from 'next/server';
import { sql, testConnection } from '@/lib/db';

/**
 * API endpoint to migrate the database schema for the AI Assistant feature.
 *
 * Creates the assistant_conversations and assistant_messages tables.
 * Idempotent — safe to call multiple times.
 *
 * GET /api/migrate-assistant  (matches existing migration conventions)
 * POST /api/migrate-assistant
 */

async function runMigration() {
  const connectionTest = await testConnection();

  if (!connectionTest.connected) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Could not connect to the database: ' + connectionTest.error,
      },
      { status: 500 }
    );
  }

  await sql`
    CREATE TABLE IF NOT EXISTS assistant_conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Nueva conversación',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS assistant_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES assistant_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
      content TEXT,
      tool_data JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_assistant_messages_conversation
    ON assistant_messages(conversation_id, created_at)
  `;

  return NextResponse.json({
    success: true,
    message: 'Assistant tables ready',
    details: {
      tables: ['assistant_conversations', 'assistant_messages'],
      index: 'idx_assistant_messages_conversation',
    },
  });
}

export async function GET() {
  try {
    return await runMigration();
  } catch (error) {
    console.error('Assistant migration failed:', error);
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
