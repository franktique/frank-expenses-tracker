'use client';

import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssistantMessage } from '@/types/assistant';

export function AssistantChatMessage({
  message,
  streaming = false,
}: {
  message: Pick<AssistantMessage, 'role' | 'content'> & { streaming?: boolean };
  streaming?: boolean;
}) {
  const isUser = message.role === 'user';
  const content = message.content || '';

  return (
    <div
      className={cn(
        'flex w-full gap-3 px-1',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
          isUser
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-muted text-foreground'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          'flex min-w-0 max-w-[85%] flex-col gap-1',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground',
            streaming && 'after:ml-0.5 after:inline-block after:h-3 after:w-1.5 after:translate-y-0.5 after:animate-pulse after:bg-foreground/60 after:content-[""]'
          )}
        >
          {content || (streaming ? '' : '(sin contenido)')}
        </div>
      </div>
    </div>
  );
}
