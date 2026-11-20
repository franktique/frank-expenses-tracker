'use client';

import { useCallback, useEffect, useState } from 'react';
import { CopyCheck, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/types/estudios';
import type {
  DuplicateReview,
  ResolvableField,
  ReviewDetailLine,
  ReviewExpenseView,
} from '@/types/duplicate-reviews';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

type ScalarField = Exclude<ResolvableField, 'details'>;

const FIELD_ROWS: {
  field: ScalarField;
  label: string;
  value: (e: ReviewExpenseView) => string;
}[] = [
  { field: 'date', label: 'Fecha', value: (e) => e.date },
  { field: 'description', label: 'Descripción', value: (e) => e.description },
  { field: 'amount', label: 'Monto', value: (e) => formatCurrency(e.amount) },
  {
    field: 'category_id',
    label: 'Categoría',
    value: (e) => e.category_name ?? '—',
  },
  {
    field: 'payment_method',
    label: 'Medio de pago',
    value: (e) =>
      PAYMENT_METHOD_LABELS[e.payment_method as PaymentMethod] ??
      e.payment_method,
  },
  {
    field: 'credit_card_id',
    label: 'Tarjeta',
    value: (e) => e.credit_card_label ?? '—',
  },
  { field: 'store_name', label: 'Tienda', value: (e) => e.store_name ?? '—' },
];

const RESOLVED_TOAST = {
  apply: 'Cambios aplicados',
  dismiss: 'Revisión descartada',
  create: 'Guardado como gasto nuevo',
} as const;

const detailsTotal = (lines: ReviewDetailLine[]) =>
  lines.reduce((sum, l) => sum + l.amount, 0);

function DetailList({ lines }: { lines: ReviewDetailLine[] }) {
  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin detalle</p>;
  }
  return (
    <ul className="space-y-1 text-sm">
      {lines.map((l) => (
        <li key={l.item_id} className="flex justify-between gap-3">
          <span>
            {l.item_name}
            {l.quantity ? (
              <span className="text-muted-foreground">
                {' '}
                × {l.quantity}
                {l.unit ? ` ${l.unit}` : ''}
              </span>
            ) : null}
          </span>
          <span className="tabular-nums">{formatCurrency(l.amount)}</span>
        </li>
      ))}
      <li className="flex justify-between gap-3 border-t pt-1 font-medium">
        <span>Total detalle</span>
        <span className="tabular-nums">
          {formatCurrency(detailsTotal(lines))}
        </span>
      </li>
    </ul>
  );
}

function ReviewCard({
  review,
  onResolved,
}: {
  review: DuplicateReview;
  onResolved: () => void;
}) {
  const { toast } = useToast();
  const { existing, proposed } = review;
  const [selected, setSelected] = useState<Set<ResolvableField>>(
    () => new Set(existing.details.length === 0 ? ['details'] : [])
  );
  const [busy, setBusy] = useState(false);

  const toggle = (field: ResolvableField) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });

  const resolve = async (
    body:
      | { action: 'dismiss' }
      | { action: 'create' }
      | { action: 'apply'; fields: ResolvableField[] }
  ) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/expense-duplicate-reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'No se pudo resolver la revisión');
      }
      toast({ title: RESOLVED_TOAST[body.action] });
      onResolved();
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {existing.description}
          <Badge variant="outline">{existing.period_name}</Badge>
          {existing.details.length === 0 ? (
            <Badge variant="secondary">Sin detalle</Badge>
          ) : null}
          {!existing.is_verified ? (
            <Badge variant="secondary">Sin verificar</Badge>
          ) : null}
        </CardTitle>
        <CardDescription>
          Escaneado desde el móvil el{' '}
          {new Date(review.created_at).toLocaleString('es-CO')}. Marcá qué datos
          del escaneo querés llevar al gasto existente, o guardalo como gasto
          nuevo si no es el mismo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Dato</th>
                <th className="py-2 pr-4 font-medium">Gasto existente</th>
                <th className="py-2 pr-4 font-medium">Escaneado (móvil)</th>
                <th className="py-2 font-medium">Usar escaneado</th>
              </tr>
            </thead>
            <tbody>
              {FIELD_ROWS.map(({ field, label, value }) => {
                const a = value(existing);
                const b = value(proposed);
                const differs = a !== b;
                return (
                  <tr key={field} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{label}</td>
                    <td className="py-2 pr-4">{a}</td>
                    <td
                      className={
                        differs
                          ? 'py-2 pr-4 font-medium text-amber-600'
                          : 'py-2 pr-4'
                      }
                    >
                      {b}
                    </td>
                    <td className="py-2">
                      {differs ? (
                        <Checkbox
                          checked={selected.has(field)}
                          onCheckedChange={() => toggle(field)}
                          aria-label={`Usar ${label} escaneado`}
                        />
                      ) : (
                        <span className="text-muted-foreground">Igual</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Detalle del gasto</h3>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected.has('details')}
                onCheckedChange={() => toggle('details')}
                disabled={proposed.details.length === 0}
              />
              {existing.details.length > 0
                ? 'Reemplazar detalle por el escaneado'
                : 'Llenar detalle con el escaneado'}
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="mb-2 text-xs uppercase text-muted-foreground">
                Existente
              </p>
              <DetailList lines={existing.details} />
            </div>
            <div className="rounded-md border p-3">
              <p className="mb-2 text-xs uppercase text-muted-foreground">
                Escaneado (móvil)
              </p>
              <DetailList lines={proposed.details} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => resolve({ action: 'dismiss' })}
          >
            Descartar escaneo
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => resolve({ action: 'create' })}
          >
            Guardar como gasto nuevo
          </Button>
          <Button
            disabled={busy || selected.size === 0}
            onClick={() =>
              resolve({ action: 'apply', fields: Array.from(selected) })
            }
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Aplicar seleccionados ({selected.size})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DuplicateReviewsView() {
  const [reviews, setReviews] = useState<DuplicateReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/expense-duplicate-reviews?status=pending');
      if (!res.ok) throw new Error('No se pudieron cargar las revisiones');
      setReviews(await res.json());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <CopyCheck className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">Posibles duplicados</h1>
          <p className="text-sm text-muted-foreground">
            Gastos escaneados en el móvil que coinciden con uno ya ingresado.
            Compará y decidí qué se actualiza.
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {reviews === null && !error ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : null}
      {reviews?.length === 0 ? (
        <p className="text-muted-foreground">No hay revisiones pendientes.</p>
      ) : null}
      {reviews?.map((review) => (
        <ReviewCard key={review.id} review={review} onResolved={load} />
      ))}
    </div>
  );
}
