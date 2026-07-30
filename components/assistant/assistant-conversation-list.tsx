'use client';

import { useState } from 'react';
import { MessageSquare, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAssistant } from '@/context/assistant-context';

export function AssistantConversationList({ compact = false }: { compact?: boolean }) {
  const {
    conversations,
    currentConversationId,
    selectConversation,
    startNewConversation,
    renameConversation,
    deleteConversation,
    isLoadingConversations,
  } = useAssistant();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const beginEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditValue(currentTitle);
  };

  const commitEdit = async () => {
    if (editingId && editValue.trim()) {
      await renameConversation(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-2">
        <span className="text-xs font-medium text-muted-foreground">
          Conversaciones
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={startNewConversation}
          title="Nueva conversación"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-1 pb-2">
        {isLoadingConversations && conversations.length === 0 && (
          <div className="p-3 text-xs text-muted-foreground">Cargando…</div>
        )}
        {!isLoadingConversations && conversations.length === 0 && (
          <div className="p-3 text-xs text-muted-foreground">
            Aún no hay conversaciones.
          </div>
        )}

        <ul className="flex flex-col gap-0.5">
          {conversations.map((conv) => {
            const isEditing = editingId === conv.id;
            const isActive = currentConversationId === conv.id;
            return (
              <li key={conv.id}>
                {isEditing ? (
                  <div className="flex items-center gap-1 rounded-md px-1 py-1">
                    <Input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="h-7 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={commitEdit}
                      title="Guardar"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={cancelEdit}
                      title="Cancelar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50'
                    )}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => selectConversation(conv.id)}
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="truncate">
                        {conv.title || 'Sin título'}
                      </span>
                    </button>
                    <div className="hidden shrink-0 group-hover:flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => beginEdit(conv.id, conv.title)}
                        title="Renombrar"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:text-destructive"
                        onClick={() => {
                          if (
                            confirm(
                              `¿Eliminar "${conv.title}"? Esta acción no se puede deshacer.`
                            )
                          ) {
                            deleteConversation(conv.id);
                          }
                        }}
                        title="Eliminar"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {!compact && conversations.length > 0 && (
        <div className="border-t p-2 text-[10px] text-muted-foreground">
          {conversations.length} conversación{conversations.length !== 1 ? 'es' : ''}
        </div>
      )}
    </div>
  );
}
