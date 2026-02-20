'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PanelRoute {
  path: string;
  label: string;
}

const PANEL_ROUTES: PanelRoute[] = [
  { path: '/', label: 'Dashboard Principal' },
  { path: '/categorias', label: 'Categorías' },
  { path: '/periodos', label: 'Períodos' },
  { path: '/presupuestos', label: 'Presupuestos' },
  { path: '/ingresos', label: 'Ingresos' },
  { path: '/gastos', label: 'Gastos' },
  { path: '/tarjetas-credito', label: 'Tarjetas de Crédito' },
  { path: '/agrupadores', label: 'Agrupadores' },
  { path: '/simular', label: 'Simulación Presupuesto' },
  { path: '/simular-prestamos', label: 'Simulador de Préstamos' },
  { path: '/simular-inversiones', label: 'Simulador de Inversiones' },
  { path: '/simular-tasas', label: 'Simulador de Tasas' },
  { path: '/dashboard/category-bars', label: 'Barras por Categoría' },
  { path: '/dashboard/period-bars', label: 'Barras por Período' },
  { path: '/dashboard/groupers', label: 'Agrupadores Dashboard' },
  { path: '/dashboard/remainder', label: 'Restante' },
  { path: '/dashboard/overspend', label: 'Overspend Actual' },
  {
    path: '/dashboard/overspend/all-periods',
    label: 'Overspend Todos los Períodos',
  },
  { path: '/dashboard/projected-execution', label: 'Ejecución Proyectada' },
  { path: '/setup', label: 'Configuración' },
];

interface SplitViewPanelProps {
  route: string;
  onRouteChange: (route: string) => void;
  onClose: () => void;
  className?: string;
}

export function SplitViewPanel({
  route,
  onRouteChange,
  onClose,
  className,
}: SplitViewPanelProps) {
  const iframeSrc = `${route}?_layout=panel`;

  return (
    <div
      className={cn(
        'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l',
        className
      )}
    >
      {/* Panel header */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b bg-muted/50 px-3">
        <Select value={route} onValueChange={onRouteChange}>
          <SelectTrigger className="h-7 flex-1 text-xs">
            <SelectValue placeholder="Seleccionar vista..." />
          </SelectTrigger>
          <SelectContent>
            {PANEL_ROUTES.map((r) => (
              <SelectItem key={r.path} value={r.path} className="text-xs">
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 shrink-0 p-0 hover:bg-accent"
          aria-label="Cerrar panel"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      {/* Iframe */}
      <div className="min-h-0 flex-1">
        <iframe
          key={iframeSrc}
          src={iframeSrc}
          className="h-full w-full border-0"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          title="Panel de vista dividida"
        />
      </div>
    </div>
  );
}
