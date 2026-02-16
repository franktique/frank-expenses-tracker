'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  InvestmentPeriodDetail,
  CurrencyCode,
} from '@/types/invest-simulator';
import { formatCurrency } from '@/types/invest-simulator';

interface InvestProjectionChartProps {
  schedule: InvestmentPeriodDetail[];
  currency: CurrencyCode;
  compoundingFrequency: 'daily' | 'monthly';
}

export function InvestProjectionChart({
  schedule,
  currency,
  compoundingFrequency,
}: InvestProjectionChartProps) {
  // Prepare chart data
  const chartData = schedule.map((period) => ({
    period: period.periodNumber,
    date: period.date,
    saldoTotal: period.closingBalance,
    aportes: period.cumulativeContributions,
    intereses: period.cumulativeInterest,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-gray-900">
          <p className="mb-2 font-semibold">
            {compoundingFrequency === 'monthly'
              ? `Mes ${label}`
              : `Día ${label}`}
          </p>
          <p className="text-sm text-muted-foreground">{data.date}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="mr-2 inline-block h-3 w-3 rounded bg-purple-500" />
              Saldo Total:{' '}
              <span className="font-semibold">
                {formatCurrency(data.saldoTotal, currency)}
              </span>
            </p>
            <p className="text-sm">
              <span className="mr-2 inline-block h-3 w-3 rounded bg-blue-500" />
              Aportes:{' '}
              <span className="font-semibold">
                {formatCurrency(data.aportes, currency)}
              </span>
            </p>
            <p className="text-sm">
              <span className="mr-2 inline-block h-3 w-3 rounded bg-green-500" />
              Intereses:{' '}
              <span className="font-semibold text-green-600">
                {formatCurrency(data.intereses, currency)}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Format Y axis values
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Proyección de Crecimiento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorAportes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorIntereses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: compoundingFrequency === 'monthly' ? 'Meses' : 'Días',
                  position: 'insideBottomRight',
                  offset: -5,
                  style: { fontSize: 12, fill: 'var(--muted-foreground)' },
                }}
              />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value: string) => {
                  const labels: Record<string, string> = {
                    aportes: 'Capital Aportado',
                    intereses: 'Intereses Acumulados',
                  };
                  return labels[value] || value;
                }}
              />
              <Area
                type="monotone"
                dataKey="aportes"
                stackId="1"
                stroke="#3b82f6"
                fill="url(#colorAportes)"
                name="aportes"
              />
              <Area
                type="monotone"
                dataKey="intereses"
                stackId="1"
                stroke="#22c55e"
                fill="url(#colorIntereses)"
                name="intereses"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
