'use client';

import { useState } from 'react';
import { RefreshCw, Trash2, Upload, Search, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { InterestRateScenarioWithConversions } from '@/types/interest-rate-simulator';
import {
  RATE_TYPES,
  formatRateAsPercentage,
} from '@/types/interest-rate-simulator';

interface InterestRateScenarioListProps {
  scenarios: InterestRateScenarioWithConversions[];
  isLoading: boolean;
  onLoad: (scenario: InterestRateScenarioWithConversions) => void;
  onDelete: (scenarioId: string) => Promise<void>;
  onRefresh: () => void;
  loadedScenarioId: string | null;
}

export function InterestRateScenarioList({
  scenarios,
  isLoading,
  onLoad,
  onDelete,
  onRefresh,
  loadedScenarioId,
}: InterestRateScenarioListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredScenarios = scenarios.filter((scenario) =>
    scenario.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (scenarioId: string) => {
    setDeletingId(scenarioId);
    try {
      await onDelete(scenarioId);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-purple-600" />
            Mis Simulaciones de Tasas
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[200px] pl-8"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {scenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-purple-100 p-4 dark:bg-purple-900/30">
              <Calculator className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="mb-2 text-lg font-medium">
              No hay simulaciones guardadas
            </h3>
            <p className="max-w-sm text-muted-foreground">
              Crea tu primera simulación de tasas y guárdala para acceder a ella
              más tarde.
            </p>
          </div>
        ) : filteredScenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="mb-4 h-8 w-8 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">Sin resultados</h3>
            <p className="text-muted-foreground">
              No se encontraron simulaciones que coincidan con &quot;
              {searchQuery}&quot;
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tasa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>EA Equivalente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScenarios.map((scenario) => (
                  <TableRow
                    key={scenario.id}
                    className={
                      scenario.id === loadedScenarioId
                        ? 'bg-purple-50 dark:bg-purple-950/20'
                        : ''
                    }
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {scenario.name}
                        {scenario.id === loadedScenarioId && (
                          <Badge variant="secondary" className="text-xs">
                            Cargada
                          </Badge>
                        )}
                      </div>
                      {scenario.notes && (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          {scenario.notes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">
                        {formatRateAsPercentage(scenario.inputRate, 4)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {RATE_TYPES[scenario.inputRateType].shortLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-purple-600 dark:text-purple-400">
                        {formatRateAsPercentage(scenario.conversions.ea, 2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(scenario.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onLoad(scenario)}
                          className="text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                        >
                          <Upload className="mr-1 h-4 w-4" />
                          Cargar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              disabled={deletingId === scenario.id}
                            >
                              {deletingId === scenario.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                ¿Eliminar simulación?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Estás a punto de eliminar la simulación &quot;
                                {scenario.name}&quot;. Esta acción no se puede
                                deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(scenario.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {scenarios.length > 0 && (
          <div className="mt-4 border-t pt-4 text-sm text-muted-foreground">
            {filteredScenarios.length} de {scenarios.length} simulaciones
          </div>
        )}
      </CardContent>
    </Card>
  );
}
