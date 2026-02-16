'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Loader2, Calculator, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth-context';
import type { LoanScenario } from '@/types/loan-simulator';
import { formatCurrency, formatDate } from '@/lib/loan-calculations';

export default function LoanScenariosPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const [scenarios, setScenarios] = useState<LoanScenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Load scenarios
  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/loan-scenarios');
      if (!response.ok) {
        const data = await response.json();
        if (data.code === 'TABLES_NOT_FOUND') {
          toast({
            title: 'Migración requerida',
            description:
              'Las tablas de préstamos no existen. Ejecutando migración...',
          });
          await runMigration();
          return;
        }
        throw new Error(data.error || 'Error al cargar los escenarios');
      }

      const data = await response.json();
      setScenarios(data.scenarios || []);
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Error al cargar los escenarios de préstamo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runMigration = async () => {
    try {
      const response = await fetch('/api/migrate-loan-simulator', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Error al ejecutar la migración');
      }
      toast({
        title: 'Migración completada',
        description: 'Tablas de préstamos creadas correctamente',
      });
      await loadScenarios();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al ejecutar la migración',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${name}"?`)) {
      return;
    }

    setIsDeleting(id);
    try {
      const response = await fetch(`/api/loan-scenarios/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Error al eliminar el escenario');
      }
      toast({
        title: 'Eliminado',
        description: 'El escenario de préstamo ha sido eliminado',
      });
      await loadScenarios();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al eliminar el escenario',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCreateNew = () => {
    // Create a temporary scenario and navigate to it
    const tempId = 'new';
    router.push(`/simular-prestamos/${tempId}`);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Simular Préstamos</h1>
          <p className="text-muted-foreground">
            Calcula y compara diferentes escenarios de préstamos
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Préstamo
        </Button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
              <p className="text-muted-foreground">Cargando escenarios...</p>
            </div>
          </CardContent>
        </Card>
      ) : scenarios.length === 0 ? (
        /* Empty State */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calculator className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              No hay escenarios de préstamo
            </h3>
            <p className="mb-4 max-w-md text-center text-muted-foreground">
              Crea tu primer escenario para comenzar a simular diferentes
              opciones de préstamos
            </p>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Primer Préstamo
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Scenarios List */
        <Card>
          <CardHeader>
            <CardTitle>Mis Escenarios de Préstamo</CardTitle>
            <CardDescription>
              {scenarios.length} escenario{scenarios.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Tasa</TableHead>
                  <TableHead className="text-right">Plazo</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead className="text-right">Pagos Extras</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenarios.map((scenario) => (
                  <TableRow
                    key={scenario.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      router.push(`/simular-prestamos/${scenario.id}`)
                    }
                  >
                    <TableCell className="font-medium">
                      {scenario.name}
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-muted px-2 py-1 text-sm font-medium">
                        {scenario.currency}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(scenario.principal, scenario.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {scenario.interestRate}%
                    </TableCell>
                    <TableCell className="text-right">
                      {Math.floor(scenario.termMonths / 12)}a{' '}
                      {scenario.termMonths % 12}m
                    </TableCell>
                    <TableCell>{formatDate(scenario.startDate)}</TableCell>
                    <TableCell className="text-right">
                      {(scenario as any).extraPaymentsCount || 0}
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/simular-prestamos/${scenario.id}`)
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDelete(scenario.id, scenario.name)
                          }
                          disabled={isDeleting === scenario.id}
                        >
                          {isDeleting === scenario.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
