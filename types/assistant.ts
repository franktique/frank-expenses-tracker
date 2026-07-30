export type AssistantMessageRole = 'user' | 'assistant' | 'tool';

export interface AssistantConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AssistantMessage {
  id: string;
  conversation_id: string;
  role: AssistantMessageRole;
  content: string | null;
  tool_data: unknown;
  created_at: string;
}

export interface ConversationWithMessages extends AssistantConversation {
  messages: AssistantMessage[];
}

export interface ConversationListItem extends AssistantConversation {
  last_message_preview: string | null;
  last_message_at: string | null;
  message_count: number;
}

export interface StreamingEvent {
  type:
    | 'text_delta'
    | 'thinking_delta'
    | 'tool_call'
    | 'tool_result'
    | 'message_start'
    | 'message_end'
    | 'error';
  payload?: unknown;
}
