'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useBudget } from '@/context/budget-context';
import {
  CreditCardDashboardResponse,
  CreditCardDashboardRow,
  CREDIT_CARD_FRANCHISE_LABELS,
} from '@/types/credit-cards';
import { TipoGastoBadge } from '@/components/tipo-gasto-badge';
import { TipoGasto } from '@/types/funds';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatCardName = (card: CreditCardDashboardRow['credit_card']) =>
  `${card.bank_name} – ${CREDIT_CARD_FRANCHISE_LABELS[card.franchise as keyof typeof CREDIT_CARD_FRANCHISE_LABELS] || card.franchise} ····${card.last_four_digits}`;

function DeltaBadge({ actual, projected }: { actual: number; projected: number }) {
  const delta = actual - projected;
  if (projected === 0) return null;
  if (delta > 0)
    return (
      <span className="inline-flex items-center gap-1 text-destructive text-xs font-medium">
        <TrendingUp className="h-3 w-3" />
        +{formatCurrency(delta)}
      </span>
    );
  if (delta < 0)
    return (
      <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
        <TrendingDown className="h-3 w-3" />
        {formatCurrency(delta)}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
      <Minus className="h-3 w-3" />
      {formatCurrency(0)}
    </span>
  );
}

function CardSection({ row }: { row: CreditCardDashboardRow }) {
  const [expanded, setExpanded] = useState(true);
  const chartData = [
    {
      name: 'Total',
      Proyectado: row.projected_total,
      Gastado: row.actual_total,
    },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <CreditCard className="h-5 w-5 text-muted-foreground shrink-0" />
            <CardTitle className="text-base truncate">{formatCardName(row.credit_card)}</CardTitle>
            {!row.credit_card.is_active && (
              <Badge variant="secondary" className="text-xs shrink-0">Inactiva</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {expanded ? 'Contraer' : 'Expandir'}
          </Button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-4 mt-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Proyectado</p>
            <p className="text-lg font-semibold">{formatCurrency(row.projected_total)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Gastado</p>
            <p className="text-lg font-semibold">{formatCurrency(row.actual_total)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Diferencia</p>
            <DeltaBadge actual={row.actual_total} projected={row.projected_total} />
            {row.projected_total === 0 && (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Compact bar chart */}
          {(row.actual_total > 0 || row.projected_total > 0) && (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={row.categories
                    .filter((c) => c.actual > 0 || c.projected > 0)
                    .slice(0, 12)
                    .map((c) => ({
                      name: c.category_name.length > 14
                        ? c.category_name.slice(0, 13) + '…'
                        : c.category_name,
                      Proyectado: c.projected,
                      Gastado: c.actual,
                    }))}
                  margin={{ top: 4, right: 4, left: 0, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10 }} width={60} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Proyectado" fill="#a5b4fc" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Gastado" fill="#6366f1" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category breakdown table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Proyectado</TableHead>
                <TableHead className="text-right">Gastado</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {row.categories.map((cat) => {
                const delta = cat.actual - cat.projected;
                return (
                  <TableRow key={cat.category_id}>
                    <TableCell className="font-medium">{cat.category_name}</TableCell>
                    <TableCell>
                      <TipoGastoBadge tipoGasto={cat.tipo_gasto as TipoGasto | undefined} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(cat.projected)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(cat.actual)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={
                          delta > 0
                            ? 'text-destructive'
                            : delta < 0
                            ? 'text-green-600'
                            : 'text-muted-foreground'
                        }
                      >
                        {delta > 0 ? '+' : ''}
                        {formatCurrency(delta)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Totals */}
              <TableRow className="font-semibold border-t-2">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(row.projected_total)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(row.actual_total)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span
                    className={
                      row.actual_total - row.projected_total > 0
                        ? 'text-destructive'
                        : row.actual_total - row.projected_total < 0
                        ? 'text-green-600'
                        : 'text-muted-foreground'
                    }
                  >
                    {row.actual_total - row.projected_total > 0 ? '+' : ''}
                    {formatCurrency(row.actual_total - row.projected_total)}
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}

function NoCardSection({
  data,
}: {
  data: CreditCardDashboardResponse['no_card'];
}) {
  const [expanded, setExpanded] = useState(false);
  if (data.categories.length === 0) return null;

  const projectedTotal = data.categories.reduce((s, c) => s + c.projected, 0);

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base text-muted-foreground">Sin Tarjeta Asignada</CardTitle>
            <CardDescription>
              Gastos sin tarjeta de crédito y presupuestos de categorías sin tarjeta por defecto
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {expanded ? 'Contraer' : 'Expandir'}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Proyectado</p>
            <p className="text-lg font-semibold">{formatCurrency(projectedTotal)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Gastado</p>
            <p className="text-lg font-semibold">{formatCurrency(data.actual_total)}</p>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Proyectado</TableHead>
                <TableHead className="text-right">Gastado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.categories.map((cat) => (
                <TableRow key={cat.category_id}>
                  <TableCell className="font-medium">{cat.category_name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(cat.projected)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(cat.actual)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}

export function CreditCardDashboardView() {
  const { activePeriod } = useBudget();
  const [data, setData] = useState<CreditCardDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (periodId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/credit-cards/dashboard?period_id=${periodId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al cargar los datos');
      }
      const json: CreditCardDashboardResponse = await res.json();
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activePeriod?.id) {
      fetchData(activePeriod.id);
    }
  }, [activePeriod?.id, fetchData]);

  if (!activePeriod) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
        <CreditCard className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">
          No hay un período activo seleccionado. Selecciona un período para ver el dashboard.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 p-6 text-center text-destructive">
        <p className="font-medium">Error al cargar los datos</p>
        <p className="text-sm mt-1">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => activePeriod?.id && fetchData(activePeriod.id)}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const totalProjected = data.cards.reduce((s, c) => s + c.projected_total, 0);
  const totalActual = data.cards.reduce((s, c) => s + c.actual_total, 0);

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      {data.cards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tarjetas con datos</CardDescription>
              <CardTitle className="text-2xl">{data.cards.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Proyectado</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(totalProjected)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Gastado</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(totalActual)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Diferencia</CardDescription>
              <CardTitle className={`text-2xl ${totalActual - totalProjected > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {totalActual - totalProjected > 0 ? '+' : ''}{formatCurrency(totalActual - totalProjected)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Per-card sections */}
      {data.cards.length === 0 && data.no_card.categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
          <CreditCard className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            No hay datos de tarjetas de crédito para el período <strong>{data.period_name}</strong>.
          </p>
          <p className="text-sm text-muted-foreground">
            Asocia una tarjeta por defecto a tus categorías para ver proyecciones aquí.
          </p>
        </div>
      ) : (
        <>
          {data.cards.map((row) => (
            <CardSection key={row.credit_card.id} row={row} />
          ))}
          <NoCardSection data={data.no_card} />
        </>
      )}
    </div>
  );
}
