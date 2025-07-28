"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookOpen,
  PlusCircle,
  Trash2,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

type Grouper = {
  id: number;
  name: string;
  is_assigned?: boolean;
};

type EstudioData = {
  id: number;
  name: string;
  assignedGroupers: Grouper[];
  availableGroupers: Grouper[];
};

export default function EstudioGroupersPage() {
  const params = useParams();
  const router = useRouter();
  const estudioId = parseInt(params.id as string);

  const [estudioData, setEstudioData] = useState<EstudioData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState<boolean>(false);
  const [selectedGroupersToAdd, setSelectedGroupersToAdd] = useState<number[]>(
    []
  );
  const [grouperToRemove, setGrouperToRemove] = useState<Grouper | null>(null);

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Fetch estudio and groupers data with retry mechanism
  const fetchData = async (isRetry = false) => {
    if (isNaN(estudioId)) {
      toast({
        title: "Error",
        description: "ID de estudio inválido",
        variant: "destructive",
      });
      router.push("/estudios");
      return;
    }

    try {
      setIsLoading(true);
      if (!isRetry) {
        setFetchError(null);
      }

      // Fetch estudio details
      const estudioResponse = await fetch(`/api/estudios/${estudioId}`);
      if (!estudioResponse.ok) {
        if (estudioResponse.status === 404) {
          toast({
            title: "Estudio no encontrado",
            description: "El estudio solicitado no existe o ha sido eliminado",
            variant: "destructive",
          });
          router.push("/estudios");
          return;
        }
        const error = await estudioResponse.json().catch(() => ({}));
        throw new Error(
          error.error ||
            `Error ${estudioResponse.status}: ${estudioResponse.statusText}`
        );
      }
      const estudio = await estudioResponse.json();

      // Fetch groupers data
      const groupersResponse = await fetch(
        `/api/estudios/${estudioId}/groupers`
      );
      if (!groupersResponse.ok) {
        const error = await groupersResponse.json().catch(() => ({}));
        throw new Error(
          error.error ||
            `Error ${groupersResponse.status}: ${groupersResponse.statusText}`
        );
      }
      const groupersData = await groupersResponse.json();

      setEstudioData({
        id: estudio.id,
        name: estudio.name,
        assignedGroupers: groupersData.assignedGroupers,
        availableGroupers: groupersData.availableGroupers,
      });
      setFetchError(null);
      setRetryCount(0);
    } catch (error) {
      console.error("Error fetching data:", error);
      const errorMessage =
        error instanceof Error
          ? error.message.includes("fetch")
            ? "Error de conexión. Verifique su conexión a internet."
            : error.message
          : "Ocurrió un error desconocido";

      setFetchError(errorMessage);

      if (!isRetry) {
        toast({
          title: "Error al cargar datos",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Retry function with exponential backoff
  const retryFetchData = async () => {
    if (retryCount >= maxRetries) {
      toast({
        title: "Error persistente",
        description:
          "Se alcanzó el máximo número de reintentos. Recargue la página.",
        variant: "destructive",
      });
      return;
    }

    setRetryCount((prev) => prev + 1);
    const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff

    toast({
      title: "Reintentando...",
      description: `Intento ${retryCount + 1} de ${maxRetries}`,
    });

    setTimeout(() => {
      fetchData(true);
    }, delay);
  };

  useEffect(() => {
    fetchData();
  }, [estudioId, router]);

  const [isAddingGroupers, setIsAddingGroupers] = useState(false);

  // Add selected groupers to estudio with enhanced error handling
  const handleAddGroupers = async () => {
    if (selectedGroupersToAdd.length === 0) {
      toast({
        title: "Selección requerida",
        description: "Debe seleccionar al menos un agrupador",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingGroupers(true);

      const response = await fetch(`/api/estudios/${estudioId}/groupers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grouperIds: selectedGroupersToAdd }),
      });

      if (response.ok) {
        const result = await response.json();

        // Refresh data
        const groupersResponse = await fetch(
          `/api/estudios/${estudioId}/groupers`
        );

        if (groupersResponse.ok) {
          const groupersData = await groupersResponse.json();

          setEstudioData((prev) =>
            prev
              ? {
                  ...prev,
                  assignedGroupers: groupersData.assignedGroupers,
                  availableGroupers: groupersData.availableGroupers,
                }
              : null
          );

          setSelectedGroupersToAdd([]);
          setIsAddDialogOpen(false);

          const message =
            result.skipped > 0
              ? `Se agregaron ${result.added} agrupadores. ${result.skipped} ya estaban asignados.`
              : `Se agregaron ${result.added} agrupadores al estudio.`;

          toast({
            title: "Agrupadores agregados",
            description: message,
          });
        } else {
          throw new Error("Error al actualizar la lista de agrupadores");
        }
      } else {
        const error = await response.json().catch(() => ({}));
        const errorMessage =
          error.error || `Error ${response.status}: ${response.statusText}`;

        toast({
          title: "Error al agregar agrupadores",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding groupers:", error);
      const errorMessage =
        error instanceof Error
          ? error.message.includes("fetch")
            ? "Error de conexión. Verifique su conexión a internet."
            : error.message
          : "No se pudieron agregar los agrupadores";

      toast({
        title: "Error al agregar agrupadores",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAddingGroupers(false);
    }
  };

  const [isRemovingGrouper, setIsRemovingGrouper] = useState(false);

  // Remove grouper from estudio with enhanced error handling
  const handleRemoveGrouper = async () => {
    if (!grouperToRemove) return;

    try {
      setIsRemovingGrouper(true);

      const response = await fetch(
        `/api/estudios/${estudioId}/groupers/${grouperToRemove.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        const result = await response.json();

        // Refresh data
        const groupersResponse = await fetch(
          `/api/estudios/${estudioId}/groupers`
        );

        if (groupersResponse.ok) {
          const groupersData = await groupersResponse.json();

          setEstudioData((prev) =>
            prev
              ? {
                  ...prev,
                  assignedGroupers: groupersData.assignedGroupers,
                  availableGroupers: groupersData.availableGroupers,
                }
              : null
          );

          setIsRemoveDialogOpen(false);
          setGrouperToRemove(null);

          toast({
            title: "Agrupador removido",
            description: `El agrupador "${
              result.removedGrouper?.name || grouperToRemove.name
            }" ha sido removido del estudio.`,
          });
        } else {
          throw new Error("Error al actualizar la lista de agrupadores");
        }
      } else {
        const error = await response.json().catch(() => ({}));
        const errorMessage =
          error.error || `Error ${response.status}: ${response.statusText}`;

        toast({
          title: "Error al remover agrupador",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing grouper:", error);
      const errorMessage =
        error instanceof Error
          ? error.message.includes("fetch")
            ? "Error de conexión. Verifique su conexión a internet."
            : error.message
          : "No se pudo remover el agrupador";

      toast({
        title: "Error al remover agrupador",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRemovingGrouper(false);
    }
  };

  // Handle checkbox selection for adding groupers
  const handleGrouperSelection = (grouperId: number, checked: boolean) => {
    if (checked) {
      setSelectedGroupersToAdd((prev) => [...prev, grouperId]);
    } else {
      setSelectedGroupersToAdd((prev) => prev.filter((id) => id !== grouperId));
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>Cargando datos del estudio...</span>
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8">
          <div className="flex flex-col items-center gap-4">
            <div className="text-destructive">
              <AlertCircle className="h-12 w-12 mx-auto mb-2" />
              <p className="font-medium">Error al cargar datos</p>
              <p className="text-sm text-muted-foreground mt-1">{fetchError}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={retryFetchData}
                variant="outline"
                disabled={retryCount >= maxRetries}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {retryCount >= maxRetries
                  ? "Máximo de reintentos alcanzado"
                  : "Reintentar"}
              </Button>
              <Button
                onClick={() => router.push("/estudios")}
                variant="default"
              >
                Volver a estudios
              </Button>
            </div>
            {retryCount >= maxRetries && (
              <Button
                onClick={() => window.location.reload()}
                variant="secondary"
              >
                Recargar página
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!estudioData) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Estudio no encontrado</h3>
          <p className="text-muted-foreground mb-4">
            El estudio solicitado no existe o ha sido eliminado.
          </p>
          <Button onClick={() => router.push("/estudios")}>
            Volver a estudios
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/estudios">Estudios</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{estudioData.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/estudios")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <BookOpen className="h-6 w-6" />
          <h1 className="text-3xl font-bold">
            Agrupadores - {estudioData.name}
          </h1>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          disabled={estudioData.availableGroupers.length === 0}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Agregar Agrupadores
        </Button>
      </div>

      {/* Assigned Groupers */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Agrupadores Asignados</CardTitle>
          <CardDescription>
            Agrupadores que pertenecen a este estudio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {estudioData.assignedGroupers.length === 0 ? (
            <div className="text-center py-4">
              No hay agrupadores asignados a este estudio.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estudioData.assignedGroupers.map((grouper) => (
                  <TableRow key={grouper.id}>
                    <TableCell className="font-medium">
                      {grouper.name}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setGrouperToRemove(grouper);
                          setIsRemoveDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Groupers Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setSelectedGroupersToAdd([]);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Agrupadores</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {estudioData.availableGroupers.length === 0 ? (
              <div className="text-center py-4">
                No hay agrupadores disponibles para agregar.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {estudioData.availableGroupers.map((grouper) => (
                  <div key={grouper.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`grouper-${grouper.id}`}
                      checked={selectedGroupersToAdd.includes(grouper.id)}
                      onCheckedChange={(checked) =>
                        handleGrouperSelection(grouper.id, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={`grouper-${grouper.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {grouper.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddGroupers}
              disabled={selectedGroupersToAdd.length === 0 || isAddingGroupers}
            >
              {isAddingGroupers ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Agregando...
                </>
              ) : (
                `Agregar (${selectedGroupersToAdd.length})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Remoción</DialogTitle>
          </DialogHeader>
          <p>
            ¿Está seguro de que desea remover el agrupador "
            {grouperToRemove?.name}" de este estudio?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRemoveDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRemoveGrouper}
              variant="destructive"
              disabled={isRemovingGrouper}
            >
              {isRemovingGrouper ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Removiendo...
                </>
              ) : (
                "Remover"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
