"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Calendar, Percent } from "lucide-react";
import type { LoanSummary, CurrencyCode } from "@/types/loan-simulator";
import { formatCurrency, formatDate } from "@/lib/loan-calculations";

interface LoanSummaryCardsProps {
  summary: LoanSummary;
  originalSummary?: LoanSummary;
  monthsSaved?: number;
  interestSaved?: number;
  currency?: CurrencyCode;
}

export function LoanSummaryCards({
  summary,
  originalSummary,
  monthsSaved,
  interestSaved,
  currency = "USD",
}: LoanSummaryCardsProps) {
  const hasExtraPayments = originalSummary !== undefined;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Monthly Payment */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Pago Mensual
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.monthlyPayment, currency)}
          </div>
          {hasExtraPayments && (
            <p className="text-xs text-muted-foreground mt-1">
              Pago base (no cambia con pagos extra)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Total Principal */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Capital
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.totalPrincipal, currency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Monto del préstamo
          </p>
        </CardContent>
      </Card>

      {/* Total Interest */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Interés Total
            {hasExtraPayments && interestSaved && interestSaved > 0 && (
              <span className="ml-2 text-green-600 dark:text-green-400">
                (-{formatCurrency(interestSaved, currency)})
              </span>
            )}
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.totalInterest, currency)}
          </div>
          {hasExtraPayments && originalSummary && (
            <p className="text-xs text-muted-foreground mt-1">
              Original: {formatCurrency(originalSummary.totalInterest, currency)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Total Payment */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Pago Total
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.totalPayment, currency)}
          </div>
          {hasExtraPayments && originalSummary && (
            <p className="text-xs text-muted-foreground mt-1">
              Original: {formatCurrency(originalSummary.totalPayment, currency)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payoff Date */}
      <Card className={hasExtraPayments && monthsSaved && monthsSaved > 0 ? "border-green-500 dark:border-green-700" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Fecha Final
            {hasExtraPayments && monthsSaved && monthsSaved > 0 && (
              <span className="ml-2 text-green-600 dark:text-green-400">
                (-{monthsSaved} meses)
              </span>
            )}
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatDate(summary.payoffDate)}
          </div>
          {hasExtraPayments && originalSummary && (
            <p className="text-xs text-muted-foreground mt-1">
              Original: {formatDate(originalSummary.payoffDate)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Term */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Plazo Real
            {hasExtraPayments && monthsSaved && monthsSaved > 0 && (
              <span className="ml-2 text-green-600 dark:text-green-400">
                (-{monthsSaved} meses)
              </span>
            )}
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.floor(summary.termMonths / 12)} años,{" "}
            {summary.termMonths % 12} meses
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.termMonths} pagos
          </p>
        </CardContent>
      </Card>

      {/* Interest Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Tasa de Interés
          </CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {((summary.totalInterest / summary.totalPrincipal) * 100).toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Interés como % del capital
          </p>
        </CardContent>
      </Card>

      {/* Payment-to-Principal Ratio */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Ratio Pago/Capital
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(summary.totalPayment / summary.totalPrincipal).toFixed(2)}x
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total pagado por cada $1 prestado
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
