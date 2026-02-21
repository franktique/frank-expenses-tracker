'use client';

import { TrendingUp, Wallet, Calendar, Percent } from 'lucide-react';
import {
  formatCurrency,
  formatPercentage,
  type CurrencyCode,
} from '@/types/invest-simulator';

interface InvestTargetIncomeResultsProps {
  requiredCapital: number;
  targetMonthlyIncome: number;
  annualRate: number;
  monthlyRate: number;
  currency: CurrencyCode;
}

export function InvestTargetIncomeResults({
  requiredCapital,
  targetMonthlyIncome,
  annualRate,
  monthlyRate,
  currency,
}: InvestTargetIncomeResultsProps) {
  const annualIncome = targetMonthlyIncome * 12;

  return (
    <div className="space-y-4">
      {/* Primary result card */}
      <div className="rounded-lg bg-purple-600 p-6 text-white">
        <div className="flex items-center gap-2 text-purple-200">
          <Wallet className="h-4 w-4" />
          <span className="text-sm font-medium">Capital requerido</span>
        </div>
        <div className="mt-2 text-3xl font-bold">
          {requiredCapital > 0
            ? formatCurrency(requiredCapital, currency)
            : '—'}
        </div>
        <p className="mt-1 text-sm text-purple-200">
          Capital necesario para generar{' '}
          {formatCurrency(targetMonthlyIncome, currency)} mensuales
        </p>
      </div>

      {/* Detail cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-medium">Ingreso anual</span>
          </div>
          <div className="mt-1 text-xl font-bold text-purple-700 dark:text-purple-300">
            {annualIncome > 0 ? formatCurrency(annualIncome, currency) : '—'}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Equivalente en 12 meses
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">Tasa EA utilizada</span>
          </div>
          <div className="mt-1 text-xl font-bold text-purple-700 dark:text-purple-300">
            {formatPercentage(annualRate, 2)}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Efectiva anual</p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Percent className="h-4 w-4" />
            <span className="text-xs font-medium">Tasa mensual</span>
          </div>
          <div className="mt-1 text-xl font-bold text-purple-700 dark:text-purple-300">
            {formatPercentage(monthlyRate * 100, 4)}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Efectiva mensual
          </p>
        </div>
      </div>

      {/* Formula explanation */}
      <div className="rounded-lg border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-semibold">Fórmula:</span> Capital = Ingreso
        mensual ÷ Tasa mensual | Tasa mensual = (1 + EA)^(1/12) − 1
      </div>
    </div>
  );
}
