import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { ConversationListItem } from '@/types/assistant';

/**
 * GET /api/assistant/conversations — list conversations with preview + counts.
 * POST /api/assistant/conversations — create a new conversation.
 */

export async function GET() {
  try {
    const rows = await sql`
      SELECT
        c.id, c.title, c.created_at, c.updated_at,
        (SELECT content FROM assistant_messages
          WHERE conversation_id = c.id
          ORDER BY created_at DESC LIMIT 1) AS last_message_preview,
        (SELECT MAX(created_at) FROM assistant_messages
          WHERE conversation_id = c.id) AS last_message_at,
        (SELECT COUNT(*) FROM assistant_messages
          WHERE conversation_id = c.id) AS message_count
      FROM assistant_conversations c
      ORDER BY c.updated_at DESC
    `;

    const items: ConversationListItem[] = (rows as any[]).map((r) => ({
      id: r.id,
      title: r.title,
      created_at: r.created_at,
      updated_at: r.updated_at,
      last_message_preview: r.last_message_preview
        ? String(r.last_message_preview).slice(0, 200)
        : null,
      last_message_at: r.last_message_at || r.updated_at,
      message_count: Number(r.message_count) || 0,
    }));

    return NextResponse.json({ conversations: items });
  } catch (error) {
    console.error('Error listing conversations:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = crypto.randomUUID();
    const title = (body?.title as string)?.slice(0, 200) || 'Nueva conversación';

    await sql`
      INSERT INTO assistant_conversations (id, title)
      VALUES (${id}, ${title})
    `;

    const [created] = await sql`
      SELECT id, title, created_at, updated_at FROM assistant_conversations WHERE id = ${id}
    `;

    return NextResponse.json({ conversation: created }, { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
