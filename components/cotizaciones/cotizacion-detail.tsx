'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2, ArrowLeft, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  type CotizacionItem,
  type CotizacionWithItems,
} from '@/types/cotizaciones';
import { AddItemDialog } from './add-item-dialog';

interface Props {
  cotizacionId: string;
}

export function CotizacionDetail({ cotizacionId }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [data, setData] = useState<CotizacionWithItems | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit header state
  const [editingHeader, setEditingHeader] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingHeader, setSavingHeader] = useState(false);

  // Item dialog state
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<CotizacionItem | undefined>();

  // Delete cotización dialog
  const [deleteCotOpen, setDeleteCotOpen] = useState(false);

  // Delete item dialog
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/cotizaciones/${cotizacionId}`);
      if (!res.ok) throw new Error('No encontrada');
      const json: CotizacionWithItems = await res.json();
      setData(json);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo cargar la cotización',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [cotizacionId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Category subtotals
  const categoryTotals = useMemo(() => {
    if (!data) return [];
    const map: Record<string, { name: string; total: number }> = {};
    for (const item of data.items) {
      if (!map[item.categoryId]) {
        map[item.categoryId] = { name: item.categoryName, total: 0 };
      }
      map[item.categoryId].total += item.amount * item.quantity;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [data]);

  function startEditHeader() {
    if (!data) return;
    setEditName(data.name);
    setEditDescription(data.description ?? '');
    setEditingHeader(true);
  }

  async function saveHeader() {
    if (!data || !editName.trim()) return;
    setSavingHeader(true);
    try {
      const res = await fetch(`/api/cotizaciones/${cotizacionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      const updated = await res.json();
      setData((prev) =>
        prev
          ? { ...prev, name: updated.name, description: updated.description }
          : prev
      );
      setEditingHeader(false);
      toast({ title: 'Cotización actualizada' });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo guardar',
        variant: 'destructive',
      });
    } finally {
      setSavingHeader(false);
    }
  }

  async function handleDeleteCotizacion() {
    try {
      const res = await fetch(`/api/cotizaciones/${cotizacionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      toast({ title: 'Cotización eliminada' });
      router.push('/cotizaciones');
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar',
        variant: 'destructive',
      });
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      const res = await fetch(
        `/api/cotizaciones/${cotizacionId}/items/${itemId}`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) throw new Error();
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.filter((i) => i.id !== itemId),
              total: prev.items
                .filter((i) => i.id !== itemId)
                .reduce((s, i) => s + i.amount * i.quantity, 0),
              itemCount: prev.itemCount - 1,
            }
          : prev
      );
      toast({ title: 'Ítem eliminado' });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el ítem',
        variant: 'destructive',
      });
    } finally {
      setDeleteItemId(null);
    }
  }

  function handleItemSaved(item: CotizacionItem) {
    setData((prev) => {
      if (!prev) return prev;
      const exists = prev.items.some((i) => i.id === item.id);
      const items = exists
        ? prev.items.map((i) => (i.id === item.id ? item : i))
        : [...prev.items, item];
      const total = items.reduce((s, i) => s + i.amount * i.quantity, 0);
      return { ...prev, items, total, itemCount: items.length };
    });
    setEditItem(undefined);
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">Cargando...</div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Cotización no encontrada.
      </div>
    );
  }

  const currency = data.currency;

  return (
    <div className="space-y-6">
      {/* Back + Delete */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/cotizaciones')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cotizaciones
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setDeleteCotOpen(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar cotización
        </Button>
      </div>

      {/* Header */}
      <div className="rounded-lg border bg-card p-5">
        {editingHeader ? (
          <div className="space-y-3">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-xl font-semibold"
              placeholder="Nombre de la cotización"
            />
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Descripción (opcional)"
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={saveHeader}
                disabled={savingHeader || !editName.trim()}
              >
                <Check className="mr-1 h-4 w-4" />
                {savingHeader ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingHeader(false)}
              >
                <X className="mr-1 h-4 w-4" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{data.name}</h1>
              {data.description && (
                <p className="mt-1 text-muted-foreground">{data.description}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={startEditHeader}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Items table */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold">Ítems cotizados</h2>
          <Button
            size="sm"
            onClick={() => {
              setEditItem(undefined);
              setAddItemOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar ítem
          </Button>
        </div>

        {data.items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p>Aún no hay ítems en esta cotización.</p>
            <p className="mt-1 text-sm">
              Haz clic en &quot;Agregar ítem&quot; para comenzar.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">Valor unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.categoryName}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCotizacionCurrency(item.amount, currency)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCotizacionCurrency(
                      item.amount * item.quantity,
                      currency
                    )}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">
                    {item.notes ?? '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setEditItem(item);
                          setAddItemOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteItemId(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Summary */}
      {data.items.length > 0 && (
        <div className="space-y-4 rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Resumen</h2>
          <div className="space-y-2">
            {categoryTotals.map((ct) => (
              <div key={ct.name} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{ct.name}</span>
                <span>{formatCotizacionCurrency(ct.total, currency)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t pt-3 text-lg font-bold">
            <span>Total</span>
            <span>{formatCotizacionCurrency(data.total, currency)}</span>
          </div>
        </div>
      )}

      {/* Add/Edit item dialog */}
      <AddItemDialog
        open={addItemOpen}
        onOpenChange={(o) => {
          setAddItemOpen(o);
          if (!o) setEditItem(undefined);
        }}
        cotizacionId={cotizacionId}
        currency={currency}
        editItem={editItem}
        onSaved={handleItemSaved}
      />

      {/* Delete item confirmation */}
      <AlertDialog
        open={!!deleteItemId}
        onOpenChange={(o) => !o && setDeleteItemId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ítem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteItemId && handleDeleteItem(deleteItemId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete cotización confirmation */}
      <AlertDialog open={deleteCotOpen} onOpenChange={setDeleteCotOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cotización?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos los ítems de &quot;{data.name}&quot;. Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteCotizacion}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
