'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  formatCotizacionCurrency,
  type CotizacionItem,
} from '@/types/cotizaciones';

interface Category {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotizacionId: string;
  currency: string;
  editItem?: CotizacionItem;
  onSaved: (item: CotizacionItem) => void;
}

export function AddItemDialog({
  open,
  onOpenChange,
  cotizacionId,
  currency,
  editItem,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEdit = !!editItem;
  const itemTotal = (parseFloat(amount) || 0) * (parseInt(quantity) || 1);

  const filteredCategories = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(query));
  }, [categories, debouncedSearch]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  useEffect(() => {
    if (open) {
      fetchCategories();
      setSearchValue('');
      setDebouncedSearch('');
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (editItem) {
        setCategoryId(editItem.categoryId);
        setAmount(String(editItem.amount));
        setQuantity(String(editItem.quantity));
        setNotes(editItem.notes ?? '');
      } else {
        setCategoryId('');
        setAmount('');
        setQuantity('1');
        setNotes('');
      }
    }
  }, [open, editItem]);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) return;
      const data = await res.json();
      const cats: Category[] = (data as any[]).map((c: any) => ({
        id: c.id,
        name: c.name,
      }));
      setCategories(cats.sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      // silent
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId || !amount) return;

    setLoading(true);
    try {
      const payload = {
        categoryId,
        amount: parseFloat(amount),
        quantity: parseInt(quantity) || 1,
        notes: notes.trim() || undefined,
      };

      let res: Response;
      if (isEdit) {
        res = await fetch(
          `/api/cotizaciones/${cotizacionId}/items/${editItem!.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
      } else {
        res = await fetch(`/api/cotizaciones/${cotizacionId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al guardar');
      }

      const saved: CotizacionItem = await res.json();
      toast({ title: isEdit ? 'Ítem actualizado' : 'Ítem agregado' });
      onOpenChange(false);
      onSaved(saved);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar ítem' : 'Agregar ítem'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Categoría *</Label>
            <Popover
              open={popoverOpen}
              onOpenChange={(nextOpen) => {
                setPopoverOpen(nextOpen);
                if (!nextOpen) setSearchValue('');
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className="w-full justify-between"
                >
                  <span className="truncate">
                    {categoryId
                      ? categories.find((c) => c.id === categoryId)?.name ??
                        'Selecciona una categoría...'
                      : 'Selecciona una categoría...'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Buscar categoría..."
                    value={searchValue}
                    onValueChange={handleSearchChange}
                  />
                  <CommandList>
                    <CommandEmpty>No se encontraron categorías.</CommandEmpty>
                    <CommandGroup>
                      {filteredCategories.map((cat) => (
                        <CommandItem
                          key={cat.id}
                          value={cat.id}
                          onSelect={() => {
                            setCategoryId(cat.id);
                            setPopoverOpen(false);
                            setSearchValue('');
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              categoryId === cat.id
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                          {cat.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="item-qty">Cantidad</Label>
              <Input
                id="item-qty"
                type="number"
                min="1"
                max="99999"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-amount">Valor unitario *</Label>
              <Input
                id="item-amount"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          {itemTotal > 0 && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">Total del ítem: </span>
              <span className="font-semibold">
                {formatCotizacionCurrency(itemTotal, currency)}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="item-notes">Notas (opcional)</Label>
            <Textarea
              id="item-notes"
              placeholder="Ej: Noche del 15 al 16 de enero..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !categoryId || !amount}>
              {loading
                ? 'Guardando...'
                : isEdit
                  ? 'Guardar cambios'
                  : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
