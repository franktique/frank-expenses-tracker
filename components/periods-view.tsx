"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, PlusCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { useBudget } from "@/context/budget-context"
import { cn, formatDate } from "@/lib/utils"

export function PeriodsView() {
  const { periods, addPeriod, updatePeriod, deletePeriod, openPeriod, refreshData } = useBudget()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(false)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const [newPeriodName, setNewPeriodName] = useState("")
  const [newPeriodDate, setNewPeriodDate] = useState<Date | undefined>(new Date())

  const [editPeriod, setEditPeriod] = useState<{
    id: string
    name: string
    date: Date | undefined
  } | null>(null)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isActivating, setIsActivating] = useState<string | null>(null)

  const handleAddPeriod = async () => {
    if (!newPeriodName.trim() || !newPeriodDate) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      })
      return
    }

    try {
      await addPeriod(newPeriodName, newPeriodDate.getMonth(), newPeriodDate.getFullYear())

      setNewPeriodName("")
      setNewPeriodDate(new Date())
      setIsAddOpen(false)

      toast({
        title: "Periodo agregado",
        description: "El periodo ha sido agregado exitosamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo agregar el periodo: ${(error as Error).message}`,
        variant: "destructive",
      })
    }
  }

  const handleEditPeriod = async () => {
    if (!editPeriod || !editPeriod.name.trim() || !editPeriod.date) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      })
      return
    }

    try {
      await updatePeriod(editPeriod.id, editPeriod.name, editPeriod.date.getMonth(), editPeriod.date.getFullYear())

      setEditPeriod(null)
      setIsEditOpen(false)

      toast({
        title: "Periodo actualizado",
        description: "El periodo ha sido actualizado exitosamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo actualizar el periodo: ${(error as Error).message}`,
        variant: "destructive",
      })
    }
  }

  const handleDeletePeriod = async () => {
    if (deleteId) {
      try {
        await deletePeriod(deleteId)
        setDeleteId(null)
        setIsDeleteOpen(false)

        toast({
          title: "Periodo eliminado",
          description: "El periodo ha sido eliminado exitosamente",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: `No se pudo eliminar el periodo: ${(error as Error).message}`,
          variant: "destructive",
        })
      }
    }
  }

  const handleOpenPeriod = async (id: string) => {
    try {
      setIsActivating(id)
      await openPeriod(id)

      toast({
        title: "Periodo abierto",
        description: "El periodo ha sido establecido como activo",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo activar el periodo: ${(error as Error).message}`,
        variant: "destructive",
      })
    } finally {
      setIsActivating(null)
    }
  }
  
  // Función para recargar los datos
  const handleRefresh = async () => {
    try {
      setIsLoading(true)
      await refreshData()
      toast({
        title: "Datos actualizados",
        description: "Los períodos han sido actualizados correctamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudieron actualizar los datos: ${(error as Error).message}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Cargar datos cuando el componente se inicia
  useEffect(() => {
    handleRefresh()
  }, [])

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
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Actualizando...' : 'Actualizar'}
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
                <DialogDescription>Ingresa los detalles del nuevo periodo presupuestario</DialogDescription>
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
                          !newPeriodDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newPeriodDate ? (
                          formatDate(newPeriodDate, { month: "long", year: "numeric" })
                        ) : (
                          <span>Selecciona un mes</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={newPeriodDate} onSelect={setNewPeriodDate} initialFocus />
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

      <Card>
        <CardHeader>
          <CardTitle>Periodos Presupuestarios</CardTitle>
          <CardDescription>Administra los periodos para organizar tus presupuestos</CardDescription>
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
                    {new Date(period.year, period.month).toLocaleDateString("es", {
                      month: "long",
                      year: "numeric",
                    })}
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
                    {!(period.is_open || period.isOpen) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPeriod(period.id)}
                        disabled={isActivating === period.id}
                      >
                        {isActivating === period.id ? "Activando..." : "Activar"}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const date = new Date(period.year, period.month)
                        setEditPeriod({
                          id: period.id,
                          name: period.name,
                          date,
                        })
                        setIsEditOpen(true)
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        setDeleteId(period.id)
                        setIsDeleteOpen(true)
                      }}
                    >
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {periods.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
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
            <DialogDescription>Actualiza los detalles del periodo</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={editPeriod?.name || ""}
                onChange={(e) => setEditPeriod((prev) => (prev ? { ...prev, name: e.target.value } : null))}
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
                      !editPeriod?.date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editPeriod?.date ? (
                      formatDate(editPeriod.date, { month: "long", year: "numeric" })
                    ) : (
                      <span>Selecciona un mes</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editPeriod?.date}
                    onSelect={(date) => setEditPeriod((prev) => (prev ? { ...prev, date } : null))}
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
              ¿Estás seguro de que deseas eliminar este periodo? Esta acción no se puede deshacer.
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
    </div>
  )
}
