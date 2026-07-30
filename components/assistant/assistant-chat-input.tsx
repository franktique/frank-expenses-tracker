'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAssistant } from '@/context/assistant-context';

export function AssistantChatInput() {
  const { sendMessage, isStreaming, abortStreaming, error } = useAssistant();
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow the textarea up to a max height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isStreaming) return;
    const toSend = value;
    setValue('');
    await sendMessage(toSend);
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-end gap-2 border-t bg-background p-2"
    >
      <div className="flex-1">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(e as unknown as FormEvent);
            }
          }}
          placeholder={
            error ? 'Escribe tu pregunta…' : 'Pregúntale sobre tus finanzas…'
          }
          rows={1}
          disabled={isStreaming}
          className="min-h-[44px] resize-none text-sm"
        />
      </div>
      {isStreaming ? (
        <Button
          type="button"
          size="icon"
          variant="destructive"
          onClick={abortStreaming}
          title="Detener"
          className="h-10 w-10 shrink-0"
        >
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="submit"
          size="icon"
          disabled={!value.trim()}
          title="Enviar"
          className="h-10 w-10 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      )}
    </form>
  );
}
