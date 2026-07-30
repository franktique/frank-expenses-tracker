'use client';

import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAssistant } from '@/context/assistant-context';

/**
 * Floating action button + global Cmd+K / Ctrl+K shortcut to open the panel.
 */
export function AssistantTrigger() {
  const { togglePanel, isOpen, openPanel } = useAssistant();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (!isCmdK) return;

      // Don't intercept if focus is in a password field or contenteditable.
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' && (target as HTMLInputElement)?.type === 'password') return;

      e.preventDefault();
      togglePanel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePanel]);

  if (isOpen) return null;

  return (
    <Button
      type="button"
      onClick={openPanel}
      size="icon"
      className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full shadow-lg"
      title="Abrir asistente (Cmd+K)"
      aria-label="Abrir asistente financiero"
    >
      <Sparkles className="h-5 w-5" />
    </Button>
  );
}
