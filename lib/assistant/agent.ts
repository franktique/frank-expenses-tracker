import Anthropic from '@anthropic-ai/sdk';
import { dispatchTool, getToolsAsJsonSchema } from './tools';
import { ASSISTANT_SYSTEM_PROMPT } from './system-prompt';
import type { AssistantMessage } from '@/types/assistant';

/**
 * Agent runner — wraps the Anthropic SDK's tool-use loop in an async generator
 * that yields streaming events (text deltas, tool calls, tool results, final).
 *
 * Architecture note: this uses the base `@anthropic-ai/sdk` rather than
 * `@anthropic-ai/claude-agent-sdk`. The Agent SDK spawns the Claude Code CLI
 * as a subprocess (great for dev-box coding agents, problematic for Next.js
 * serverless). The base SDK supports tool use and streaming natively and runs
 * fully in-process. The tools in `tools.ts` are SDK-agnostic, so swapping the
 * runner later is straightforward.
 */

export type AssistantTurnEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'thinking_delta'; text: string }
  | { type: 'tool_call'; tool: string; input: unknown }
  | { type: 'tool_result'; tool: string; ok: boolean; output: unknown }
  | { type: 'final'; text: string }
  | { type: 'error'; message: string };

const MAX_TURNS = Number(process.env.ASSISTANT_MAX_TOOL_CALLS) || 10;

/**
 * Extended thinking is an Anthropic-specific Messages API extension. Only
 * request it when talking to Anthropic's own API (no ANTHROPIC_BASE_URL
 * override) unless explicitly forced — a Anthropic-compatible third-party
 * endpoint (e.g. Kimi K3) may not support the `thinking` param, or may
 * reject the request outright.
 */
function shouldRequestThinking(): boolean {
  const override = process.env.ASSISTANT_ENABLE_THINKING;
  if (override === 'true') return true;
  if (override === 'false') return false;
  return !process.env.ANTHROPIC_BASE_URL;
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY no está configurada. Agrégala a .env.local (ver .env.example).'
    );
  }
  const baseURL = process.env.ANTHROPIC_BASE_URL;
  return new Anthropic({ apiKey, ...(baseURL ? { baseURL } : {}) });
}

function getModel(): string {
  return process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
}

function getMaxTokens(): number {
  return Number(process.env.ASSISTANT_MAX_TOKENS) || 4096;
}

interface TurnInput {
  history: AssistantMessage[];
  userMessage: string;
  abortController?: AbortController;
}

/**
 * Convert persisted DB messages into the Anthropic messages format.
 * Tool messages from prior turns are reconstructed from the stored tool_data.
 */
function buildMessages(history: AssistantMessage[], userMessage: string) {
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

/**
 * Run a single assistant turn with tool use. Yields streaming events.
 * Returns the final assistant text (also yielded as a 'final' event).
 */
export async function* runAssistantTurn({
  history,
  userMessage,
  abortController,
}: TurnInput): AsyncGenerator<AssistantTurnEvent> {
  let client: Anthropic;
  try {
    client = getClient();
  } catch (err) {
    yield { type: 'error', message: (err as Error).message };
    return;
  }

  const messages = buildMessages(history, userMessage);
  const tools = getToolsAsJsonSchema();
  let assistantText = '';
  let turns = 0;

  try {
    while (turns <= MAX_TURNS) {
      turns++;

      const stream = client.messages.stream(
        {
          model: getModel(),
          max_tokens: getMaxTokens(),
          system: ASSISTANT_SYSTEM_PROMPT,
          messages,
          tools: tools as Anthropic.Tool[],
          ...(shouldRequestThinking()
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

      const toolUseBlocks: Array<{
        id: string;
        name: string;
        input: Record<string, unknown>;
      }> = [];

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
        // signature_delta and redacted_thinking blocks carry no displayable
        // text — intentionally not yielded as thinking_delta events.
        if (
          event.type === 'content_block_start' &&
          event.content_block.type === 'tool_use'
        ) {
          toolUseBlocks.push({
            id: event.content_block.id,
            name: event.content_block.name,
            input: {},
          });
        }
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'input_json_delta' &&
          toolUseBlocks.length > 0
        ) {
          // input arrives as partial JSON; we'll re-parse from finalMessage below.
        }
      }

      const finalMessage = await stream.finalMessage();

      // Append assistant turn to message history for the next iteration
      messages.push({ role: 'assistant', content: finalMessage.content });

      // If the model didn't call any tools, we're done.
      if (finalMessage.stop_reason !== 'tool_use') {
        yield { type: 'final', text: assistantText };
        return;
      }

      // Otherwise, dispatch each tool call and feed results back.
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
      // Loop continues: the model will receive tool results and may emit more text or more tool calls.
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
    yield { type: 'error', message: (err as Error).message };
  }
}
