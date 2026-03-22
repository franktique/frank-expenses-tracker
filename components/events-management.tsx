'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PlusCircle, Tag, AlertTriangle, ChevronDown, ChevronUp, Search, X, Pencil, Check, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Event } from '@/types/funds';
import { formatDate } from '@/lib/utils';

export function EventsManagement() {
  const { toast } = useToast();

  // State management
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form state for adding
  const [newEventName, setNewEventName] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [addNameError, setAddNameError] = useState('');

  // Form state for editing
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [editEventName, setEditEventName] = useState('');
  const [editEventDescription, setEditEventDescription] = useState('');
  const [editNameError, setEditNameError] = useState('');

  // Delete state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteEvent, setDeleteEvent] = useState<Event | null>(null);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search state
  const [searchInput, setSearchInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchFilter(value), 300);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchFilter('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  // Expense detail state
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [eventExpenses, setEventExpenses] = useState<EventExpense[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [expenseGroupMode, setExpenseGroupMode] = useState<'flat' | 'grouped' | 'charts'>('flat');

  // Expense event reassignment state
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [reassignEventId, setReassignEventId] = useState<string>('__none__');
  const [isReassigning, setIsReassigning] = useState(false);

  interface EventExpense {
    id: string;
    description: string | null;
    amount: number;
    payment_method: string;
    date: string;
    category_id: string | null;
    category_name: string | null;
  }

  const handleRowClick = useCallback(async (eventId: number) => {
    if (selectedEventId === eventId) {
      setSelectedEventId(null);
      setEventExpenses([]);
      setEditingExpenseId(null);
      return;
    }
    setEditingExpenseId(null);
    setSelectedEventId(eventId);
    setIsLoadingExpenses(true);
    try {
      const response = await fetch(`/api/events/${eventId}/expenses`);
      if (!response.ok) throw new Error('Failed to load expenses');
      const data = await response.json();
      setEventExpenses(data.expenses ?? []);
    } catch (error) {
      console.error('Error loading event expenses:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los gastos del evento',
        variant: 'destructive',
      });
      setEventExpenses([]);
    } finally {
      setIsLoadingExpenses(false);
    }
  }, [selectedEventId, toast]);

  const sortedExpenses = useMemo(() =>
    [...eventExpenses].sort((a, b) =>
      new Date(String(a.date).split('T')[0]).getTime() - new Date(String(b.date).split('T')[0]).getTime()
    ), [eventExpenses]);

  const filteredEvents = useMemo(() => {
    const sorted = [...events].sort((a, b) =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    );
    if (!searchFilter.trim()) return sorted;
    const query = searchFilter.trim().toLowerCase();
    return sorted.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        (e.description ?? '').toLowerCase().includes(query)
    );
  }, [events, searchFilter]);

  const groupedExpenses = useMemo(() => {
    const groups = new Map<string, EventExpense[]>();
    for (const expense of sortedExpenses) {
      const key = expense.category_name ?? '—';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(expense);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, 'es'));
  }, [sortedExpenses]);

  const categoryChartData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    for (const expense of eventExpenses) {
      const cat = expense.category_name ?? '—';
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + Number(expense.amount));
    }
    return Array.from(categoryMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [eventExpenses]);

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/events?limit=100');
      if (!response.ok) throw new Error('Failed to load events');
      const data = await response.json();
      setEvents(data.events ?? []);
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los eventos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const resetAddForm = () => {
    setNewEventName('');
    setNewEventDescription('');
    setAddNameError('');
  };

  const resetEditForm = () => {
    setEditEvent(null);
    setEditEventName('');
    setEditEventDescription('');
    setEditNameError('');
  };

  const handleAddEvent = async () => {
    setAddNameError('');
    if (!newEventName.trim()) {
      setAddNameError('El nombre del evento es obligatorio');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEventName.trim(),
          description: newEventDescription.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'DUPLICATE_EVENT') {
          setAddNameError('Ya existe un evento con este nombre');
          return;
        }
        throw new Error(data.message ?? 'Failed to create event');
      }

      await loadEvents();
      resetAddForm();
      setIsAddOpen(false);

      toast({
        title: 'Evento creado',
        description: 'El evento ha sido creado exitosamente',
      });
    } catch (error) {
      console.error('Error adding event:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'No se pudo crear el evento',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEvent = async () => {
    if (!editEvent) return;
    setEditNameError('');
    if (!editEventName.trim()) {
      setEditNameError('El nombre del evento es obligatorio');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/events/${editEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editEventName.trim(),
          description: editEventDescription.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'DUPLICATE_EVENT') {
          setEditNameError('Ya existe un evento con este nombre');
          return;
        }
        throw new Error(data.message ?? 'Failed to update event');
      }

      await loadEvents();
      resetEditForm();
      setIsEditOpen(false);

      toast({
        title: 'Evento actualizado',
        description: 'El evento ha sido actualizado exitosamente',
      });
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: 'Error',
        description:
          (error as Error).message || 'No se pudo actualizar el evento',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (event: Event) => {
    setSelectedEventId(null);
    setEventExpenses([]);
    setDeleteId(event.id);
    setDeleteEvent(event);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async (force: boolean = false) => {
    if (!deleteId) return;

    setIsSubmitting(true);
    try {
      const url = force
        ? `/api/events/${deleteId}?force=true`
        : `/api/events/${deleteId}`;
      const response = await fetch(url, { method: 'DELETE' });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'EVENT_IN_USE' && !force) {
          // Dialog already open – nothing extra to do, dialog will show expense_count
          return;
        }
        throw new Error(data.message ?? 'Failed to delete event');
      }

      await loadEvents();
      setIsDeleteOpen(false);
      setDeleteId(null);
      setDeleteEvent(null);

      toast({
        title: 'Evento eliminado',
        description: 'El evento ha sido eliminado exitosamente',
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description:
          (error as Error).message || 'No se pudo eliminar el evento',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (event: Event) => {
    setSelectedEventId(null);
    setEventExpenses([]);
    setEditEvent(event);
    setEditEventName(event.name);
    setEditEventDescription(event.description ?? '');
    setEditNameError('');
    setIsEditOpen(true);
  };

  const handleReassignEvent = async (expenseId: string) => {
    if (!selectedEventId) return;
    setIsReassigning(true);
    try {
      const newEventId = reassignEventId === '__none__' ? null : Number(reassignEventId);
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: newEventId }),
      });
      if (!response.ok) throw new Error('Failed to update expense event');

      // Refresh both the expense list and the event list (expense_count may change)
      await Promise.all([
        (async () => {
          const res = await fetch(`/api/events/${selectedEventId}/expenses`);
          if (res.ok) {
            const data = await res.json();
            setEventExpenses(data.expenses ?? []);
          }
        })(),
        loadEvents(),
      ]);

      setEditingExpenseId(null);
      toast({ title: 'Evento actualizado', description: 'El gasto fue reasignado exitosamente' });
    } catch (error) {
      console.error('Error reassigning event:', error);
      toast({ title: 'Error', description: 'No se pudo reasignar el evento', variant: 'destructive' });
    } finally {
      setIsReassigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Cargando eventos...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="mt-1 text-muted-foreground">
            {searchFilter
              ? `${filteredEvents.length} de ${events.length} eventos`
              : `${events.length} ${events.length === 1 ? 'evento registrado' : 'eventos registrados'}`}
          </p>
        </div>
        <Dialog
          open={isAddOpen}
          onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) resetAddForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Evento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Evento</DialogTitle>
              <DialogDescription>
                Ingresa los detalles del nuevo evento
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="event-name">Nombre *</Label>
                <Input
                  id="event-name"
                  value={newEventName}
                  onChange={(e) => {
                    setNewEventName(e.target.value);
                    setAddNameError('');
                  }}
                  placeholder="Ej: Cumpleaños, Viaje, Navidad, etc."
                  maxLength={255}
                />
                {addNameError && (
                  <p className="text-sm text-destructive">{addNameError}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-description">
                  Descripción (opcional)
                </Label>
                <Textarea
                  id="event-description"
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                  placeholder="Descripción del evento..."
                  maxLength={1000}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  resetAddForm();
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button onClick={handleAddEvent} disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Mis Eventos
          </CardTitle>
          <CardDescription>
            Administra los eventos para clasificar tus gastos
          </CardDescription>
          <div className="relative flex items-center gap-2 mt-2">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar evento..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchInput && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 h-7 w-7 p-0"
                onClick={handleClearSearch}
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="py-8 text-center">
              <Tag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-muted-foreground">
                No hay eventos registrados
              </p>
              <Button onClick={() => setIsAddOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Primer Evento
              </Button>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-8 text-center">
              <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-muted-foreground">
                No hay eventos que coincidan con &quot;{searchFilter}&quot;
              </p>
              <Button variant="outline" onClick={handleClearSearch}>
                <X className="mr-2 h-4 w-4" />
                Limpiar búsqueda
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Gastos</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                    <React.Fragment key={event.id}>
                      <TableRow
                        className={`cursor-pointer hover:bg-accent/50 ${selectedEventId === event.id ? 'bg-accent' : ''}`}
                        onClick={() => handleRowClick(event.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {selectedEventId === event.id ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                            {event.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {event.description ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {event.expense_count ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleEditClick(event); }}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(event); }}
                          >
                            Eliminar
                          </Button>
                        </TableCell>
                      </TableRow>
                      {selectedEventId === event.id && (
                        <TableRow>
                          <TableCell colSpan={4} className="bg-muted/30 p-0">
                            <div className="p-4">
                              {isLoadingExpenses ? (
                                <p className="text-center text-sm text-muted-foreground">Cargando gastos...</p>
                              ) : eventExpenses.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground">No hay gastos asociados a este evento</p>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      variant={expenseGroupMode === 'flat' ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => setExpenseGroupMode('flat')}
                                    >
                                      Por Fecha
                                    </Button>
                                    <Button
                                      variant={expenseGroupMode === 'grouped' ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => setExpenseGroupMode('grouped')}
                                    >
                                      Por Categoría
                                    </Button>
                                    <Button
                                      variant={expenseGroupMode === 'charts' ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => setExpenseGroupMode('charts')}
                                    >
                                      <BarChart3 className="mr-2 h-4 w-4" />
                                      Gráficas
                                    </Button>
                                  </div>
                                  {expenseGroupMode === 'charts' ? (
                                    <div className="mt-4 space-y-2">
                                      <p className="text-sm text-muted-foreground">
                                        Total por categoría — {categoryChartData.length} categorías
                                      </p>
                                      <ResponsiveContainer width="100%" height={350}>
                                        <BarChart data={categoryChartData} margin={{ top: 10, right: 20, left: 20, bottom: 80 }}>
                                          <CartesianGrid strokeDasharray="3 3" />
                                          <XAxis
                                            dataKey="name"
                                            angle={-40}
                                            textAnchor="end"
                                            interval={0}
                                            tick={{ fontSize: 12 }}
                                          />
                                          <YAxis
                                            tickFormatter={(v) =>
                                              new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)
                                            }
                                            tick={{ fontSize: 11 }}
                                            width={90}
                                          />
                                          <Tooltip
                                            formatter={(value: number) =>
                                              new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
                                            }
                                          />
                                          <Bar dataKey="total" fill="#f97316" radius={[4, 4, 0, 0]} name="Monto" />
                                        </BarChart>
                                      </ResponsiveContainer>
                                    </div>
                                  ) : (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead>Categoría</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                        <TableHead>Tipo de Pago</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Evento</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {expenseGroupMode === 'flat' ? (
                                        sortedExpenses.map((expense) => (
                                          <TableRow key={expense.id}>
                                            <TableCell>{expense.description ?? '—'}</TableCell>
                                            <TableCell className="text-muted-foreground">{expense.category_name ?? '—'}</TableCell>
                                            <TableCell className="text-right font-medium">
                                              {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(expense.amount)}
                                            </TableCell>
                                            <TableCell>
                                              {expense.payment_method === 'credito' ? 'Tarjeta de Crédito' : 'Efectivo/Débito'}
                                            </TableCell>
                                            <TableCell>
                                              {formatDate(expense.date, { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </TableCell>
                                            <TableCell>
                                              {editingExpenseId === expense.id ? (
                                                <div className="flex items-center gap-1">
                                                  <Select
                                                    value={reassignEventId}
                                                    onValueChange={setReassignEventId}
                                                  >
                                                    <SelectTrigger className="h-7 w-40 text-xs">
                                                      <SelectValue placeholder="Sin evento" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="__none__">Sin evento</SelectItem>
                                                      {events.map((ev) => (
                                                        <SelectItem key={ev.id} value={String(ev.id)}>
                                                          {ev.name}
                                                        </SelectItem>
                                                      ))}
                                                    </SelectContent>
                                                  </Select>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                                                    disabled={isReassigning}
                                                    onClick={() => handleReassignEvent(expense.id)}
                                                    aria-label="Confirmar"
                                                  >
                                                    <Check className="h-4 w-4" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0"
                                                    disabled={isReassigning}
                                                    onClick={() => setEditingExpenseId(null)}
                                                    aria-label="Cancelar"
                                                  >
                                                    <X className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              ) : (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-7 gap-1 px-2 text-xs"
                                                  onClick={() => {
                                                    setReassignEventId(String(selectedEventId ?? ''));
                                                    setEditingExpenseId(expense.id);
                                                  }}
                                                >
                                                  <Pencil className="h-3 w-3" />
                                                  Editar
                                                </Button>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))
                                      ) : (
                                        groupedExpenses.map(([categoryName, expenses]) => (
                                          <React.Fragment key={categoryName}>
                                            <TableRow className="bg-primary/15">
                                              <TableCell colSpan={6} className="font-semibold text-primary">
                                                {categoryName}{' '}
                                                <Badge className="ml-1 bg-primary/20 text-primary hover:bg-primary/30">{expenses.length}</Badge>
                                              </TableCell>
                                            </TableRow>
                                            {expenses.map((expense) => (
                                              <TableRow key={expense.id}>
                                                <TableCell>{expense.description ?? '—'}</TableCell>
                                                <TableCell className="text-muted-foreground">{expense.category_name ?? '—'}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                  {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(expense.amount)}
                                                </TableCell>
                                                <TableCell>
                                                  {expense.payment_method === 'credito' ? 'Tarjeta de Crédito' : 'Efectivo/Débito'}
                                                </TableCell>
                                                <TableCell>
                                                  {formatDate(expense.date, { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </TableCell>
                                                <TableCell>
                                                  {editingExpenseId === expense.id ? (
                                                    <div className="flex items-center gap-1">
                                                      <Select
                                                        value={reassignEventId}
                                                        onValueChange={setReassignEventId}
                                                      >
                                                        <SelectTrigger className="h-7 w-40 text-xs">
                                                          <SelectValue placeholder="Sin evento" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          <SelectItem value="__none__">Sin evento</SelectItem>
                                                          {events.map((ev) => (
                                                            <SelectItem key={ev.id} value={String(ev.id)}>
                                                              {ev.name}
                                                            </SelectItem>
                                                          ))}
                                                        </SelectContent>
                                                      </Select>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                                                        disabled={isReassigning}
                                                        onClick={() => handleReassignEvent(expense.id)}
                                                        aria-label="Confirmar"
                                                      >
                                                        <Check className="h-4 w-4" />
                                                      </Button>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0"
                                                        disabled={isReassigning}
                                                        onClick={() => setEditingExpenseId(null)}
                                                        aria-label="Cancelar"
                                                      >
                                                        <X className="h-4 w-4" />
                                                      </Button>
                                                    </div>
                                                  ) : (
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 gap-1 px-2 text-xs"
                                                      onClick={() => {
                                                        setReassignEventId(String(selectedEventId ?? ''));
                                                        setEditingExpenseId(expense.id);
                                                      }}
                                                    >
                                                      <Pencil className="h-3 w-3" />
                                                      Editar
                                                    </Button>
                                                  )}
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </React.Fragment>
                                        ))
                                      )}
                                    </TableBody>
                                  </Table>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) resetEditForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>
              Actualiza los detalles del evento
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-event-name">Nombre *</Label>
              <Input
                id="edit-event-name"
                value={editEventName}
                onChange={(e) => {
                  setEditEventName(e.target.value);
                  setEditNameError('');
                }}
                placeholder="Nombre del evento"
                maxLength={255}
              />
              {editNameError && (
                <p className="text-sm text-destructive">{editNameError}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-event-description">
                Descripción (opcional)
              </Label>
              <Textarea
                id="edit-event-description"
                value={editEventDescription}
                onChange={(e) => setEditEventDescription(e.target.value)}
                placeholder="Descripción del evento..."
                maxLength={1000}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                resetEditForm();
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditEvent} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {
            setDeleteId(null);
            setDeleteEvent(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {(deleteEvent?.expense_count ?? 0) > 0 && (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              Eliminar Evento
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {(deleteEvent?.expense_count ?? 0) > 0 ? (
                  <>
                    <p>
                      El evento <strong>{deleteEvent?.name}</strong> tiene{' '}
                      <strong>{deleteEvent?.expense_count}</strong> gastos
                      asociados.
                    </p>
                    <p className="font-medium text-destructive">
                      Al eliminar el evento, se removerá la asociación con los
                      gastos existentes, pero los gastos se mantendrán. Esta
                      acción no se puede deshacer.
                    </p>
                  </>
                ) : (
                  <p>
                    ¿Estás seguro de que deseas eliminar el evento{' '}
                    <strong>{deleteEvent?.name}</strong>? Esta acción no se
                    puede deshacer.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                handleDeleteConfirm((deleteEvent?.expense_count ?? 0) > 0)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Eliminando...' : 'Eliminar evento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
