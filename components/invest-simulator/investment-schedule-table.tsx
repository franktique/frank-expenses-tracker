'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type {
  InvestmentPeriodDetail,
  CurrencyCode,
} from '@/types/invest-simulator';
import { formatCurrency } from '@/types/invest-simulator';

interface InvestmentScheduleTableProps {
  schedule: InvestmentPeriodDetail[];
  currency: CurrencyCode;
  compoundingFrequency: 'daily' | 'monthly';
}

const ITEMS_PER_PAGE = 12;

export function InvestmentScheduleTable({
  schedule,
  currency,
  compoundingFrequency,
}: InvestmentScheduleTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(schedule.length / ITEMS_PER_PAGE);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return schedule.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [schedule, currentPage]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const periodLabel = compoundingFrequency === 'monthly' ? 'Mes' : 'Día';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          Detalle por {compoundingFrequency === 'monthly' ? 'Mes' : 'Día'}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {schedule.length}{' '}
          {compoundingFrequency === 'monthly' ? 'meses' : 'días'}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">{periodLabel}</TableHead>
                <TableHead className="text-right">Saldo Inicial</TableHead>
                <TableHead className="text-right">Aporte</TableHead>
                <TableHead className="text-right">Intereses</TableHead>
                <TableHead className="text-right">Saldo Final</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((period) => (
                <TableRow key={period.periodNumber}>
                  <TableCell className="font-medium">
                    {period.periodNumber}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(period.openingBalance, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {period.contribution > 0 ? (
                      <span className="text-blue-600 dark:text-blue-400">
                        +{formatCurrency(period.contribution, currency)}
                      </span>
                    ) : (
                      formatCurrency(0, currency)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-green-600 dark:text-green-400">
                      +{formatCurrency(period.interestEarned, currency)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(period.closingBalance, currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Anterior
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Siguiente
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Summary row */}
        {schedule.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 text-sm md:grid-cols-4">
            <div>
              <span className="block text-muted-foreground">Total Aportes</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {formatCurrency(
                  schedule[schedule.length - 1].cumulativeContributions,
                  currency
                )}
              </span>
            </div>
            <div>
              <span className="block text-muted-foreground">
                Total Intereses
              </span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(
                  schedule[schedule.length - 1].cumulativeInterest,
                  currency
                )}
              </span>
            </div>
            <div>
              <span className="block text-muted-foreground">Saldo Final</span>
              <span className="font-semibold">
                {formatCurrency(
                  schedule[schedule.length - 1].closingBalance,
                  currency
                )}
              </span>
            </div>
            <div>
              <span className="block text-muted-foreground">Rendimiento</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {(
                  (schedule[schedule.length - 1].cumulativeInterest /
                    schedule[schedule.length - 1].cumulativeContributions) *
                  100
                ).toFixed(2)}
                %
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
