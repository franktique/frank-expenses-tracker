'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, DollarSign } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/loan-calculations';
import type { CurrencyCode } from '@/types/loan-simulator';

interface ExtraPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ExtraPaymentData) => Promise<void>;
  paymentNumber: number;
  paymentDate?: string;
  remainingBalance?: number;
  isLoading?: boolean;
  currency?: CurrencyCode;
}

export interface ExtraPaymentData {
  amount: number;
  description?: string;
}

export function ExtraPaymentDialog({
  open,
  onOpenChange,
  onSubmit,
  paymentNumber,
  paymentDate,
  remainingBalance,
  isLoading = false,
  currency = 'USD',
}: ExtraPaymentDialogProps) {
  const { toast } = useToast();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const amountValue = parseFloat(amount);

    if (isNaN(amountValue) || amountValue <= 0) {
      toast({
        title: 'Error',
        description: 'El monto del pago extra debe ser positivo',
        variant: 'destructive',
      });
      return;
    }

    if (remainingBalance && amountValue > remainingBalance) {
      toast({
        title: 'Error',
        description: `El monto no puede exceder el balance restante (${formatCurrency(remainingBalance, currency)})`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        amount: amountValue,
        description: description.trim() || undefined,
      });
      // Reset form
      setAmount('');
      setDescription('');
      onOpenChange(false);
      toast({
        title: 'Éxito',
        description: 'Pago extra agregado correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Error al agregar el pago extra',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting) {
      setAmount('');
      setDescription('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Agregar Pago Extra
          </DialogTitle>
          <DialogDescription>
            Agrega un pago extra al #{paymentNumber}
            {paymentDate && ` (${paymentDate})`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Monto del Pago Extra *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting || isLoading}
              autoFocus
            />
            {remainingBalance && (
              <p className="text-xs text-muted-foreground">
                Balance restante: {formatCurrency(remainingBalance, currency)}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input
              id="description"
              placeholder="Ej: Bono anual, Liquidación, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting || isLoading}
            />
          </div>

          {/* Info Box */}
          <div className="rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-950">
            <p className="mb-1 font-medium">¿Cómo funcionan los pagos extra?</p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>Se aplican directamente al capital</li>
              <li>Reducen el balance restante</li>
              <li>Aceluran el pago del préstamo</li>
              <li>Ahorran intereses a futuro</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting || isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading || !amount}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Agregar Pago Extra'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
