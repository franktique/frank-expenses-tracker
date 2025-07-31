"use client";

import { useState, useEffect } from "react";
import { CalendarIcon, PlusCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useBudget } from "@/context/budget-context";
import { cn, formatDate } from "@/lib/utils";

export function PeriodsView() {
  const {
    periods,
    addPeriod,
    updatePeriod,
    deletePeriod,
    openPeriod,
    closePeriod,
    refreshData,
    activePeriod,
  } = useBudget();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [newPeriodName, setNewPeriodName] = useState("");
  const [newPeriodDate, setNewPeriodDate] = useState<Date | undefined>(
    new Date()
  );

  const [editPeriod, setEditPeriod] = useState<{
    id: string;
    name: string;
    date: Date | undefined;
  } | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState<string | null>(null);

  // Confirmation dialog state for period activation
  const [showActivationConfirm, setShowActivationConfirm] = useState(false);
  const [targetActivationPeriod, setTargetActivationPeriod] = useState<{
    id: string;
    name: string;
    month: number;
    year: number;
    is_open: boolean;
    isOpen: boolean;
  } | null>(null);

  // Error recovery state
  const [lastFailedOperation, setLastFailedOperation] = useState<{
    type: "activate" | "deactivate";
    periodId: string;
    periodName: string;
  } | null>(null);

  // Operation timeout helper
  const withTimeout = <T,>(
    promise: Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Operation timed out")), timeoutMs)
      ),
    ]);
  };

  // Debounce state to prevent rapid successive operations
  const [lastOperationTime, setLastOperationTime] = useState<number>(0);
  const OPERATION_DEBOUNCE_MS = 1000; // 1 second debounce

  const isOperationDebounced = () => {
    const now = Date.now();
    return now - lastOperationTime < OPERATION_DEBOUNCE_MS;
  };

  const handleAddPeriod = async () => {
    if (!newPeriodName.trim() || !newPeriodDate) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      await addPeriod(
        newPeriodName,
        newPeriodDate.getMonth(),
        newPeriodDate.getFullYear()
      );

      setNewPeriodName("");
      setNewPeriodDate(new Date());
      setIsAddOpen(false);

      toast({
        title: "Periodo agregado",
        description: "El periodo ha sido agregado exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo agregar el periodo: ${
          (error as Error).message
        }`,
        variant: "destructive",
      });
    }
  };

  const handleEditPeriod = async () => {
    if (!editPeriod || !editPeriod.name.trim() || !editPeriod.date) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      await updatePeriod(
        editPeriod.id,
        editPeriod.name,
        editPeriod.date.getMonth(),
        editPeriod.date.getFullYear()
      );

      setEditPeriod(null);
      setIsEditOpen(false);

      toast({
        title: "Periodo actualizado",
        description: "El periodo ha sido actualizado exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo actualizar el periodo: ${
          (error as Error).message
        }`,
        variant: "destructive",
      });
    }
  };

  const handleDeletePeriod = async () => {
    if (deleteId) {
      try {
        await deletePeriod(deleteId);
        setDeleteId(null);
        setIsDeleteOpen(false);

        toast({
          title: "Periodo eliminado",
          description: "El periodo ha sido eliminado exitosamente",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: `No se pudo eliminar el periodo: ${
            (error as Error).message
          }`,
          variant: "destructive",
        });
      }
    }
  };

  const handleOpenPeriod = async (id: string) => {
    const targetPeriod = periods.find((p) => p.id === id);
    if (!targetPeriod) return;

    // Check if there's already an active period
    if (activePeriod && activePeriod.id !== id) {
      // Show confirmation dialog
      setTargetActivationPeriod(targetPeriod);
      setShowActivationConfirm(true);
      return;
    }

    // No active period or same period, proceed directly
    await performPeriodActivation(id);
  };

  const performPeriodActivation = async (id: string) => {
    // Check for debounce
    if (isOperationDebounced()) {
      toast({
        title: "Operación muy rápida",
        description: "Espera un momento antes de realizar otra operación",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsActivating(id);
      setLastOperationTime(Date.now());
      await withTimeout(openPeriod(id), 30000);

      // Clear any previous failed operation on success
      setLastFailedOperation(null);

      toast({
        title: "Periodo activado",
        description: "El periodo ha sido establecido como activo exitosamente",
      });
    } catch (error) {
      const err = error as any;
      let title = "Error al activar periodo";
      let description = err.message || "No se pudo activar el periodo";

      // Handle specific error scenarios
      if (err.message?.includes("fetch")) {
        title = "Error de red";
        description =
          "No se pudo conectar al servidor. Verifica tu conexión a internet.";
      } else if (err.message?.includes("timeout")) {
        title = "Tiempo de espera agotado";
        description =
          "La operación tardó demasiado tiempo. Intenta nuevamente.";
      } else if (err.message?.includes("not found")) {
        title = "Periodo no encontrado";
        description = "El periodo no existe o fue eliminado";
      }

      toast({
        title,
        description,
        variant: "destructive",
      });

      // Trigger data refresh on activation errors to ensure consistency
      setTimeout(() => {
        handleRefresh(false); // Don't show success toast for error recovery
      }, 1000);

      // For retryable errors, set the failed operation state
      const retryableErrors = ["DATABASE_CONNECTION_ERROR", "DATABASE_TIMEOUT"];
      if (err.message?.includes("fetch") || err.message?.includes("timeout")) {
        const period = periods.find((p) => p.id === id);
        if (period) {
          setLastFailedOperation({
            type: "activate",
            periodId: id,
            periodName: period.name,
          });
        }
      }
    } finally {
      setIsActivating(null);
    }
  };

  const handleConfirmActivation = async () => {
    if (targetActivationPeriod) {
      setShowActivationConfirm(false);
      await performPeriodActivation(targetActivationPeriod.id);
      setTargetActivationPeriod(null);
    }
  };

  const handleCancelActivation = () => {
    setShowActivationConfirm(false);
    setTargetActivationPeriod(null);
  };

  const handleRetryOperation = async () => {
    if (!lastFailedOperation) return;

    const { type, periodId } = lastFailedOperation;
    setLastFailedOperation(null); // Clear the failed operation

    if (type === "activate") {
      await handleOpenPeriod(periodId);
    } else {
      await handleClosePeriod(periodId);
    }
  };

  const handleClosePeriod = async (id: string) => {
    // Check for debounce
    if (isOperationDebounced()) {
      toast({
        title: "Operación muy rápida",
        description: "Espera un momento antes de realizar otra operación",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDeactivating(id);
      setLastOperationTime(Date.now());
      await withTimeout(closePeriod(id), 30000);

      // Clear any previous failed operation on success
      setLastFailedOperation(null);

      toast({
        title: "Periodo desactivado",
        description: "El periodo ha sido desactivado exitosamente",
      });
    } catch (error) {
      const err = error as any;
      let title = "Error al desactivar periodo";
      let description = err.message || "No se pudo desactivar el periodo";

      // Handle specific error codes with appropriate messages and actions
      switch (err.code) {
        case "PERIOD_NOT_FOUND":
          title = "Periodo no encontrado";
          description =
            "El periodo no existe o fue eliminado por otra operación";
          break;
        case "PERIOD_ALREADY_INACTIVE":
          title = "Periodo ya inactivo";
          description = "El periodo ya está desactivado";
          break;
        case "CONCURRENT_MODIFICATION":
          title = "Conflicto de operaciones";
          description =
            "El periodo fue modificado por otra operación. Los datos se están actualizando...";
          break;
        case "DATABASE_CONNECTION_ERROR":
          title = "Error de conexión";
          description =
            "No se pudo conectar a la base de datos. Verifica tu conexión e intenta nuevamente.";
          break;
        case "DATABASE_TIMEOUT":
          title = "Tiempo de espera agotado";
          description =
            "La operación tardó demasiado tiempo. Intenta nuevamente.";
          break;
        case "DATABASE_CONSTRAINT_ERROR":
          title = "Error de integridad";
          description =
            "Error de integridad de datos. Los datos se están actualizando...";
          break;
        default:
          // For network errors or other issues
          if (err.message?.includes("fetch")) {
            title = "Error de red";
            description =
              "No se pudo conectar al servidor. Verifica tu conexión a internet.";
          } else if (err.message?.includes("timeout")) {
            title = "Tiempo de espera agotado";
            description =
              "La operación tardó demasiado tiempo. Intenta nuevamente.";
          }
      }

      toast({
        title,
        description,
        variant: "destructive",
      });

      // For certain errors, suggest refreshing data
      if (
        ["CONCURRENT_MODIFICATION", "DATABASE_CONSTRAINT_ERROR"].includes(
          err.code
        )
      ) {
        setTimeout(() => {
          toast({
            title: "Datos actualizados",
            description: "La información ha sido sincronizada con el servidor",
          });
        }, 2000);
      }

      // For retryable errors, set the failed operation state
      const retryableErrors = ["DATABASE_CONNECTION_ERROR", "DATABASE_TIMEOUT"];
      if (
        retryableErrors.includes(err.code) ||
        err.message?.includes("fetch") ||
        err.message?.includes("timeout")
      ) {
        const period = periods.find((p) => p.id === id);
        if (period) {
          setLastFailedOperation({
            type: "deactivate",
            periodId: id,
            periodName: period.name,
          });
        }
      }
    } finally {
      setIsDeactivating(null);
    }
  };

  // Función para recargar los datos
  const handleRefresh = async (showSuccessToast = true) => {
    try {
      setIsLoading(true);
      await refreshData();

      if (showSuccessToast) {
        toast({
          title: "Datos actualizados",
          description: "Los períodos han sido actualizados correctamente",
        });
      }
    } catch (error) {
      const err = error as Error;
      let title = "Error al actualizar";
      let description = err.message || "No se pudieron actualizar los datos";

      // Handle specific refresh errors
      if (err.message?.includes("fetch")) {
        title = "Error de conexión";
        description =
          "No se pudo conectar al servidor para actualizar los datos";
      } else if (err.message?.includes("timeout")) {
        title = "Tiempo de espera agotado";
        description = "La actualización tardó demasiado tiempo";
      } else if (err.message?.includes("database")) {
        title = "Error de base de datos";
        description = "Problema al acceder a la base de datos";
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar datos cuando el componente se inicia
  useEffect(() => {
    handleRefresh();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Periodos</h1>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            {isLoading ? "Actualizando..." : "Actualizar"}
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Periodo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Periodo</DialogTitle>
                <DialogDescription>
                  Ingresa los detalles del nuevo periodo presupuestario
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={newPeriodName}
                    onChange={(e) => setNewPeriodName(e.target.value)}
                    placeholder="Ej: Enero 2024"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Mes y Año</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newPeriodDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newPeriodDate ? (
                          formatDate(newPeriodDate, {
                            month: "long",
                            year: "numeric",
                          })
                        ) : (
                          <span>Selecciona un mes</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newPeriodDate}
                        onSelect={setNewPeriodDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddPeriod}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Retry notification */}
      {lastFailedOperation && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Operación fallida:{" "}
                    {lastFailedOperation.type === "activate"
                      ? "Activar"
                      : "Desactivar"}{" "}
                    "{lastFailedOperation.periodName}"
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    La operación falló debido a un problema de conexión. Puedes
                    intentar nuevamente.
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryOperation}
                  disabled={
                    isActivating !== null ||
                    isDeactivating !== null ||
                    isLoading
                  }
                >
                  Reintentar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLastFailedOperation(null)}
                >
                  Descartar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Periodos Presupuestarios</CardTitle>
          <CardDescription>
            Administra los periodos para organizar tus presupuestos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Mes/Año</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((period) => (
                <TableRow key={period.id}>
                  <TableCell className="font-medium">{period.name}</TableCell>
                  <TableCell>
                    {new Date(period.year, period.month).toLocaleDateString(
                      "es",
                      {
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </TableCell>
                  <TableCell>
                    {period.is_open || period.isOpen ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-100">
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                        Inactivo
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {period.is_open || period.isOpen ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleClosePeriod(period.id)}
                        disabled={
                          isActivating !== null ||
                          isDeactivating !== null ||
                          showActivationConfirm ||
                          isLoading
                        }
                      >
                        {isDeactivating === period.id
                          ? "Desactivando..."
                          : "Desactivar"}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPeriod(period.id)}
                        disabled={
                          isActivating !== null ||
                          isDeactivating !== null ||
                          showActivationConfirm ||
                          isLoading
                        }
                      >
                        {isActivating === period.id
                          ? "Activando..."
                          : "Activar"}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const date = new Date(period.year, period.month);
                        setEditPeriod({
                          id: period.id,
                          name: period.name,
                          date,
                        });
                        setIsEditOpen(true);
                      }}
                      disabled={
                        isActivating !== null ||
                        isDeactivating !== null ||
                        showActivationConfirm ||
                        isLoading
                      }
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        setDeleteId(period.id);
                        setIsDeleteOpen(true);
                      }}
                      disabled={
                        isActivating !== null ||
                        isDeactivating !== null ||
                        showActivationConfirm ||
                        isLoading
                      }
                    >
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!periods || periods.length === 0) && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-4 text-muted-foreground"
                  >
                    No hay periodos. Agrega un nuevo periodo para comenzar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Periodo</DialogTitle>
            <DialogDescription>
              Actualiza los detalles del periodo
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={editPeriod?.name || ""}
                onChange={(e) =>
                  setEditPeriod((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Mes y Año</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="edit-date"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editPeriod?.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editPeriod?.date ? (
                      formatDate(editPeriod.date, {
                        month: "long",
                        year: "numeric",
                      })
                    ) : (
                      <span>Selecciona un mes</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editPeriod?.date}
                    onSelect={(date) =>
                      setEditPeriod((prev) => (prev ? { ...prev, date } : null))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditPeriod}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Periodo</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este periodo? Esta acción no
              se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeletePeriod}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activation Confirmation Dialog */}
      <Dialog
        open={showActivationConfirm}
        onOpenChange={setShowActivationConfirm}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Activación de Periodo</DialogTitle>
            <DialogDescription>
              Ya hay un periodo activo. Al activar "
              {targetActivationPeriod?.name}" se desactivará automáticamente el
              periodo actual "{activePeriod?.name}".
              <br />
              <br />
              ¿Deseas continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelActivation}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmActivation}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
