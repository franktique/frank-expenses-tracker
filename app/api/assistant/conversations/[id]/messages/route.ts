import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { runAssistantTurn } from '@/lib/assistant/agent';
import type { AssistantMessage, StreamingEvent } from '@/types/assistant';

/**
 * POST /api/assistant/conversations/[id]/messages
 *
 * Body: { content: string }
 *
 * Appends the user message to the conversation, runs the agent, and streams
 * events back as newline-delimited JSON (NDJSON). On completion, the final
 * assistant message is persisted.
 *
 * Stream event shapes (each line is one JSON object):
 *   { "type": "message_start" }
 *   { "type": "text_delta", "payload": { "text": "..." } }
 *   { "type": "tool_call", "payload": { "tool": "...", "input": {...} } }
 *   { "type": "tool_result", "payload": { "tool": "...", "ok": true, "output": {...} } }
 *   { "type": "message_end", "payload": { "assistant_message_id": "..." } }
 *   { "type": "error", "payload": { "message": "..." } }
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function sendEvent(encoder: TextEncoder, event: StreamingEvent): Uint8Array {
  return encoder.encode(JSON.stringify(event) + '\n');
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id: conversationId } = await params;

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const content = (body?.content || '').trim();
  if (!content) {
    return Response.json({ error: 'content requerido' }, { status: 400 });
  }

  // Verify conversation exists
  const [conversation] = await sql`
    SELECT id, title FROM assistant_conversations WHERE id = ${conversationId}
  `;
  if (!conversation) {
    return Response.json(
      { error: 'Conversación no encontrada' },
      { status: 404 }
    );
  }

  // Persist the user message
  const userMessageId = crypto.randomUUID();
  await sql`
    INSERT INTO assistant_messages (id, conversation_id, role, content)
    VALUES (${userMessageId}, ${conversationId}, 'user', ${content})
  `;

  // Auto-title the conversation if it's still the default and this is the first user message
  if ((conversation as any).title === 'Nueva conversación') {
    const autoTitle = content.length > 50 ? content.slice(0, 47) + '…' : content;
    await sql`
      UPDATE assistant_conversations
      SET title = ${autoTitle}, updated_at = NOW()
      WHERE id = ${conversationId} AND title = 'Nueva conversación'
    `;
  }

  // Fetch full history (including the message we just inserted) for the agent
  const historyRows = await sql`
    SELECT id, conversation_id, role, content, tool_data, created_at
    FROM assistant_messages
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC
  `;
  const history = historyRows as unknown as AssistantMessage[];

  const encoder = new TextEncoder();
  const abortController = new AbortController();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(sendEvent(encoder, { type: 'message_start' }));

      let assistantText = '';
      try {
        for await (const event of runAssistantTurn({
          history: history.slice(0, -1), // exclude the just-added user message; agent adds it itself
          userMessage: content,
          abortController,
        })) {
          if (event.type === 'text_delta') {
            assistantText += event.text;
            controller.enqueue(
              sendEvent(encoder, {
                type: 'text_delta',
                payload: { text: event.text },
              })
            );
          } else if (event.type === 'tool_call') {
            controller.enqueue(
              sendEvent(encoder, {
                type: 'tool_call',
                payload: { tool: event.tool, input: event.input },
              })
            );
          } else if (event.type === 'tool_result') {
            controller.enqueue(
              sendEvent(encoder, {
                type: 'tool_result',
                payload: {
                  tool: event.tool,
                  ok: event.ok,
                  output: event.output,
                },
              })
            );
          } else if (event.type === 'final') {
            assistantText = event.text || assistantText;
          } else if (event.type === 'error') {
            controller.enqueue(
              sendEvent(encoder, {
                type: 'error',
                payload: { message: event.message },
              })
            );
          }
        }

        // Persist the assistant message
        const assistantMessageId = crypto.randomUUID();
        if (assistantText.trim()) {
          await sql`
            INSERT INTO assistant_messages (id, conversation_id, role, content)
            VALUES (${assistantMessageId}, ${conversationId}, 'assistant', ${assistantText})
          `;
          await sql`
            UPDATE assistant_conversations SET updated_at = NOW() WHERE id = ${conversationId}
          `;
          controller.enqueue(
            sendEvent(encoder, {
              type: 'message_end',
              payload: { assistant_message_id: assistantMessageId },
            })
          );
        } else {
          controller.enqueue(
            sendEvent(encoder, { type: 'message_end', payload: {} })
          );
        }
      } catch (err) {
        controller.enqueue(
          sendEvent(encoder, {
            type: 'error',
            payload: { message: (err as Error).message },
          })
        );
      } finally {
        controller.close();
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
