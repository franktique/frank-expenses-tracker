'use client';

import { useEffect, useRef } from 'react';
import { Sparkles, AlertCircle, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAssistant } from '@/context/assistant-context';
import { AssistantChatMessage } from './assistant-chat-message';
import { AssistantChatInput } from './assistant-chat-input';
import { AssistantSuggestions } from './assistant-suggestions';

export function AssistantPanel() {
  const {
    isOpen,
    closePanel,
    messages,
    streamingText,
    isStreaming,
    error,
    clearError,
    sendMessage,
    startNewConversation,
  } = useAssistant();

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streamingText, error]);

  const showSuggestions = messages.length === 0 && !streamingText && !isStreaming;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closePanel()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="flex flex-row items-center justify-between gap-2 border-b p-3 text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle className="text-sm">Asistente Financiero</SheetTitle>
              <p className="text-[11px] text-muted-foreground">
                Pregunta sobre tus gastos, presupuesto y ahorro
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={closePanel}
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        {error && (
          <div className="flex items-start gap-2 border-b border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
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

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto p-3"
        >
          {showSuggestions ? (
            <div className="flex h-full flex-col justify-center">
              <div className="mb-4 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold">Hola, ¿en qué puedo ayudarte?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Puedo analizar tus datos financieros y darte respuestas accionables.
                </p>
              </div>
              <AssistantSuggestions onPick={(prompt) => sendMessage(prompt)} />
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
                <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="animate-pulse">
                    Pensando…
                  </Badge>
                </div>
              )}
            </>
          )}
        </div>

        <AssistantChatInput />

        {messages.length > 0 && (
          <div className="border-t bg-muted/30 p-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full gap-1 text-[11px]"
              onClick={startNewConversation}
            >
              <Sparkles className="h-3 w-3" />
              Nueva conversación
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
