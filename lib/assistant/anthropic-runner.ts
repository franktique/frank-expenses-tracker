import Anthropic from '@anthropic-ai/sdk';
import { dispatchTool, getToolsAsJsonSchema } from './tools';
import { ASSISTANT_SYSTEM_PROMPT } from './system-prompt';
import type { AssistantMessage } from '@/types/assistant';
import type { AssistantTurnEvent, TurnInput } from './events';
import type { ProviderConfig } from './providers';

/**
 * Anthropic Messages API runner (extracted from the former agent.ts). Parameterized
 * by a resolved `ProviderConfig` instead of reading `process.env` directly, so the
 * active provider can be swapped in the DB without redeploying.
 */

function buildMessages(
  history: AssistantMessage[],
  userMessage: string
): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];

  for (const msg of history) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content || '' });
    } else if (msg.role === 'assistant' && msg.content) {
      messages.push({ role: 'assistant', content: msg.content });
    }
  }

  messages.push({ role: 'user', content: userMessage });
  return messages;
}

function isAbort(err: unknown): boolean {
  return (
    (err as Error)?.name === 'AbortError' ||
    (err as Error)?.name === 'APIUserAbortError'
  );
}

export async function* runAnthropicTurn(
  config: ProviderConfig,
  { history, userMessage, abortController }: TurnInput
): AsyncGenerator<AssistantTurnEvent> {
  if (!config.apiKey) {
    yield {
      type: 'error',
      message:
        'El proveedor activo no tiene API key configurada. Agrégalo en la configuración de proveedores.',
    };
    return;
  }

  const client = new Anthropic({
    apiKey: config.apiKey,
    ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
  });

  const messages = buildMessages(history, userMessage);
  const tools = getToolsAsJsonSchema();
  let assistantText = '';
  let turns = 0;

  try {
    while (turns <= config.maxToolCalls) {
      turns++;

      const stream = client.messages.stream(
        {
          model: config.model,
          max_tokens: config.maxTokens,
          system: ASSISTANT_SYSTEM_PROMPT,
          messages,
          tools: tools as Anthropic.Tool[],
          ...(config.enableThinking
            ? {
                thinking: {
                  type: 'adaptive' as const,
                  display: 'summarized' as const,
                },
                output_config: { effort: 'medium' as const },
              }
            : {}),
        },
        abortController ? { signal: abortController.signal } : undefined
      );

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          assistantText += event.delta.text;
          yield { type: 'text_delta', text: event.delta.text };
        }
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'thinking_delta'
        ) {
          yield { type: 'thinking_delta', text: event.delta.thinking };
        }
      }

      const finalMessage = await stream.finalMessage();

      // Append assistant turn to message history for the next iteration.
      messages.push({ role: 'assistant', content: finalMessage.content });

      // If the model didn't call any tools, we're done.
      if (finalMessage.stop_reason !== 'tool_use') {
        yield { type: 'final', text: assistantText };
        return;
      }

      const toolResults: Anthropic.MessageParam = {
        role: 'user',
        content: [],
      };

      for (const block of finalMessage.content) {
        if (block.type !== 'tool_use') continue;

        yield { type: 'tool_call', tool: block.name, input: block.input };

        const dispatched = await dispatchTool(
          block.name,
          block.input as Record<string, unknown>
        );
        const output = dispatched.ok
          ? dispatched.result
          : { error: dispatched.error };

        yield {
          type: 'tool_result',
          tool: block.name,
          ok: dispatched.ok,
          output,
        };

        (toolResults.content as Anthropic.ToolResultBlockParam[]).push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(output),
          is_error: !dispatched.ok,
        });
      }

      messages.push(toolResults);
    }

    // Exceeded turn budget — emit what we have with a soft warning.
    if (assistantText) {
      yield { type: 'final', text: assistantText };
    } else {
      yield {
        type: 'error',
        message:
          'El asistente excedió el número máximo de iteraciones de herramientas.',
      };
    }
  } catch (err) {
    if (isAbort(err)) return;
    yield { type: 'error', message: (err as Error).message };
  }
}
