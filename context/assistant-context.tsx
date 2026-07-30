'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  AssistantMessage,
  ConversationListItem,
  ConversationWithMessages,
} from '@/types/assistant';

export type ProcessEntry =
  | { id: string; type: 'thinking'; text: string }
  | { id: string; type: 'tool_call'; tool: string; input: unknown }
  | {
      id: string;
      type: 'tool_result';
      tool: string;
      ok: boolean;
      output: unknown;
    };

const SHOW_PROCESS_STORAGE_KEY = 'assistant_show_process_panel';

interface AssistantContextValue {
  // Panel state
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;

  // Conversations
  conversations: ConversationListItem[];
  currentConversationId: string | null;
  messages: AssistantMessage[];
  isLoadingConversations: boolean;

  selectConversation: (id: string) => Promise<void>;
  startNewConversation: () => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  refreshConversations: () => Promise<void>;

  // Messaging
  streamingText: string;
  isStreaming: boolean;
  sendMessage: (content: string) => Promise<void>;
  abortStreaming: () => void;

  // Process panel (thinking + tool call trace, ephemeral/live-only)
  processEntries: ProcessEntry[];
  showProcess: boolean;
  setShowProcess: (value: boolean) => void;

  // Errors
  error: string | null;
  clearError: () => void;
}

const AssistantContext = createContext<AssistantContextValue | undefined>(
  undefined
);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    []
  );
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processEntries, setProcessEntries] = useState<ProcessEntry[]>([]);
  const [showProcess, setShowProcessState] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // Hydrate the process-panel toggle from localStorage after mount to avoid
  // an SSR/CSR hydration mismatch.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SHOW_PROCESS_STORAGE_KEY);
      if (stored !== null) setShowProcessState(stored === 'true');
    } catch {
      // localStorage unavailable — keep default
    }
  }, []);

  const setShowProcess = useCallback((value: boolean) => {
    setShowProcessState(value);
    try {
      window.localStorage.setItem(SHOW_PROCESS_STORAGE_KEY, String(value));
    } catch {
      // ignore write failures (private browsing, quota, etc.)
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const res = await fetch('/api/assistant/conversations');
      if (!res.ok) throw new Error('No se pudieron cargar las conversaciones');
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  const selectConversation = useCallback(async (id: string) => {
    setCurrentConversationId(id);
    setMessages([]);
    setStreamingText('');
    try {
      const res = await fetch(`/api/assistant/conversations/${id}`);
      if (!res.ok) throw new Error('No se pudo cargar la conversación');
      const data = (await res.json()) as {
        conversation: ConversationWithMessages;
      };
      setMessages(data.conversation.messages || []);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const startNewConversation = useCallback(async () => {
    try {
      const res = await fetch('/api/assistant/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('No se pudo crear la conversación');
      const data = await res.json();
      const conv = data.conversation;
      setConversations((prev) => [conv, ...prev]);
      setCurrentConversationId(conv.id);
      setMessages([]);
      setStreamingText('');
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      try {
        const res = await fetch(`/api/assistant/conversations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });
        if (!res.ok) throw new Error('No se pudo renombrar la conversación');
        await refreshConversations();
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [refreshConversations]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/assistant/conversations/${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('No se pudo eliminar la conversación');
        if (currentConversationId === id) {
          setCurrentConversationId(null);
          setMessages([]);
        }
        await refreshConversations();
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [currentConversationId, refreshConversations]
  );

  const abortStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isStreaming) return;

      // Auto-create a conversation if none is selected
      let conversationId = currentConversationId;
      if (!conversationId) {
        try {
          const res = await fetch('/api/assistant/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });
          if (!res.ok) throw new Error('No se pudo crear la conversación');
          const data = await res.json();
          conversationId = data.conversation.id;
          setConversations((prev) => [data.conversation, ...prev]);
          setCurrentConversationId(conversationId);
        } catch (err) {
          setError((err as Error).message);
          return;
        }
      }

      // Optimistic user message
      const optimisticId = `pending-${Date.now()}`;
      const optimisticMessage: AssistantMessage = {
        id: optimisticId,
        conversation_id: conversationId!,
        role: 'user',
        content: trimmed,
        tool_data: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMessage]);

      setIsStreaming(true);
      setStreamingText('');
      setProcessEntries([]);
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/assistant/conversations/${conversationId}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: trimmed }),
            signal: controller.signal,
          }
        );

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => 'Error desconocido');
          throw new Error(errText);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedAssistant = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines (NDJSON)
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line);
              if (event.type === 'text_delta' && event.payload?.text) {
                accumulatedAssistant += event.payload.text;
                setStreamingText(accumulatedAssistant);
              } else if (
                event.type === 'thinking_delta' &&
                event.payload?.text
              ) {
                const text: string = event.payload.text;
                setProcessEntries((prev) => {
                  const last = prev[prev.length - 1];
                  if (last && last.type === 'thinking') {
                    return [
                      ...prev.slice(0, -1),
                      { ...last, text: last.text + text },
                    ];
                  }
                  return [
                    ...prev,
                    {
                      id: `thinking-${Date.now()}-${prev.length}`,
                      type: 'thinking',
                      text,
                    },
                  ];
                });
              } else if (event.type === 'tool_call') {
                const { tool, input } = event.payload || {};
                setProcessEntries((prev) => [
                  ...prev,
                  {
                    id: `tool_call-${Date.now()}-${prev.length}`,
                    type: 'tool_call',
                    tool,
                    input,
                  },
                ]);
              } else if (event.type === 'tool_result') {
                const { tool, ok, output } = event.payload || {};
                setProcessEntries((prev) => [
                  ...prev,
                  {
                    id: `tool_result-${Date.now()}-${prev.length}`,
                    type: 'tool_result',
                    tool,
                    ok,
                    output,
                  },
                ]);
              } else if (event.type === 'error') {
                setError(event.payload?.message || 'Error del asistente');
              } else if (event.type === 'message_end') {
                // Commit the assistant message to state
                if (accumulatedAssistant.trim()) {
                  const finalMessage: AssistantMessage = {
                    id:
                      event.payload?.assistant_message_id ||
                      `asst-${Date.now()}`,
                    conversation_id: conversationId!,
                    role: 'assistant',
                    content: accumulatedAssistant,
                    tool_data: null,
                    created_at: new Date().toISOString(),
                  };
                  setMessages((prev) => [...prev, finalMessage]);
                }
                accumulatedAssistant = '';
                setStreamingText('');
              }
            } catch {
              // ignore malformed lines
            }
          }
        }

        await refreshConversations();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message);
        }
      } finally {
        setIsStreaming(false);
        setStreamingText('');
        abortRef.current = null;
      }
    },
    [currentConversationId, isStreaming, refreshConversations]
  );

  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const togglePanel = useCallback(() => setIsOpen((v) => !v), []);
  const clearError = useCallback(() => setError(null), []);

  const value: AssistantContextValue = {
    isOpen,
    openPanel,
    closePanel,
    togglePanel,
    conversations,
    currentConversationId,
    messages,
    isLoadingConversations,
    selectConversation,
    startNewConversation,
    renameConversation,
    deleteConversation,
    refreshConversations,
    streamingText,
    isStreaming,
    sendMessage,
    abortStreaming,
    processEntries,
    showProcess,
    setShowProcess,
    error,
    clearError,
  };

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error('useAssistant debe usarse dentro de AssistantProvider');
  }
  return ctx;
}
