'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info, Calculator, TrendingUp, Calendar, Clock } from 'lucide-react';
import type {
  RateConversionResult,
  RateConversionDisplay,
  RateType,
} from '@/types/interest-rate-simulator';
import {
  RATE_TYPES,
  formatRateAsPercentage,
} from '@/types/interest-rate-simulator';

interface InterestRateResultsProps {
  conversions: RateConversionResult;
  conversionDisplay: RateConversionDisplay[];
  inputRateType: RateType;
}

// Icon mapping for each rate type
const rateTypeIcons: Record<RateType, React.ReactNode> = {
  EA: <TrendingUp className="h-5 w-5" />,
  EM: <Calendar className="h-5 w-5" />,
  ED: <Clock className="h-5 w-5" />,
  NM: <Calculator className="h-5 w-5" />,
  NA: <Calculator className="h-5 w-5" />,
};

// Color mapping for each rate type
const rateTypeColors: Record<RateType, string> = {
  EA: 'bg-blue-500',
  EM: 'bg-green-500',
  ED: 'bg-amber-500',
  NM: 'bg-purple-500',
  NA: 'bg-rose-500',
};

const rateTypeBgColors: Record<RateType, string> = {
  EA: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
  EM: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
  ED: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
  NM: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
  NA: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800',
};

const rateTypeTextColors: Record<RateType, string> = {
  EA: 'text-blue-700 dark:text-blue-300',
  EM: 'text-green-700 dark:text-green-300',
  ED: 'text-amber-700 dark:text-amber-300',
  NM: 'text-purple-700 dark:text-purple-300',
  NA: 'text-rose-700 dark:text-rose-300',
};

export function InterestRateResults({
  conversions,
  conversionDisplay,
  inputRateType,
}: InterestRateResultsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Tasas Equivalentes</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 cursor-help text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                Todas estas tasas son equivalentes entre sí. Generan el mismo
                rendimiento o costo financiero.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {conversionDisplay.map((item) => (
          <Card
            key={item.rateType}
            className={`relative overflow-hidden transition-all ${
              item.isInput
                ? 'shadow-lg ring-2 ring-purple-500'
                : 'hover:shadow-md'
            } ${rateTypeBgColors[item.rateType]}`}
          >
            {/* Input indicator */}
            {item.isInput && (
              <div className="absolute right-0 top-0">
                <Badge className="rounded-none rounded-bl-lg bg-purple-600 text-white">
                  Ingresada
                </Badge>
              </div>
            )}

            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <div
                  className={`rounded-lg p-2 ${rateTypeColors[item.rateType]} text-white`}
                >
                  {rateTypeIcons[item.rateType]}
                </div>
                <div className="flex flex-col">
                  <span className={rateTypeTextColors[item.rateType]}>
                    {RATE_TYPES[item.rateType].label}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {RATE_TYPES[item.rateType].shortLabel}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Rate value */}
              <div className="text-center">
                <span
                  className={`text-4xl font-bold ${rateTypeTextColors[item.rateType]}`}
                >
                  {formatRateAsPercentage(item.value, 4)}
                </span>
              </div>

              {/* Formula */}
              <div className="border-current/10 border-t pt-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Fórmula:</span>{' '}
                  <code className="rounded bg-black/5 px-1 py-0.5 text-xs dark:bg-white/5">
                    {item.formula}
                  </code>
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Educational note */}
      <Card className="border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <div className="h-fit rounded-lg bg-gray-200 p-2 dark:bg-gray-800">
              <Info className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>¿Cómo funcionan las conversiones?</strong>
              </p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  <strong>Tasas Efectivas:</strong> Incluyen el efecto del
                  interés compuesto. EA (anual), EM (mensual), ED (diaria).
                </li>
                <li>
                  <strong>Tasas Nominales:</strong> No incluyen capitalización
                  directamente. Se dividen por el número de períodos.
                </li>
                <li>
                  <strong>Equivalencia:</strong> Una tasa del{' '}
                  {formatRateAsPercentage(conversions.ea, 2)} EA genera el mismo
                  rendimiento que {formatRateAsPercentage(conversions.em, 4)}{' '}
                  mensual.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
