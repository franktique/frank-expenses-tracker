"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Copy, Trash2, Edit, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";
import { SimulationFormDialog } from "@/components/simulation-form-dialog";
import { SimulationErrorWrapper } from "@/components/simulation-error-boundary";
import { SimulationContextMenu } from "@/components/simulation-context-menu";
import { useSimulationRetry } from "@/hooks/use-simulation-retry";
import {
  SimulationDataFallback,
  EmptySimulationListFallback,
  SimulationLoadingSkeleton,
} from "@/components/simulation-fallback-components";

// Types based on the API structure
type Simulation = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  budget_count: number;
};

interface SimulationListProps {
  onSelect?: (simulationId: number) => void;
}

export function SimulationList({ onSelect }: SimulationListProps) {
  const { toast } = useToast();

  // Enhanced error handling with retry mechanism
  const retry = useSimulationRetry({
    maxRetries: 3,
    showToasts: false, // We'll handle toasts manually for better UX
  });

  // State management
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form states
  const [editSimulation, setEditSimulation] = useState<Simulation | null>(null);
  const [deleteSimulation, setDeleteSimulation] = useState<Simulation | null>(
    null
  );

  // Loading states for individual operations
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<number | null>(null);

  // Fetch simulations from API with retry mechanism
  const fetchSimulations = async (showRefreshToast = false) => {
    if (showRefreshToast) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await retry.executeWithRetry(async () => {
        const response = await fetch("/api/simulations");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Error ${response.status}: ${response.statusText}`
          );
        }
        return response.json();
      }, "Cargar simulaciones");

      if (data) {
        setSimulations(data);

        if (showRefreshToast) {
          toast({
            title: "Datos actualizados",
            description: "Las simulaciones han sido actualizadas correctamente",
          });
        }
      } else {
        // Handle retry failure
        toast({
          title: "Error",
          description:
            "No se pudieron cargar las simulaciones después de varios intentos",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load simulations on component mount
  useEffect(() => {
    fetchSimulations();
  }, []);

  // Handle form success (create or edit)
  const handleFormSuccess = async (simulation: Simulation) => {
    // Refresh the list
    await fetchSimulations();

    // Auto-select the simulation if callback provided
    if (onSelect) {
      onSelect(simulation.id);
    }
  };

  // Handle delete simulation
  const handleDeleteSimulation = async () => {
    if (!deleteSimulation) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/simulations/${deleteSimulation.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al eliminar la simulación");
      }

      // Refresh the list
      await fetchSimulations();

      // Close dialog and reset state
      setDeleteSimulation(null);
      setIsDeleteOpen(false);

      toast({
        title: "Simulación eliminada",
        description: "La simulación ha sido eliminada exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          (error as Error).message || "No se pudo eliminar la simulación",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle duplicate simulation - copies all data including budgets, incomes, and subgroups
  const handleDuplicateSimulation = async (simulation: Simulation) => {
    setIsDuplicating(simulation.id);

    try {
      // Call the copy API endpoint which handles all data copying server-side
      const response = await fetch(`/api/simulations/${simulation.id}/copy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al duplicar la simulación");
      }

      const result = await response.json();

      // Refresh the list
      await fetchSimulations();

      // Build description with copied data counts
      const copiedItems = [];
      if (result.copied?.budgets_count > 0) {
        copiedItems.push(`${result.copied.budgets_count} presupuestos`);
      }
      if (result.copied?.incomes_count > 0) {
        copiedItems.push(`${result.copied.incomes_count} ingresos`);
      }
      if (result.copied?.subgroups_count > 0) {
        copiedItems.push(`${result.copied.subgroups_count} subgrupos`);
      }

      const description =
        copiedItems.length > 0
          ? `Se copiaron: ${copiedItems.join(", ")}`
          : "Simulación copiada (sin datos adicionales)";

      toast({
        title: "Simulación duplicada",
        description,
      });

      // Auto-select the duplicated simulation if callback provided
      if (onSelect && result.simulation?.id) {
        onSelect(result.simulation.id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          (error as Error).message || "No se pudo duplicar la simulación",
        variant: "destructive",
      });
    } finally {
      setIsDuplicating(null);
    }
  };

  // Handle edit click
  const handleEditClick = (simulation: Simulation) => {
    setEditSimulation(simulation);
    setIsEditOpen(true);
  };

  // Handle delete click
  const handleDeleteClick = (simulation: Simulation) => {
    setDeleteSimulation(simulation);
    setIsDeleteOpen(true);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchSimulations(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <SimulationErrorWrapper context="Lista de simulaciones">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Simulaciones</h1>
          </div>
          <SimulationLoadingSkeleton type="card" count={3} />
        </div>
      </SimulationErrorWrapper>
    );
  }

  // Error state with retry option
  if (retry.lastError && !retry.isRetrying) {
    return (
      <SimulationErrorWrapper context="Lista de simulaciones">
        <SimulationDataFallback
          error={retry.lastError.message}
          onRetry={() => fetchSimulations(false)}
          isRetrying={retry.isRetrying}
          showCreateOption={true}
          onCreateNew={() => setIsCreateOpen(true)}
        />
      </SimulationErrorWrapper>
    );
  }

  return (
    <SimulationErrorWrapper context="Lista de simulaciones">
      <div className="space-y-6">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Simulaciones
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Crea y administra simulaciones de presupuesto para análisis de
              escenarios
            </p>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full sm:w-auto"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Actualizando..." : "Actualizar"}
            </Button>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="w-full sm:w-auto"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Simulación
            </Button>
          </div>
        </div>

        {/* Empty state */}
        {simulations.length === 0 ? (
          <EmptySimulationListFallback
            onCreateFirst={() => setIsCreateOpen(true)}
            isLoading={isLoading}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Simulaciones de Presupuesto</CardTitle>
              <CardDescription>
                Administra tus simulaciones y configura diferentes escenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Categorías</TableHead>
                      <TableHead>Creada</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulations.map((simulation) => (
                      <SimulationContextMenu
                        key={simulation.id}
                        simulation={simulation}
                        onEdit={handleEditClick}
                        onDelete={handleDeleteClick}
                        onDuplicate={handleDuplicateSimulation}
                        onRefresh={handleRefresh}
                        showNavigationOptions={true}
                      >
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => onSelect?.(simulation.id)}
                        >
                          <TableCell className="font-medium">
                            {simulation.name}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {simulation.description || (
                              <span className="text-muted-foreground">
                                Sin descripción
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {simulation.budget_count} configuradas
                            </span>
                          </TableCell>
                          <TableCell>
                            {formatDate(new Date(simulation.created_at), {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClick(simulation);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateSimulation(simulation);
                                }}
                                disabled={isDuplicating === simulation.id}
                              >
                                {isDuplicating === simulation.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                                <span className="sr-only">Duplicar</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(simulation);
                                }}
                                disabled={isDeleting}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </SimulationContextMenu>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {simulations.map((simulation) => (
                  <SimulationContextMenu
                    key={simulation.id}
                    simulation={simulation}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onDuplicate={handleDuplicateSimulation}
                    onRefresh={handleRefresh}
                    showNavigationOptions={true}
                  >
                    <Card
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => onSelect?.(simulation.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-base truncate">
                              {simulation.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {simulation.description || "Sin descripción"}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                              <span>
                                {simulation.budget_count} categorías
                                configuradas
                              </span>
                              <span>
                                {formatDate(new Date(simulation.created_at), {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(simulation);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateSimulation(simulation);
                              }}
                              disabled={isDuplicating === simulation.id}
                            >
                              {isDuplicating === simulation.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                              <span className="sr-only">Duplicar</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(simulation);
                              }}
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Eliminar</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </SimulationContextMenu>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Simulation Dialog */}
        <SimulationFormDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          mode="create"
          onSuccess={handleFormSuccess}
        />

        {/* Edit Simulation Dialog */}
        <SimulationFormDialog
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open);
            if (!open) {
              setEditSimulation(null);
            }
          }}
          mode="edit"
          simulation={editSimulation}
          onSuccess={handleFormSuccess}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que deseas eliminar la simulación "
                {deleteSimulation?.name}"?
                <br />
                <br />
                Esta acción eliminará la simulación y todos sus presupuestos
                configurados. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setIsDeleteOpen(false);
                  setDeleteSimulation(null);
                }}
                disabled={isDeleting}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSimulation}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Eliminando..." : "Eliminar Simulación"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SimulationErrorWrapper>
  );
}
