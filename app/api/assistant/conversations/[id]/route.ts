import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { ConversationWithMessages } from '@/types/assistant';

/**
 * GET    /api/assistant/conversations/[id] — conversation with all messages
 * PATCH  /api/assistant/conversations/[id] — rename (update title)
 * DELETE /api/assistant/conversations/[id] — delete (cascades to messages)
 */

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const [conversation] = await sql`
      SELECT id, title, created_at, updated_at
      FROM assistant_conversations WHERE id = ${id}
    `;

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    const messages = await sql`
      SELECT id, conversation_id, role, content, tool_data, created_at
      FROM assistant_messages
      WHERE conversation_id = ${id}
      ORDER BY created_at ASC
    `;

    const result: ConversationWithMessages = {
      ...(conversation as any),
      messages: messages as any,
    };

    return NextResponse.json({ conversation: result });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const title = (body?.title as string)?.slice(0, 200);

    if (!title) {
      return NextResponse.json({ error: 'title requerido' }, { status: 400 });
    }

    const [updated] = await sql`
      UPDATE assistant_conversations
      SET title = ${title}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, title, created_at, updated_at
    `;

    if (!updated) {
      return NextResponse.json(
        { error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation: updated });
  } catch (error) {
    console.error('Error renaming conversation:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const [deleted] = await sql`
      DELETE FROM assistant_conversations
      WHERE id = ${id}
      RETURNING id
    `;

    if (!deleted) {
      return NextResponse.json(
        { error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
