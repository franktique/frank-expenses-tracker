'use client';

import { useEffect, useRef } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useAssistant, type ProcessEntry } from '@/context/assistant-context';
import { AssistantConversationList } from '@/components/assistant/assistant-conversation-list';
import { AssistantChatMessage } from '@/components/assistant/assistant-chat-message';
import { AssistantChatInput } from '@/components/assistant/assistant-chat-input';
import { AssistantSuggestions } from '@/components/assistant/assistant-suggestions';
import { AssistantProcessPanel } from '@/components/assistant/assistant-process-panel';

function deriveProcessLabel(entries: ProcessEntry[]): string | undefined {
  const last = entries[entries.length - 1];
  if (!last) return undefined;
  if (last.type === 'thinking') return 'Analizando tu solicitud…';
  if (last.type === 'tool_call') return `Consultando ${last.tool}…`;
  return 'Procesando resultados…';
}

export default function AsistentePage() {
  const {
    messages,
    streamingText,
    isStreaming,
    error,
    clearError,
    sendMessage,
    processEntries,
    showProcess,
    setShowProcess,
  } = useAssistant();

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streamingText, error]);

  const showSuggestions =
    messages.length === 0 && !streamingText && !isStreaming;

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-4 p-4 md:h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-2 border-b pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Asistente Financiero</h1>
          <p className="text-xs text-muted-foreground">
            Analiza tus gastos, presupuesto y oportunidades de ahorro en
            lenguaje natural
          </p>
        </div>
        <label className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
          Ver proceso
          <Switch checked={showProcess} onCheckedChange={setShowProcess} />
        </label>
      </div>

      <div
        className={cn(
          'grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[260px_1fr]',
          showProcess && 'lg:grid-cols-[260px_1fr_320px]'
        )}
      >
        {/* Conversation list */}
        <aside className="hidden min-h-0 overflow-hidden rounded-md border bg-background md:flex md:flex-col">
          <AssistantConversationList />
        </aside>

        {/* Chat area */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-md border bg-background">
          {error && (
            <div className="flex items-start gap-2 border-b border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={clearError}
                className="shrink-0 underline hover:no-underline"
              >
                Cerrar
              </button>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-4">
            {showSuggestions ? (
              <div className="flex h-full flex-col justify-center">
                <div className="mb-5 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <h2 className="text-base font-semibold">
                    Hola, ¿en qué puedo ayudarte hoy?
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Puedo analizar tus datos financieros y darte respuestas
                    accionables.
                  </p>
                </div>
                <AssistantSuggestions
                  onPick={(prompt) => sendMessage(prompt)}
                />
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <AssistantChatMessage
                    key={m.id}
                    message={{ role: m.role, content: m.content }}
                  />
                ))}
                {isStreaming && streamingText && (
                  <AssistantChatMessage
                    streaming
                    message={{ role: 'assistant', content: streamingText }}
                  />
                )}
                {isStreaming && !streamingText && (
                  <AssistantChatMessage
                    streaming
                    message={{ role: 'assistant', content: '' }}
                    processLabel={deriveProcessLabel(processEntries)}
                  />
                )}
              </>
            )}
          </div>

          <AssistantChatInput />
        </section>

        {/* Process panel (thinking + tool call trace) */}
        {showProcess && (
          <aside className="hidden min-h-0 overflow-hidden rounded-md border bg-muted/30 lg:flex lg:flex-col">
            <AssistantProcessPanel entries={processEntries} />
          </aside>
        )}
      </div>

      {/* Mobile conversation list (below chat) */}
      <details className="block md:hidden">
        <summary className="cursor-pointer text-xs text-muted-foreground">
          Ver conversaciones anteriores
        </summary>
        <div className="mt-2 max-h-60 overflow-hidden rounded-md border">
          <AssistantConversationList compact />
        </div>
      </details>
    </div>
  );
}
