import { EventsManagement } from '@/components/events-management';

export default function EventosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Eventos</h1>
        <p className="mt-1 text-muted-foreground">
          Gestiona los eventos para clasificar y agrupar tus gastos
        </p>
      </div>
      <EventsManagement />
    </div>
  );
}
