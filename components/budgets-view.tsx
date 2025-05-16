"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { useBudget } from "@/context/budget-context"
import { formatCurrency } from "@/lib/utils"

export function BudgetsView() {
  const { categories, periods, budgets, activePeriod, addBudget, updateBudget } = useBudget()
  const { toast } = useToast()

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(activePeriod?.id || "")
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<{
    id: string
    name: string
    budgetId?: string
    amount: string
  } | null>(null)

  // Get the selected period object
  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId)

  // Filter budgets for the selected period
  const periodBudgets = selectedPeriod ? budgets.filter((budget) => budget.period_id === selectedPeriod.id) : []

  const handleEditBudget = () => {
    if (!editCategory || !selectedPeriod) return

    const amount = Number.parseFloat(editCategory.amount)
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Error",
        description: "El monto debe ser un número positivo",
        variant: "destructive",
      })
      return
    }

    if (editCategory.budgetId) {
      // Update existing budget
      updateBudget(editCategory.budgetId, amount)
    } else {
      // Create new budget
      addBudget(editCategory.id, selectedPeriod.id, amount)
    }

    setEditCategory(null)
    setIsEditOpen(false)

    toast({
      title: "Presupuesto actualizado",
      description: "El presupuesto ha sido actualizado exitosamente",
    })
  }

  if (periods.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Presupuestos</h1>
        <Card>
          <CardHeader>
            <CardTitle>No hay periodos disponibles</CardTitle>
            <CardDescription>
              Para configurar presupuestos, primero debes crear un periodo presupuestario en la sección de Periodos.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Presupuestos</h1>
        <p className="text-muted-foreground">
          Configura los montos presupuestados para cada categoría en el periodo seleccionado
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Presupuestos por Categoría</CardTitle>
              <CardDescription>Establece el monto esperado para cada categoría</CardDescription>
            </div>
            <div className="w-full sm:w-64">
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un periodo" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.name} {period.isOpen ? "(Activo)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedPeriod ? (
            <div className="text-center py-4 text-muted-foreground">
              Selecciona un periodo para ver y configurar los presupuestos
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Monto Presupuestado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => {
                  // Find budget for this category in selected period
                  const budget = periodBudgets.find((b) => b.category_id === category.id)

                  return (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-right">
                        {budget ? formatCurrency(budget.expected_amount) : formatCurrency(0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditCategory({
                              id: category.id,
                              name: category.name,
                              budgetId: budget?.id,
                              amount: budget ? budget.expected_amount.toString() : "0",
                            })
                            setIsEditOpen(true)
                          }}
                        >
                          {budget ? "Editar" : "Establecer"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {categories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      No hay categorías. Agrega categorías en la sección de Categorías.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Budget Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Establecer Presupuesto</DialogTitle>
            <DialogDescription>
              Define el monto presupuestado para {editCategory?.name} en el periodo {selectedPeriod?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Monto Presupuestado</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={editCategory?.amount || "0"}
                onChange={(e) => setEditCategory((prev) => (prev ? { ...prev, amount: e.target.value } : null))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditBudget}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
