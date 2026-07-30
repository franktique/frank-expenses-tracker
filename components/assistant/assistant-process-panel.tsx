'use client';

import { useEffect, useRef } from 'react';
import { Brain, Wrench, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ProcessEntry } from '@/context/assistant-context';

function ToolJson({ value }: { value: unknown }) {
  if (value === undefined) return null;
  return (
    <details className="mt-1 text-xs">
      <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
        Ver detalle
      </summary>
      <pre className="mt-1 max-h-48 overflow-auto rounded bg-background/60 p-2 text-[11px] leading-relaxed">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

function ProcessEntryRow({ entry }: { entry: ProcessEntry }) {
  if (entry.type === 'thinking') {
    return (
      <div className="flex gap-2 rounded-md border border-transparent px-2 py-1.5">
        <Brain className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="whitespace-pre-wrap text-xs italic leading-relaxed text-muted-foreground">
          {entry.text}
        </p>
      </div>
    );
  }

  if (entry.type === 'tool_call') {
    return (
      <div className="rounded-md border bg-background/40 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5 shrink-0 text-blue-500" />
          <Badge variant="outline" className="font-mono text-[11px]">
            {entry.tool}
          </Badge>
        </div>
        <ToolJson value={entry.input} />
      </div>
    );
  }

  // tool_result
  return (
    <div className="rounded-md border bg-background/40 px-2 py-1.5">
      <div className="flex items-center gap-2">
        {entry.ok ? (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
        ) : (
          <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
        )}
        <Badge variant="outline" className="font-mono text-[11px]">
          {entry.tool}
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          {entry.ok ? 'ok' : 'error'}
        </span>
      </div>
      <ToolJson value={entry.output} />
    </div>
  );
}

export function AssistantProcessPanel({
  entries,
}: {
  entries: ProcessEntry[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-3 py-2">
        <p className="text-xs font-semibold text-muted-foreground">Proceso</p>
      </div>
      <div
        ref={scrollRef}
        className={cn('flex-1 space-y-2 overflow-y-auto p-2')}
      >
        {entries.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">
            El proceso aparecerá aquí en tu próximo mensaje.
          </p>
        ) : (
          entries.map((entry) => (
            <ProcessEntryRow key={entry.id} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
}
