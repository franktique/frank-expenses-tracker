'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useToast } from '@/components/ui/use-toast';
import type { Expense, CategorySubgroup, CategoryItem, ExpenseDetail } from '@/types/funds';

interface ItemFormState {
  amount: string;
  quantity: string;
  unit: string;
}

interface ExpenseDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense;
  onSuccess?: () => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function ExpenseDetailDialog({
  open,
  onOpenChange,
  expense,
  onSuccess,
}: ExpenseDetailDialogProps) {
  const { toast } = useToast();
  const [subgroups, setSubgroups] = useState<CategorySubgroup[]>([]);
  const [formState, setFormState] = useState<Record<string, ItemFormState>>({});
  const [activeItemIds, setActiveItemIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catalogRes, detailsRes] = await Promise.all([
        fetch(`/api/categories/${expense.category_id}/subgroups`),
        fetch(`/api/expenses/${expense.id}/details`),
      ]);

      if (!catalogRes.ok) throw new Error('Error al cargar catálogo');
      if (!detailsRes.ok) throw new Error('Error al cargar detalles');

      const catalogData: CategorySubgroup[] = await catalogRes.json();
      const detailsData: ExpenseDetail[] = await detailsRes.json();

      setSubgroups(catalogData);

      // Only pre-populate items that have been previously saved
      const initial: Record<string, ItemFormState> = {};
      const savedIds: string[] = [];
      for (const detail of detailsData) {
        initial[detail.item_id] = {
          amount: String(detail.amount),
          quantity: detail.quantity != null ? String(detail.quantity) : '',
          unit: detail.unit ?? '',
        };
        savedIds.push(detail.item_id);
      }
      setFormState(initial);
      setActiveItemIds(savedIds);
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [expense.category_id, expense.id, toast]);

  useEffect(() => {
    if (open) {
      fetchData();
    } else {
      // Reset state when dialog closes
      setActiveItemIds([]);
      setFormState({});
      setPickerOpen(false);
    }
  }, [open, fetchData]);

  // Build a flat lookup of itemId → item for active items
  const itemLookup = useMemo(() => {
    const map: Record<string, CategoryItem & { subgroup_name: string }> = {};
    for (const sg of subgroups) {
      for (const item of sg.items ?? []) {
        map[item.id] = { ...item, subgroup_name: sg.name };
      }
    }
    return map;
  }, [subgroups]);

  // Items available to add (not yet active)
  const availableSubgroups = useMemo(() => {
    return subgroups
      .map((sg) => ({
        ...sg,
        items: (sg.items ?? []).filter((item) => !activeItemIds.includes(item.id)),
      }))
      .filter((sg) => sg.items.length > 0);
  }, [subgroups, activeItemIds]);

  const addItem = (item: CategoryItem) => {
    setActiveItemIds((prev) => [...prev, item.id]);
    setFormState((prev) => ({
      ...prev,
      [item.id]: { amount: '', quantity: '', unit: item.default_unit ?? '' },
    }));
    setPickerOpen(false);
  };

  const removeItem = (itemId: string) => {
    setActiveItemIds((prev) => prev.filter((id) => id !== itemId));
    setFormState((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const updateField = (itemId: string, field: keyof ItemFormState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const totalEntered = activeItemIds.reduce((sum, id) => {
    const v = parseFloat(formState[id]?.amount ?? '');
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  const expenseAmount = Number(expense.amount);
  const isValid = Math.abs(totalEntered - expenseAmount) < 0.01;
  const isOver = totalEntered > expenseAmount + 0.01;

  const totalColor = isValid
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

  const handleSave = async () => {
    setSaving(true);
    try {
      const details = activeItemIds
        .filter((id) => {
          const s = formState[id];
          return s && s.amount !== '' && !isNaN(parseFloat(s.amount));
        })
        .map((itemId) => {
          const s = formState[itemId];
          return {
            item_id: itemId,
            amount: parseFloat(s.amount),
            quantity: s.quantity ? parseFloat(s.quantity) : null,
            unit: s.unit.trim() || null,
          };
        });

      const res = await fetch(`/api/expenses/${expense.id}/details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar detalles');
      }

      toast({ title: 'Detalles guardados correctamente' });
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const hasCatalogItems = subgroups.some((sg) => (sg.items?.length ?? 0) > 0);

  // Group active items by their sub-group for display
  const activeBySubgroup = useMemo(() => {
    const groups: Array<{ subgroupId: string; subgroupName: string; items: CategoryItem[] }> = [];
    for (const sg of subgroups) {
      const active = (sg.items ?? []).filter((item) => activeItemIds.includes(item.id));
      if (active.length > 0) {
        groups.push({ subgroupId: sg.id, subgroupName: sg.name, items: active });
      }
    }
    return groups;
  }, [subgroups, activeItemIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Detalle del gasto</DialogTitle>
          <DialogDescription>
            {expense.description} · {expense.category_name} ·{' '}
            {formatCurrency(expenseAmount)}
            {expense.store_name && ` · ${expense.store_name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Cargando...</div>
          ) : !hasCatalogItems ? (
            <div className="py-8 text-center text-muted-foreground">
              Esta categoría no tiene ítems definidos. Agrégalos desde la sección de Categorías.
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Column headers — only shown when there are active items */}
              {activeItemIds.length > 0 && (
                <div className="grid grid-cols-[1fr_100px_90px_80px_28px] gap-2 items-center px-1 pb-1 border-b">
                  <span className="text-xs text-muted-foreground">Ítem</span>
                  <span className="text-xs text-muted-foreground">Monto ($)</span>
                  <span className="text-xs text-muted-foreground">Cantidad</span>
                  <span className="text-xs text-muted-foreground">Unidad</span>
                  <span />
                </div>
              )}

              {/* Active items grouped by sub-group */}
              {activeBySubgroup.map((group) => (
                <div key={group.subgroupId}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 px-1">
                    {group.subgroupName}
                  </h4>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const state = formState[item.id] ?? { amount: '', quantity: '', unit: '' };
                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-[1fr_100px_90px_80px_28px] gap-2 items-center px-1"
                        >
                          <span className="text-sm truncate">{item.name}</span>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Monto"
                            value={state.amount}
                            onChange={(e) => updateField(item.id, 'amount', e.target.value)}
                            className="h-8 text-sm"
                          />
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Cant."
                            value={state.quantity}
                            onChange={(e) => updateField(item.id, 'quantity', e.target.value)}
                            className="h-8 text-sm"
                          />
                          <Input
                            type="text"
                            placeholder="Unidad"
                            value={state.unit}
                            onChange={(e) => updateField(item.id, 'unit', e.target.value)}
                            className="h-8 text-sm"
                          />
                          <button
                            onClick={() => removeItem(item.id)}
                            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Quitar ítem"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {activeItemIds.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Usa &ldquo;+ Agregar ítem&rdquo; para seleccionar los productos de esta compra.
                </p>
              )}

              {/* Item picker */}
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full mt-1">
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar ítem
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-72 p-0"
                  align="start"
                  side="top"
                >
                  <Command>
                    <CommandInput placeholder="Buscar ítem..." />
                    <CommandList>
                      <CommandEmpty>
                        {availableSubgroups.length === 0
                          ? 'Todos los ítems ya fueron agregados'
                          : 'No se encontraron ítems'}
                      </CommandEmpty>
                      {availableSubgroups.map((sg) => (
                        <CommandGroup key={sg.id} heading={sg.name}>
                          {sg.items.map((item) => (
                            <CommandItem
                              key={item.id}
                              value={`${sg.name} ${item.name}`}
                              onSelect={() => addItem(item)}
                              className="cursor-pointer"
                            >
                              {item.name}
                              {item.default_unit && (
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  ({item.default_unit})
                                </span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {hasCatalogItems && !loading && (
          <div className="border-t pt-3 mt-2">
            <div className={`text-sm font-medium text-right mb-3 ${totalColor}`}>
              Total ingresado: {formatCurrency(totalEntered)} / {formatCurrency(expenseAmount)}
              {!isValid && totalEntered > 0 && (
                <span className="ml-2 text-xs">
                  {isOver
                    ? `(excede por ${formatCurrency(totalEntered - expenseAmount)})`
                    : `(faltan ${formatCurrency(expenseAmount - totalEntered)})`}
                </span>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || activeItemIds.length === 0}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
