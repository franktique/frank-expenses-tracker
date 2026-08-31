import type { AssistantMessage } from '@/types/assistant';

/**
 * Protocol-agnostic assistant turn events. Both runners (Anthropic and OpenAI)
 * yield this exact stream shape, so the streaming route and the client are
 * unaffected by which provider/protocol is active.
 */
export type AssistantTurnEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'thinking_delta'; text: string }
  | { type: 'tool_call'; tool: string; input: unknown }
  | { type: 'tool_result'; tool: string; ok: boolean; output: unknown }
  | { type: 'final'; text: string }
  | { type: 'error'; message: string };

export interface TurnInput {
  history: AssistantMessage[];
  userMessage: string;
  abortController?: AbortController;
}
