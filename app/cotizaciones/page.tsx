import { ClipboardList } from 'lucide-react';
import { CotizacionesList } from '@/components/cotizaciones/cotizaciones-list';

export const metadata = {
  title: 'Cotizaciones | Budget Tracker',
  description: 'Crea cotizaciones para viajes, eventos y proyectos',
};

export default function CotizacionesPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
            <ClipboardList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold">Cotizaciones</h1>
        </div>
        <p className="text-muted-foreground">
          Planifica el costo de viajes, eventos o proyectos agregando ítems con
          las categorías de tu presupuesto. Cada cotización muestra el desglose
          por categoría y el total estimado.
        </p>
      </div>

      <CotizacionesList />
    </div>
  );
}
