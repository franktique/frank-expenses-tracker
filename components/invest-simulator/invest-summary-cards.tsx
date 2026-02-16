'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { InvestmentSummary, CurrencyCode } from '@/types/invest-simulator';
import { formatCurrency, formatPercentage } from '@/types/invest-simulator';

interface InvestSummaryCardsProps {
  summary: InvestmentSummary;
  currency: CurrencyCode;
  termMonths: number;
}

export function InvestSummaryCards({
  summary,
  currency,
  termMonths,
}: InvestSummaryCardsProps) {
  const formatYearsMonths = (months: number): string => {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years === 0) {
      return `${months} meses`;
    } else if (remainingMonths === 0) {
      return years === 1 ? '1 año' : `${years} años`;
    } else {
      return `${years} año${years > 1 ? 's' : ''} y ${remainingMonths} mes${remainingMonths > 1 ? 'es' : ''}`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Resultado principal destacado */}
      <Card className="border-purple-200 bg-white dark:border-purple-800 dark:bg-gray-900">
        <CardContent className="p-6">
          <p className="mb-2 text-lg text-muted-foreground">
            En {formatYearsMonths(termMonths)} tendrías
          </p>
          <p className="mb-4 text-4xl font-bold text-purple-600 dark:text-purple-400 md:text-5xl">
            {formatCurrency(summary.finalBalance, currency)}
          </p>
          <div className="h-1 w-full rounded bg-purple-600 dark:bg-purple-400" />
        </CardContent>
      </Card>

      {/* Desglose */}
      <Card className="bg-white dark:bg-gray-900">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Habrías depositado:</span>
            <span className="font-semibold">
              {formatCurrency(summary.totalContributions, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Tu dinero habría crecido:
            </span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(summary.totalInterestEarned, currency)}
            </span>
          </div>

          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Monto inicial:</span>
              <span>{formatCurrency(summary.initialAmount, currency)}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Total aportes mensuales:
              </span>
              <span>
                {formatCurrency(summary.totalMonthlyContributions, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tasa EA:</span>
              <span>{formatPercentage(summary.annualRate)}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Tasa{' '}
                {summary.compoundingFrequency === 'monthly'
                  ? 'mensual'
                  : 'diaria'}{' '}
                efectiva:
              </span>
              <span>
                {formatPercentage(
                  summary.compoundingFrequency === 'monthly'
                    ? summary.effectiveMonthlyRate
                    : summary.effectiveDailyRate,
                  4
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Capitalización:</span>
              <span>
                {summary.compoundingFrequency === 'monthly'
                  ? 'Mensual'
                  : 'Diaria'}
              </span>
            </div>
          </div>

          {/* Nota informativa */}
          <p className="mt-4 border-t pt-4 text-xs text-muted-foreground">
            Este es un ejemplo con la tasa de rendimiento de{' '}
            {formatPercentage(summary.annualRate)} efectivo anual, considerando
            que no retires el dinero de tu inversión.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
