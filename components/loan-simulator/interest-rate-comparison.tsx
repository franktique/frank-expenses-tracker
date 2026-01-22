"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, TrendingUp } from "lucide-react";
import type { LoanScenario } from "@/types/loan-simulator";
import type { LoanComparison } from "@/types/loan-simulator";
import { generateLoanComparisons, formatCurrency } from "@/lib/loan-calculations";

interface InterestRateComparisonProps {
  scenario: LoanScenario;
  additionalRates?: number[];
  onRatesChange?: (rates: number[]) => void;
}

export function InterestRateComparison({
  scenario,
  additionalRates = [],
  onRatesChange,
}: InterestRateComparisonProps) {
  const [newRate, setNewRate] = useState("");
  const [localRates, setLocalRates] = useState<number[]>(additionalRates);

  const comparisons = generateLoanComparisons(scenario, localRates);

  const handleAddRate = () => {
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0 || rate > 100) {
      return;
    }

    const updatedRates = [...localRates, rate].sort((a, b) => a - b);
    setLocalRates(updatedRates);
    setNewRate("");
    onRatesChange?.(updatedRates);
  };

  const handleRemoveRate = (rate: number) => {
    const updatedRates = localRates.filter((r) => r !== rate);
    setLocalRates(updatedRates);
    onRatesChange?.(updatedRates);
  };

  const getRateLabel = (rate: number) => {
    if (rate === scenario.interestRate) {
      return `${rate}% (Actual)`;
    }
    return `${rate}%`;
  };

  const getDifferenceFromBase = (rate: number, value: number) => {
    const baseComparison = comparisons.find((c) => c.interestRate === scenario.interestRate);
    if (!baseComparison || rate === scenario.interestRate) return null;

    const diff = value - baseComparison[value === comparisons[0].monthlyPayment ? 'monthlyPayment' : 'totalInterest'];
    const percentage = ((diff / baseComparison.totalInterest) * 100).toFixed(1);

    return {
      amount: diff,
      percentage,
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Comparación de Tasas de Interés
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Add Rate Input */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <Label htmlFor="newRate" className="sr-only">
              Nueva Tasa
            </Label>
            <Input
              id="newRate"
              type="number"
              step="0.1"
              min="0.1"
              max="100"
              placeholder="Agregar tasa (ej: 9.5)"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddRate();
                }
              }}
            />
          </div>
          <Button
            onClick={handleAddRate}
            disabled={!newRate || parseFloat(newRate) <= 0 || parseFloat(newRate) > 100}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">Tasa</th>
                {comparisons.map((comparison) => (
                  <th
                    key={comparison.interestRate}
                    className="text-right py-2 px-3"
                  >
                    {getRateLabel(comparison.interestRate)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Monthly Payment Row */}
              <tr className="border-b">
                <td className="py-2 px-3 font-medium">Pago Mensual</td>
                {comparisons.map((comparison) => (
                  <td
                    key={`monthly-${comparison.interestRate}`}
                    className="text-right py-2 px-3"
                  >
                    {formatCurrency(comparison.monthlyPayment, scenario.currency)}
                  </td>
                ))}
              </tr>

              {/* Total Interest Row */}
              <tr className="border-b">
                <td className="py-2 px-3 font-medium">Interés Total</td>
                {comparisons.map((comparison) => {
                  const diff = getDifferenceFromBase(
                    comparison.interestRate,
                    comparison.totalInterest
                  );

                  return (
                    <td
                      key={`interest-${comparison.interestRate}`}
                      className="text-right py-2 px-3"
                    >
                      <div>{formatCurrency(comparison.totalInterest, scenario.currency)}</div>
                      {diff && (
                        <div
                          className={`text-xs ${
                            diff.amount > 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-green-600 dark:text-green-400"
                          }`}
                        >
                          {diff.amount > 0 ? "+" : ""}
                          {formatCurrency(diff.amount, scenario.currency)} ({diff.percentage}%)
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Total Payment Row */}
              <tr className="border-b">
                <td className="py-2 px-3 font-medium">Pago Total</td>
                {comparisons.map((comparison) => {
                  const diff = getDifferenceFromBase(
                    comparison.interestRate,
                    comparison.totalPayment - scenario.principal
                  );

                  return (
                    <td
                      key={`total-${comparison.interestRate}`}
                      className="text-right py-2 px-3"
                    >
                      <div>{formatCurrency(comparison.totalPayment, scenario.currency)}</div>
                      {diff && comparison.interestRate !== scenario.interestRate && (
                        <div
                          className={`text-xs ${
                            diff.amount > 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-green-600 dark:text-green-400"
                          }`}
                        >
                          {diff.amount > 0 ? "+" : ""}
                          {formatCurrency(diff.amount, scenario.currency)}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Remove Rate Row */}
              {localRates.length > 0 && (
                <tr>
                  <td></td>
                  {comparisons.map((comparison) => (
                    <td
                      key={`remove-${comparison.interestRate}`}
                      className="text-right py-2 px-3"
                    >
                      {comparison.interestRate !== scenario.interestRate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRemoveRate(comparison.interestRate)
                          }
                          className="h-6 px-2 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Eliminar
                        </Button>
                      )}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Help Text */}
        <p className="text-xs text-muted-foreground mt-4">
          Compara diferentes tasas de interés para ver cómo afectan tus pagos
          mensuales y el costo total del préstamo.
        </p>
      </CardContent>
    </Card>
  );
}
