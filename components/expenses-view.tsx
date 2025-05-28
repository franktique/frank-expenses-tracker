"use client"

import { useState } from "react"
import { CalendarIcon, FileUp, PlusCircle, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CSVImportDialog } from "@/components/csv-import-dialog"
import { CSVImportDialogEnhanced } from "@/components/csv-import-dialog-enhanced"
import { ExportExpensesButton } from "@/components/export-expenses-button"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { useBudget, type PaymentMethod } from "@/context/budget-context"
import { cn, formatCurrency, formatDate } from "@/lib/utils"

export function ExpensesView() {
  const {
    categories,
    periods,
    expenses,
    activePeriod,
    addExpense,
    updateExpense,
    deleteExpense,
    getCategoryById,
    getPeriodById,
  } = useBudget()
  const { toast } = useToast()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("")

  const [newExpenseCategory, setNewExpenseCategory] = useState("")
  const [categorySearch, setCategorySearch] = useState("")
  const [newExpensePeriod, setNewExpensePeriod] = useState(activePeriod?.id || "")
  const [newExpenseDate, setNewExpenseDate] = useState<Date | undefined>(new Date())
  const [newExpenseEvent, setNewExpenseEvent] = useState("")
  const [newExpensePaymentMethod, setNewExpensePaymentMethod] = useState<PaymentMethod>("credit")
  const [newExpenseDescription, setNewExpenseDescription] = useState("")
  const [newExpenseAmount, setNewExpenseAmount] = useState("")

  const [editExpense, setEditExpense] = useState<{
    id: string
    categoryId: string
    date: Date | undefined
    event: string
    paymentMethod: PaymentMethod
    description: string
    amount: string
  } | null>(null)

  const [deleteId, setDeleteId] = useState<string | null>(null)

  const resetNewExpenseForm = () => {
    setNewExpenseCategory("")
    setNewExpensePeriod(activePeriod?.id || "")
    setNewExpenseDate(new Date())
    setNewExpenseEvent("")
    setNewExpensePaymentMethod("credit")
    setNewExpenseDescription("")
    setNewExpenseAmount("")
    setCategorySearch("")
  }

  const handleAddExpense = () => {
    if (
      !newExpenseCategory ||
      !newExpensePeriod ||
      !newExpenseDate ||
      !newExpenseDescription.trim() ||
      !newExpenseAmount
    ) {
      toast({
        title: "Error",
        description: "Los campos obligatorios no pueden estar vacíos",
        variant: "destructive",
      })
      return
    }

    const amount = Number.parseFloat(newExpenseAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "El monto debe ser un número positivo",
        variant: "destructive",
      })
      return
    }

    addExpense(
      newExpenseCategory,
      newExpensePeriod,
      newExpenseDate.toISOString(),
      newExpenseEvent.trim() || undefined,
      newExpensePaymentMethod,
      newExpenseDescription,
      amount,
    )

    resetNewExpenseForm()
    setIsAddOpen(false)

    toast({
      title: "Gasto agregado",
      description: "El gasto ha sido registrado exitosamente",
    })
  }

  const handleEditExpense = () => {
    if (
      !editExpense ||
      !editExpense.categoryId ||
      !editExpense.date ||
      !editExpense.description.trim() ||
      !editExpense.amount
    ) {
      toast({
        title: "Error",
        description: "Los campos obligatorios no pueden estar vacíos",
        variant: "destructive",
      })
      return
    }

    const amount = Number.parseFloat(editExpense.amount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "El monto debe ser un número positivo",
        variant: "destructive",
      })
      return
    }

    const expense = expenses.find((e) => e.id === editExpense.id)
    if (!expense) return

    updateExpense(
      editExpense.id,
      editExpense.categoryId,
      editExpense.date.toISOString(),
      editExpense.event.trim() || undefined,
      editExpense.paymentMethod,
      editExpense.description,
      amount,
    )

    setEditExpense(null)
    setIsEditOpen(false)

    toast({
      title: "Gasto actualizado",
      description: "El gasto ha sido actualizado exitosamente",
    })
  }

  const handleDeleteExpense = () => {
    if (deleteId) {
      deleteExpense(deleteId)
      setDeleteId(null)
      setIsDeleteOpen(false)

      toast({
        title: "Gasto eliminado",
        description: "El gasto ha sido eliminado exitosamente",
      })
    }
  }

  // Sort expenses by date (oldest first)
  const sortedExpenses = [...expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Filter expenses by active period, selected category and payment method if available
  const filteredExpenses = sortedExpenses.filter(expense => {
    // Filter by period
    const periodMatch = activePeriod ? expense.period_id === activePeriod.id : true;
    // Filter by category
    const categoryMatch = categoryFilter === "all" || !categoryFilter ? true : expense.category_id === categoryFilter;
    // Filter by payment method
    const paymentMethodMatch = paymentMethodFilter === "all" || !paymentMethodFilter ? true : expense.payment_method === paymentMethodFilter;
    
    return periodMatch && categoryMatch && paymentMethodMatch;
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos</h1>
          <p className="text-muted-foreground mt-1">
            {filteredExpenses.length} {filteredExpenses.length === 1 ? "registro" : "registros"} 
            {(categoryFilter !== "all" && categoryFilter) || (paymentMethodFilter !== "all" && paymentMethodFilter) ? " con los filtros aplicados" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportExpensesButton />
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <FileUp className="mr-2 h-4 w-4" />
            Importar CSV
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Gasto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar Gasto</DialogTitle>
                <DialogDescription>Ingresa los detalles del nuevo gasto</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <Select value={newExpenseCategory} onValueChange={setNewExpenseCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Buscar categoría..."
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          className="mb-2"
                        />
                      </div>
                      {categories
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .filter(category => 
                          category.name.toLowerCase().includes(categorySearch.toLowerCase())
                        )
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="period">Periodo *</Label>
                  <Select value={newExpensePeriod} onValueChange={setNewExpensePeriod} disabled={!periods.length}>
                    <SelectTrigger id="period">
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
                <div className="grid gap-2">
                  <Label htmlFor="date">Fecha *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newExpenseDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newExpenseDate ? formatDate(newExpenseDate) : <span>Selecciona una fecha</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={newExpenseDate} onSelect={setNewExpenseDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="event">Evento (opcional)</Label>
                  <Input
                    id="event"
                    value={newExpenseEvent}
                    onChange={(e) => setNewExpenseEvent(e.target.value)}
                    placeholder="Ej: Cumpleaños, Viaje, etc."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="payment-method">Medio de Pago *</Label>
                  <RadioGroup
                    value={newExpensePaymentMethod}
                    onValueChange={(value) => setNewExpensePaymentMethod(value as PaymentMethod)}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="credit" id="credit" />
                      <Label htmlFor="credit">Tarjeta de Crédito</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="debit" id="debit" />
                      <Label htmlFor="debit">Tarjeta de Débito</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash">Efectivo</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descripción *</Label>
                  <Input
                    id="description"
                    value={newExpenseDescription}
                    onChange={(e) => setNewExpenseDescription(e.target.value)}
                    placeholder="Ej: Compra de alimentos, Pago de servicios, etc."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Monto *</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddExpense}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro de Gastos</CardTitle>
          <CardDescription>
            {activePeriod ? `Gastos del periodo: ${activePeriod.name}` : "Historial de todos los gastos registrados"}
          </CardDescription>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="category-filter">Filtrar por categoría</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="category-filter" className="mt-1">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="payment-method-filter">Filtrar por medio de pago</Label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger id="payment-method-filter" className="mt-1">
                  <SelectValue placeholder="Todos los medios de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los medios de pago</SelectItem>
                  <SelectItem value="credit">Tarjeta de crédito</SelectItem>
                  <SelectItem value="debit">Tarjeta de débito</SelectItem>
                  <SelectItem value="cash">Efectivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Medio</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => {
                const category = getCategoryById(expense.category_id)
                return (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {/* Forzar visualización correcta de fechas sin desplazamiento de zona horaria */}
                      {expense.date && typeof expense.date === 'string' ? 
                        // Si es string, usar método manual para evitar conversiones automáticas de zona horaria
                        formatDate(new Date(expense.date.split('T')[0] + 'T12:00:00Z')) : 
                        formatDate(new Date(expense.date))
                      }
                    </TableCell>
                    <TableCell>{category?.name || "Desconocida"}</TableCell>
                    <TableCell>
                      {expense.description}
                      {expense.event && (
                        <span className="block text-xs text-muted-foreground">Evento: {expense.event}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {expense.payment_method === "credit" && "Crédito"}
                      {expense.payment_method === "debit" && "Débito"}
                      {expense.payment_method === "cash" && "Efectivo"}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditExpense({
                            id: expense.id,
                            categoryId: expense.category_id,
                            date: new Date(expense.date),
                            event: expense.event || "",
                            paymentMethod: expense.payment_method,
                            description: expense.description,
                            amount: expense.amount.toString(),
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
                          setDeleteId(expense.id)
                          setIsDeleteOpen(true)
                        }}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    No hay gastos registrados. Agrega un nuevo gasto para comenzar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Gasto</DialogTitle>
            <DialogDescription>Actualiza los detalles del gasto</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Categoría</Label>
              <Select
                value={editExpense?.categoryId || ""}
                onValueChange={(value) => setEditExpense((prev) => (prev ? { ...prev, categoryId: value } : null))}
              >
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Buscar categoría..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="mb-2"
                    />
                  </div>
                  {categories
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .filter(category =>
                      category.name.toLowerCase().includes(categorySearch.toLowerCase())
                    )
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="edit-date"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editExpense?.date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editExpense?.date ? formatDate(editExpense.date) : <span>Selecciona una fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editExpense?.date}
                    onSelect={(date) => setEditExpense((prev) => (prev ? { ...prev, date } : null))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-event">Evento (opcional)</Label>
              <Input
                id="edit-event"
                value={editExpense?.event || ""}
                onChange={(e) => setEditExpense((prev) => (prev ? { ...prev, event: e.target.value } : null))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-payment-method">Medio de Pago</Label>
              <RadioGroup
                value={editExpense?.paymentMethod || "credit"}
                onValueChange={(value) =>
                  setEditExpense((prev) => (prev ? { ...prev, paymentMethod: value as PaymentMethod } : null))
                }
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="credit" id="edit-credit" />
                  <Label htmlFor="edit-credit">Tarjeta de Crédito</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="debit" id="edit-debit" />
                  <Label htmlFor="edit-debit">Tarjeta de Débito</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="edit-cash" />
                  <Label htmlFor="edit-cash">Efectivo</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Input
                id="edit-description"
                value={editExpense?.description || ""}
                onChange={(e) => setEditExpense((prev) => (prev ? { ...prev, description: e.target.value } : null))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-amount">Monto</Label>
              <Input
                id="edit-amount"
                type="number"
                min="0"
                step="0.01"
                value={editExpense?.amount || ""}
                onChange={(e) => setEditExpense((prev) => (prev ? { ...prev, amount: e.target.value } : null))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditExpense}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Gasto</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteExpense}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <CSVImportDialogEnhanced open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  )
}
