'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, Trash2, DollarSign } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { LoanScenario, CurrencyCode } from '@/types/loan-simulator';
import { SUPPORTED_CURRENCIES } from '@/types/loan-simulator';

interface LoanCalculatorFormProps {
  scenario?: LoanScenario;
  onSave?: (data: CreateLoanData) => Promise<LoanScenario>;
  onDelete?: () => Promise<void>;
  isLoading?: boolean;
  readOnly?: boolean;
}

export interface CreateLoanData {
  name: string;
  principal: number;
  interestRate: number;
  termMonths: number;
  startDate: string;
  currency: CurrencyCode;
}

export function LoanCalculatorForm({
  scenario,
  onSave,
  onDelete,
  isLoading = false,
  readOnly = false,
}: LoanCalculatorFormProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState<CreateLoanData>({
    name: scenario?.name || '',
    principal: scenario?.principal || 0,
    interestRate: scenario?.interestRate || 0,
    termMonths: scenario?.termMonths || 360,
    startDate: scenario?.startDate || new Date().toISOString().split('T')[0],
    currency: scenario?.currency || 'USD',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleChange = (
    field: keyof CreateLoanData,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del préstamo es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    if (formData.principal <= 0) {
      toast({
        title: 'Error',
        description: 'El monto del préstamo debe ser positivo',
        variant: 'destructive',
      });
      return;
    }

    if (formData.interestRate <= 0) {
      toast({
        title: 'Error',
        description: 'La tasa de interés debe ser positiva',
        variant: 'destructive',
      });
      return;
    }

    if (formData.termMonths <= 0) {
      toast({
        title: 'Error',
        description: 'El plazo debe ser positivo',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.startDate) {
      toast({
        title: 'Error',
        description: 'La fecha de inicio es obligatoria',
        variant: 'destructive',
      });
      return;
    }

    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(formData);
      toast({
        title: 'Éxito',
        description: scenario
          ? 'Préstamo actualizado correctamente'
          : 'Préstamo creado correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Error al guardar el préstamo',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    if (!confirm('¿Estás seguro de que deseas eliminar este préstamo?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete();
      toast({
        title: 'Éxito',
        description: 'Préstamo eliminado correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Error al eliminar el préstamo',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Préstamo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ej: Hipoteca Casa, Préstamo Auto"
              disabled={readOnly || isLoading || isSaving || isDeleting}
            />
          </div>

          {/* Principal */}
          <div className="space-y-2">
            <Label htmlFor="principal">Monto del Préstamo *</Label>
            <div className="flex gap-2">
              <Input
                id="principal"
                type="number"
                step="0.01"
                min="0"
                value={formData.principal}
                onChange={(e) =>
                  handleChange('principal', parseFloat(e.target.value) || 0)
                }
                placeholder="500000"
                disabled={readOnly || isLoading || isSaving || isDeleting}
                className="flex-1"
              />
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  handleChange('currency', value as CurrencyCode)
                }
                disabled={readOnly || isLoading || isSaving || isDeleting}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="USD" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[]).map(
                    (currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency} - {SUPPORTED_CURRENCIES[currency].name}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Interest Rate */}
          <div className="space-y-2">
            <Label htmlFor="interestRate">Tasa de Interés (EA) * %</Label>
            <Input
              id="interestRate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.interestRate}
              onChange={(e) =>
                handleChange('interestRate', parseFloat(e.target.value) || 0)
              }
              placeholder="8.5"
              disabled={readOnly || isLoading || isSaving || isDeleting}
            />
            <p className="text-xs text-muted-foreground">
              EA = Tasa Efectiva Anual
            </p>
          </div>

          {/* Term */}
          <div className="space-y-2">
            <Label htmlFor="termMonths">Plazo (meses) *</Label>
            <Input
              id="termMonths"
              type="number"
              min="1"
              max="480"
              value={formData.termMonths}
              onChange={(e) =>
                handleChange('termMonths', parseInt(e.target.value) || 0)
              }
              placeholder="360"
              disabled={readOnly || isLoading || isSaving || isDeleting}
            />
            <p className="text-xs text-muted-foreground">
              {Math.floor(formData.termMonths / 12)} años,{' '}
              {formData.termMonths % 12} meses
            </p>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">Fecha de Inicio *</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              disabled={readOnly || isLoading || isSaving || isDeleting}
            />
          </div>
        </div>

        {/* Actions */}
        {!readOnly && (
          <div className="mt-6 flex gap-2">
            {onSave && (
              <Button
                onClick={handleSave}
                disabled={isLoading || isSaving || isDeleting}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {scenario ? 'Actualizar' : 'Crear'}
                  </>
                )}
              </Button>
            )}
            {scenario && onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading || isSaving || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
