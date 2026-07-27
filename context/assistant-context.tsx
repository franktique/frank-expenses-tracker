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

  // Errors
  error: string | null;
  clearError: () => void;
}

const AssistantContext = createContext<AssistantContextValue | undefined>(undefined);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

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
      const data = (await res.json()) as { conversation: ConversationWithMessages };
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
              } else if (event.type === 'error') {
                setError(event.payload?.message || 'Error del asistente');
              } else if (event.type === 'message_end') {
                // Commit the assistant message to state
                if (accumulatedAssistant.trim()) {
                  const finalMessage: AssistantMessage = {
                    id: event.payload?.assistant_message_id || `asst-${Date.now()}`,
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
    error,
    clearError,
  };

  return (
    <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>
  );
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error('useAssistant debe usarse dentro de AssistantProvider');
  }
  return ctx;
}
