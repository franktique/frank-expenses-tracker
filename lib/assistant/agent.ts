import { getActiveProvider } from './providers';
import { runAnthropicTurn } from './anthropic-runner';
import { runOpenAITurn } from './openai-runner';
import type { AssistantTurnEvent, TurnInput } from './events';

export type { AssistantTurnEvent } from './events';

/**
 * Agent orchestrator — resolves the active provider (from the DB, with .env
 * fallback) and delegates to the matching protocol runner. Both runners yield
 * the same `AssistantTurnEvent` stream, so the streaming route and client are
 * protocol-agnostic.
 *
 * The provider is resolved on every turn, which makes hot-swapping possible:
 * changing the active provider in the DB takes effect on the next message
 * without restarting or redeploying.
 */
export async function* runAssistantTurn(
  input: TurnInput
): AsyncGenerator<AssistantTurnEvent> {
  let config;
  try {
    config = await getActiveProvider();
  } catch (err) {
    yield { type: 'error', message: (err as Error).message };
    return;
  }

  if (!config) {
    yield {
      type: 'error',
      message:
        'No hay proveedor de IA configurado. Configúralo en /asistente (engranaje) o define ANTHROPIC_API_KEY en .env.local.',
    };
    return;
  }

  if (config.protocol === 'openai') {
    yield* runOpenAITurn(config, input);
  } else {
    yield* runAnthropicTurn(config, input);
  }
}
