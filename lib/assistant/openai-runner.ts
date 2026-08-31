import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { dispatchTool, getToolsForOpenAI } from './tools';
import { ASSISTANT_SYSTEM_PROMPT } from './system-prompt';
import type { AssistantMessage } from '@/types/assistant';
import type { AssistantTurnEvent, TurnInput } from './events';
import type { ProviderConfig } from './providers';

/**
 * OpenAI-compatible chat completions runner.
 *
 * Targets any provider exposing an OpenAI-style `/chat/completions` endpoint:
 * DeepSeek (https://api.deepseek.com), Ollama (http://localhost:11434/v1),
 * LM Studio (http://localhost:1234/v1), OpenAI, etc. It emits the exact same
 * `AssistantTurnEvent` stream as the Anthropic runner.
 */

interface ToolCallAcc {
  id: string;
  name: string;
  arguments: string;
}

type StreamDelta = {
  content?: string | null;
  reasoning_content?: string | null;
  reasoning?: string | null;
  tool_calls?: Array<{
    index?: number;
    id?: string;
    type?: 'function';
    function?: { name?: string; arguments?: string };
  }>;
};

function buildMessages(
  history: AssistantMessage[],
  userMessage: string
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: ASSISTANT_SYSTEM_PROMPT },
  ];

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

function parseArguments(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function isAbort(err: unknown): boolean {
  return (
    (err as Error)?.name === 'AbortError' ||
    (err as Error)?.name === 'APIUserAbortError'
  );
}

export async function* runOpenAITurn(
  config: ProviderConfig,
  { history, userMessage, abortController }: TurnInput
): AsyncGenerator<AssistantTurnEvent> {
  const client = new OpenAI({
    // Local runtimes (Ollama/LM Studio) ignore the key but the SDK requires a
    // non-empty value, so fall back to a placeholder.
    apiKey: config.apiKey || 'not-needed',
    ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
  });

  const messages = buildMessages(history, userMessage);
  const tools = getToolsForOpenAI();
  let assistantText = '';
  let turns = 0;

  try {
    while (turns <= config.maxToolCalls) {
      turns++;

      let turnContent = '';
      const toolCalls: ToolCallAcc[] = [];
      let finishReason: string | null = null;

      const stream = await client.chat.completions.create(
        {
          model: config.model,
          messages,
          tools,
          tool_choice: 'auto',
          max_tokens: config.maxTokens,
          stream: true,
        },
        abortController ? { signal: abortController.signal } : undefined
      );

      for await (const chunk of stream) {
        const delta = (chunk.choices[0]?.delta || {}) as StreamDelta;

        if (typeof delta.content === 'string' && delta.content) {
          turnContent += delta.content;
          assistantText += delta.content;
          yield { type: 'text_delta', text: delta.content };
        }

        const reasoning = delta.reasoning_content ?? delta.reasoning;
        if (typeof reasoning === 'string' && reasoning) {
          yield { type: 'thinking_delta', text: reasoning };
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const index = tc.index ?? 0;
            if (!toolCalls[index]) {
              toolCalls[index] = { id: '', name: '', arguments: '' };
            }
            const acc = toolCalls[index];
            if (tc.id) acc.id = tc.id;
            if (tc.function?.name && !acc.name) acc.name = tc.function.name;
            if (tc.function?.arguments) {
              acc.arguments += tc.function.arguments;
            }
          }
        }

        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason;
        }
      }

      if (finishReason === 'tool_calls' && toolCalls.length > 0) {
        // Record the assistant's tool-call turn.
        messages.push({
          role: 'assistant',
          content: turnContent || null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id || `call_${Date.now()}`,
            type: 'function' as const,
            function: { name: tc.name, arguments: tc.arguments || '{}' },
          })),
        });

        for (const tc of toolCalls) {
          const input = parseArguments(tc.arguments);
          yield { type: 'tool_call', tool: tc.name, input };

          const dispatched = await dispatchTool(tc.name, input);
          const output = dispatched.ok
            ? dispatched.result
            : { error: dispatched.error };

          yield {
            type: 'tool_result',
            tool: tc.name,
            ok: dispatched.ok,
            output,
          };

          messages.push({
            role: 'tool',
            tool_call_id: tc.id || `call_${Date.now()}`,
            content: JSON.stringify(output),
          });
        }

        // Loop continues: the model receives tool results and may emit more
        // text or more tool calls.
        continue;
      }

      // No further tool calls — done.
      yield { type: 'final', text: assistantText };
      return;
    }

    // Exceeded turn budget.
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
