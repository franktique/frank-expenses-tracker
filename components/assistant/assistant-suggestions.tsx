'use client';

import { Sparkles, TrendingDown, Wallet, PieChart } from 'lucide-react';

const SUGGESTIONS = [
  {
    icon: TrendingDown,
    label: '¿En qué categorías estoy gastando de más?',
    prompt: '¿En qué categorías estoy gastando de más este periodo?',
  },
  {
    icon: Wallet,
    label: 'Quiero ahorrar $500.000 este mes',
    prompt: 'Quiero ahorrar $500.000 este mes, ¿dónde puedo recortar gastos?',
  },
  {
    icon: PieChart,
    label: '¿Cómo va mi presupuesto?',
    prompt: '¿Cómo va mi presupuesto para este periodo? Dime ingresos, gastos y balance.',
  },
  {
    icon: Sparkles,
    label: '¿Cuánto dinero tengo disponible?',
    prompt: '¿Cuánto dinero tengo disponible en mis fondos actualmente?',
  },
];

export function AssistantSuggestions({
  onPick,
}: {
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 py-2">
      <p className="px-1 text-xs font-medium text-muted-foreground">
        Sugerencias para empezar
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onPick(s.prompt)}
            className="flex items-start gap-2 rounded-md border border-border bg-background p-3 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="leading-snug">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
