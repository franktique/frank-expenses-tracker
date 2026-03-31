'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  formatCotizacionCurrency,
  type CotizacionListItem,
} from '@/types/cotizaciones';
import { CreateCotizacionDialog } from './create-cotizacion-dialog';

export function CotizacionesList() {
  const router = useRouter();
  const { toast } = useToast();

  const [cotizaciones, setCotizaciones] = useState<CotizacionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/cotizaciones');

      // Auto-migrate if tables don't exist yet
      if (res.status === 404) {
        const migRes = await fetch('/api/migrate-cotizaciones', {
          method: 'POST',
        });
        if (!migRes.ok) throw new Error('Error al inicializar tablas');
        const res2 = await fetch('/api/cotizaciones');
        if (!res2.ok) throw new Error('Error al cargar datos');
        const data = await res2.json();
        setCotizaciones(data.cotizaciones ?? []);
        return;
      }

      if (!res.ok) throw new Error('Error al cargar datos');
      const data = await res.json();
      setCotizaciones(data.cotizaciones ?? []);
    } catch (err) {
      toast({
        title: 'Error',
        description:
          err instanceof Error
            ? err.message
            : 'No se pudo cargar las cotizaciones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/cotizaciones/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setCotizaciones((prev) => prev.filter((c) => c.id !== id));
      toast({ title: 'Cotización eliminada' });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  }

  function handleCreated(id: string) {
    router.push(`/cotizaciones/${id}`);
  }

  const deleteTarget = cotizaciones.find((c) => c.id === deleteId);

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">Cargando...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cotización
        </Button>
      </div>

      {cotizaciones.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <ClipboardList className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No hay cotizaciones todavía.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea una para empezar a planificar tus gastos.
          </p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cotización
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cotizaciones.map((c) => (
            <Card
              key={c.id}
              className="group cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/cotizaciones/${c.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">
                      {c.name}
                    </CardTitle>
                    {c.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {c.description}
                      </CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 shrink-0 p-0 text-destructive opacity-0 hover:text-destructive group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(c.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {c.itemCount} {c.itemCount === 1 ? 'ítem' : 'ítems'}
                  </span>
                  <span className="font-semibold">
                    {formatCotizacionCurrency(c.total, c.currency)}
                  </span>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <CreateCotizacionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cotización?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos los ítems de &quot;{deleteTarget?.name}&quot;.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
