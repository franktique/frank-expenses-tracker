"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { AmortizationPayment } from "@/types/loan-simulator";
import { formatCurrency } from "@/lib/loan-calculations";

interface LoanProjectionChartProps {
  payments: AmortizationPayment[];
  showYearly?: boolean;
}

export function LoanProjectionChart({
  payments,
  showYearly = false,
}: LoanProjectionChartProps) {
  // Process data for chart - either yearly or all payments
  const chartData = useMemo(() => {
    if (showYearly && payments.length > 12) {
      // Aggregate by year
      const yearlyData: Record<
        number,
        { principal: number; interest: number; balance: number }
      > = {};

      payments.forEach((payment) => {
        const date = new Date(payment.date);
        const year = date.getFullYear();

        if (!yearlyData[year]) {
          yearlyData[year] = {
            principal: 0,
            interest: 0,
            balance: payment.remainingBalance,
          };
        }

        yearlyData[year].principal += payment.principalPortion;
        yearlyData[year].interest += payment.interestPortion;
        yearlyData[year].balance = payment.remainingBalance;
      });

      return Object.entries(yearlyData)
        .map(([year, data]) => ({
          period: `Año ${year}`,
          principal: Math.round(data.principal),
          interest: Math.round(data.interest),
          balance: Math.round(data.balance),
        }))
        .sort((a, b) => a.period.localeCompare(b.period));
    } else {
      // Show all payments (sample if too many)
      const maxPoints = 100;
      const step = Math.max(1, Math.floor(payments.length / maxPoints));

      return payments
        .filter((_, index) => index % step === 0 || index === payments.length - 1)
        .map((payment) => ({
          period: `#${payment.paymentNumber}`,
          principal: Math.round(payment.principalPortion),
          interest: Math.round(payment.interestPortion),
          balance: Math.round(payment.remainingBalance),
        }));
    }
  }, [payments, showYearly]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-2">{payload[0].payload.period}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Proyección del Préstamo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="rgb(34, 197, 94)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="rgb(34, 197, 94)"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(249, 115, 22)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="rgb(249, 115, 22)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(59, 130, 246)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="rgb(59, 130, 246)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="period"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="interest"
                name="Interés"
                stroke="rgb(249, 115, 22)"
                fillOpacity={1}
                fill="url(#colorInterest)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="principal"
                name="Capital"
                stroke="rgb(34, 197, 94)"
                fillOpacity={1}
                fill="url(#colorPrincipal)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="balance"
                name="Balance Restante"
                stroke="rgb(59, 130, 246)"
                fillOpacity={1}
                fill="url(#colorBalance)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Visualización del pago de capital vs interés y el balance restante a lo
          largo del tiempo.
        </p>
      </CardContent>
    </Card>
  );
}
