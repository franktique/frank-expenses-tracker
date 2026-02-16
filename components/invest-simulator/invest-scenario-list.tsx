'use client';

import { useState } from 'react';
import {
  Trash2,
  Upload,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type {
  InvestmentScenario,
  CurrencyCode,
} from '@/types/invest-simulator';
import {
  formatCurrency,
  formatPercentage,
  COMPOUNDING_FREQUENCIES,
} from '@/types/invest-simulator';

interface InvestScenarioListProps {
  scenarios: (InvestmentScenario & { projectedFinalBalance?: number })[];
  onLoad: (scenario: InvestmentScenario) => void;
  onDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export function InvestScenarioList({
  scenarios,
  onLoad,
  onDelete,
  isLoading = false,
}: InvestScenarioListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      await onDelete(deleteId);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const scenarioToDelete = scenarios.find((s) => s.id === deleteId);

  return (
    <>
      <Card>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto w-full justify-between p-0 hover:bg-transparent"
              >
                <CardTitle className="text-lg">
                  Simulaciones Guardadas ({scenarios.length})
                </CardTitle>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>

          <CollapsibleContent>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Cargando simulaciones...
                </div>
              ) : scenarios.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No hay simulaciones guardadas</p>
                  <p className="mt-1 text-sm">
                    Configura una simulación y guárdala para verla aquí
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="text-right">Inicial</TableHead>
                        <TableHead className="text-right">Mensual</TableHead>
                        <TableHead className="text-right">Plazo</TableHead>
                        <TableHead className="text-right">Tasa</TableHead>
                        <TableHead className="text-right">
                          Capitalización
                        </TableHead>
                        <TableHead className="text-right">Proyección</TableHead>
                        <TableHead className="w-[30px]"></TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scenarios.map((scenario) => (
                        <TableRow key={scenario.id}>
                          <TableCell className="font-medium">
                            {scenario.name}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              scenario.initialAmount,
                              scenario.currency
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              scenario.monthlyContribution,
                              scenario.currency
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {scenario.termMonths} m
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPercentage(scenario.annualRate)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {
                              COMPOUNDING_FREQUENCIES[
                                scenario.compoundingFrequency
                              ].label
                            }
                          </TableCell>
                          <TableCell className="text-right font-semibold text-purple-600 dark:text-purple-400">
                            {scenario.projectedFinalBalance
                              ? formatCurrency(
                                  scenario.projectedFinalBalance,
                                  scenario.currency
                                )
                              : '—'}
                          </TableCell>
                          <TableCell>
                            {scenario.notes && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center">
                                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="left"
                                    className="max-w-xs"
                                  >
                                    <p className="whitespace-pre-wrap text-sm">
                                      {scenario.notes}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => onLoad(scenario)}
                                title="Cargar simulación"
                              >
                                <Upload className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteId(scenario.id)}
                                title="Eliminar simulación"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar simulación?</AlertDialogTitle>
            <AlertDialogDescription>
              {scenarioToDelete && (
                <>
                  ¿Estás seguro de que deseas eliminar la simulación &quot;
                  {scenarioToDelete.name}&quot;? Esta acción no se puede
                  deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
