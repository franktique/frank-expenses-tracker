"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Plus, Trash2, Edit2, DollarSign } from "lucide-react";
import type { SimulationIncome } from "@/types/funds";

interface SimulationIncomeInputProps {
  simulationId: number;
  simulationName: string;
  onIncomeChange?: (totalIncome: number) => void;
}

export function SimulationIncomeInput({
  simulationId,
  simulationName,
  onIncomeChange,
}: SimulationIncomeInputProps) {
  const { toast } = useToast();

  // State
  const [incomes, setIncomes] = useState<SimulationIncome[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newIncome, setNewIncome] = useState({ description: "", amount: "" });
  const [editIncome, setEditIncome] = useState({
    description: "",
    amount: "",
  });
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Load incomes
  const loadIncomes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/simulations/${simulationId}/incomes`);
      if (!response.ok) {
        throw new Error("Error al cargar ingresos");
      }
      const data = await response.json();
      setIncomes(data.incomes || []);

      // Notify parent of total income change
      if (onIncomeChange) {
        onIncomeChange(data.total_income || 0);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Error al cargar ingresos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [simulationId, toast, onIncomeChange]);

  useEffect(() => {
    loadIncomes();
  }, [loadIncomes]);

  // Calculate total income
  const totalIncome = incomes.reduce(
    (sum, income) => sum + Number(income.amount),
    0
  );

  // Handle add new income
  const handleAddIncome = async () => {
    if (!newIncome.description.trim() || !newIncome.amount) {
      toast({
        title: "Error",
        description: "Completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(newIncome.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "El monto debe ser un número positivo",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/simulations/${simulationId}/incomes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: newIncome.description.trim(),
          amount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear ingreso");
      }

      setNewIncome({ description: "", amount: "" });
      setIsAddingNew(false);
      await loadIncomes();

      toast({
        title: "Ingreso agregado",
        description: "El ingreso ha sido agregado exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Error al crear ingreso",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle start edit
  const handleStartEdit = (income: SimulationIncome) => {
    setEditingId(income.id);
    setEditIncome({
      description: income.description,
      amount: income.amount.toString(),
    });
  };

  // Handle save edit
  const handleSaveEdit = async (incomeId: number) => {
    if (!editIncome.description.trim() || !editIncome.amount) {
      toast({
        title: "Error",
        description: "Completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(editIncome.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "El monto debe ser un número positivo",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/simulations/${simulationId}/incomes/${incomeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: editIncome.description.trim(),
            amount,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al actualizar ingreso");
      }

      setEditingId(null);
      await loadIncomes();

      toast({
        title: "Ingreso actualizado",
        description: "El ingreso ha sido actualizado exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Error al actualizar ingreso",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete income
  const handleDeleteIncome = async (incomeId: number) => {
    if (!confirm("¿Estás seguro de eliminar este ingreso?")) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/simulations/${simulationId}/incomes/${incomeId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al eliminar ingreso");
      }

      await loadIncomes();

      toast({
        title: "Ingreso eliminado",
        description: "El ingreso ha sido eliminado exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Error al eliminar ingreso",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Cargando ingresos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Ingresos Simulados
        </CardTitle>
        <CardDescription>
          Define los ingresos esperados para calcular el balance disponible
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Income List */}
        {incomes.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">Descripción</TableHead>
                <TableHead className="text-right w-1/3">Monto</TableHead>
                <TableHead className="text-right w-32">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomes.map((income) => (
                <TableRow key={income.id}>
                  {editingId === income.id ? (
                    <>
                      <TableCell>
                        <Input
                          type="text"
                          value={editIncome.description}
                          onChange={(e) =>
                            setEditIncome({
                              ...editIncome,
                              description: e.target.value,
                            })
                          }
                          placeholder="Descripción"
                          disabled={isSaving}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editIncome.amount}
                          onChange={(e) =>
                            setEditIncome({
                              ...editIncome,
                              amount: e.target.value,
                            })
                          }
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="text-right"
                          disabled={isSaving}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(income.id)}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Guardar"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                            disabled={isSaving}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">
                        {income.description}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(income.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(income)}
                            disabled={isSaving || editingId !== null}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteIncome(income.id)}
                            disabled={isSaving || editingId !== null}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            No hay ingresos simulados. Agrega uno para comenzar.
          </div>
        )}

        {/* Add New Income Form */}
        {isAddingNew ? (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Input
                type="text"
                value={newIncome.description}
                onChange={(e) =>
                  setNewIncome({ ...newIncome, description: e.target.value })
                }
                placeholder="Ej: Salario, Freelance, etc."
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Monto</label>
              <Input
                type="number"
                value={newIncome.amount}
                onChange={(e) =>
                  setNewIncome({ ...newIncome, amount: e.target.value })
                }
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={isSaving}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddIncome} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingNew(false);
                  setNewIncome({ description: "", amount: "" });
                }}
                disabled={isSaving}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setIsAddingNew(true)}
            disabled={editingId !== null}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Ingreso
          </Button>
        )}

        {/* Total Income Summary */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total Ingresos:</span>
            <span className="text-2xl font-bold text-green-600">
              {formatCurrency(totalIncome)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
