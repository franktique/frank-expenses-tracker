'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreditCardSelector } from '@/components/credit-card-selector';
import type { CreditCard } from '@/types/credit-cards';
import type { DebtObligation, CreateDebtInput } from '@/types/debt-tracking';

interface Category {
  id: string;
  name: string;
}

interface DebtFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt?: DebtObligation | null;
  onSave: () => void;
}

const emptyForm = (): CreateDebtInput => ({
  name: '',
  credit_card_id: null,
  category_id: null,
  monto_original: 0,
  plazo_original: 12,
  fecha_inicio: null,
  cuotas_pendientes: 12,
  tasa_interes: 0,
  tipo_tasa: 'EA',
  saldo_actual: 0,
  pago_mensual: 0,
  valor_seguro: 0,
  dia_pago: null,
});

export function DebtFormDialog({
  open,
  onOpenChange,
  debt,
  onSave,
}: DebtFormDialogProps) {
  const [form, setForm] = useState<CreateDebtInput>(emptyForm());
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (debt) {
        setForm({
          name: debt.name,
          credit_card_id: debt.credit_card_id,
          category_id: debt.category_id,
          monto_original: debt.monto_original,
          plazo_original: debt.plazo_original,
          fecha_inicio: debt.fecha_inicio,
          cuotas_pendientes: debt.cuotas_pendientes,
          tasa_interes: debt.tasa_interes,
          tipo_tasa: debt.tipo_tasa,
          saldo_actual: debt.saldo_actual,
          pago_mensual: debt.pago_mensual,
          valor_seguro: debt.valor_seguro ?? 0,
          dia_pago: debt.dia_pago,
        });
      } else {
        setForm(emptyForm());
        setSelectedCard(null);
      }
      setError(null);
    }
  }, [open, debt]);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? data ?? []))
      .catch(() => setCategories([]));
  }, []);

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  function set(field: keyof CreateDebtInput, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = debt
        ? `/api/debt-obligations/${debt.id}`
        : '/api/debt-obligations';
      const method = debt ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Error al guardar');
        return;
      }
      onSave();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {debt ? 'Editar deuda' : 'Nueva deuda'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Name */}
          <div className="space-y-1">
            <Label>Nombre *</Label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej: Crédito libre Banco X"
            />
          </div>

          {/* Credit card */}
          <div className="space-y-1">
            <Label>Tarjeta de crédito (opcional)</Label>
            <CreditCardSelector
              selectedCreditCard={selectedCard}
              onCreditCardChange={(card) => {
                setSelectedCard(card);
                set('credit_card_id', card?.id ?? null);
              }}
              showNoCardOption
              placeholder="Sin tarjeta (crédito libre)"
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label>Categoría de pago (opcional)</Label>
            <Select
              value={form.category_id ?? '__none__'}
              onValueChange={(v) => set('category_id', v === '__none__' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 pb-1">
                  <Input
                    placeholder="Buscar categoría..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="h-7 text-sm"
                  />
                </div>
                <SelectItem value="__none__">Sin categoría</SelectItem>
                {filteredCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amounts row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Monto original *</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={form.monto_original || ''}
                onChange={(e) => set('monto_original', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label>Saldo actual *</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={form.saldo_actual || ''}
                onChange={(e) => set('saldo_actual', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Terms row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Plazo original (meses) *</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={form.plazo_original || ''}
                onChange={(e) => set('plazo_original', parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-1">
              <Label>Cuotas pendientes *</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.cuotas_pendientes || ''}
                onChange={(e) => set('cuotas_pendientes', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Rate row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tasa de interés (%) *</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={form.tasa_interes || ''}
                onChange={(e) => set('tasa_interes', parseFloat(e.target.value) || 0)}
                placeholder="Ej: 24.5"
              />
            </div>
            <div className="space-y-1">
              <Label>Tipo de tasa *</Label>
              <Select
                value={form.tipo_tasa}
                onValueChange={(v) => set('tipo_tasa', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EA">EA (Efectiva Anual)</SelectItem>
                  <SelectItem value="EM">EM (Efectiva Mensual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Pago mensual actual *</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={form.pago_mensual || ''}
                onChange={(e) => set('pago_mensual', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label>
                Valor seguro (incluido en cuota)
              </Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={form.valor_seguro || ''}
                onChange={(e) => set('valor_seguro', parseFloat(e.target.value) || 0)}
                placeholder="0 si no aplica"
              />
              <p className="text-xs text-muted-foreground">
                Monto fijo de seguros dentro de la cuota
              </p>
            </div>
          </div>

          {/* Payment day */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Día de pago (1-31)</Label>
              <Input
                type="number"
                min="1"
                max="31"
                step="1"
                value={form.dia_pago ?? ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  set('dia_pago', isNaN(v) ? null : v);
                }}
                placeholder="Opcional"
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label>Fecha de inicio / desembolso (opcional)</Label>
            <Input
              type="date"
              value={form.fecha_inicio ?? ''}
              onChange={(e) => set('fecha_inicio', e.target.value || null)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando...' : debt ? 'Guardar cambios' : 'Crear deuda'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
