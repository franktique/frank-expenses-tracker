"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { RateComparisonResult, CurrencyCode } from "@/types/invest-simulator";
import { formatCurrency, formatPercentage } from "@/types/invest-simulator";

interface RateComparisonPanelProps {
  comparisons: RateComparisonResult[];
  currency: CurrencyCode;
  onAddRate: (rate: number, label?: string) => void;
  onRemoveRate: (rate: number) => void;
}

export function RateComparisonPanel({
  comparisons,
  currency,
  onAddRate,
  onRemoveRate,
}: RateComparisonPanelProps) {
  const [newRate, setNewRate] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const handleAddRate = () => {
    const rate = parseFloat(newRate);
    if (!isNaN(rate) && rate >= 0 && rate <= 100) {
      onAddRate(rate, newLabel.trim() || undefined);
      setNewRate("");
      setNewLabel("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddRate();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Comparar Tasas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new rate form */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Label htmlFor="newRate" className="sr-only">
              Nueva tasa
            </Label>
            <div className="relative">
              <Input
                id="newRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Nueva tasa %"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
          </div>
          <div className="flex-1">
            <Label htmlFor="newLabel" className="sr-only">
              Etiqueta (opcional)
            </Label>
            <Input
              id="newLabel"
              type="text"
              placeholder="Etiqueta (opcional)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button onClick={handleAddRate} disabled={!newRate}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        </div>

        {/* Comparison table */}
        {comparisons.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tasa EA</TableHead>
                  <TableHead className="text-right">Monto Final</TableHead>
                  <TableHead className="text-right">Rendimiento</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisons.map((comp) => (
                  <TableRow
                    key={comp.rate}
                    className={comp.isBaseRate ? "bg-purple-50 dark:bg-purple-950/20" : ""}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatPercentage(comp.rate)}
                        </span>
                        {comp.isBaseRate && (
                          <Badge variant="secondary" className="text-xs">
                            Base
                          </Badge>
                        )}
                        {comp.label && !comp.isBaseRate && (
                          <span className="text-xs text-muted-foreground">
                            ({comp.label})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(comp.finalBalance, currency)}
                    </TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">
                      {formatCurrency(comp.totalInterestEarned, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {comp.isBaseRate ? (
                        <span className="text-muted-foreground">—</span>
                      ) : comp.differenceFromBase > 0 ? (
                        <span className="text-green-600 dark:text-green-400">
                          +{formatCurrency(comp.differenceFromBase, currency)}
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">
                          {formatCurrency(comp.differenceFromBase, currency)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {!comp.isBaseRate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => onRemoveRate(comp.rate)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Agrega tasas para comparar el rendimiento</p>
            <p className="text-sm mt-1">
              Por ejemplo: tasas de diferentes bancos o CDTs
            </p>
          </div>
        )}

        {/* Summary insights */}
        {comparisons.length > 1 && (
          <div className="pt-4 border-t">
            {(() => {
              const bestRate = comparisons.reduce((best, curr) =>
                curr.finalBalance > best.finalBalance ? curr : best
              );
              const worstRate = comparisons.reduce((worst, curr) =>
                curr.finalBalance < worst.finalBalance ? curr : worst
              );
              const maxDiff = bestRate.finalBalance - worstRate.finalBalance;

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <span className="text-muted-foreground block">Mejor opción</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {formatPercentage(bestRate.rate)}
                    </span>
                    {bestRate.label && (
                      <span className="text-xs block text-muted-foreground">
                        ({bestRate.label})
                      </span>
                    )}
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <span className="text-muted-foreground block">Peor opción</span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {formatPercentage(worstRate.rate)}
                    </span>
                    {worstRate.label && (
                      <span className="text-xs block text-muted-foreground">
                        ({worstRate.label})
                      </span>
                    )}
                  </div>
                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <span className="text-muted-foreground block">Diferencia máxima</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(maxDiff, currency)}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
