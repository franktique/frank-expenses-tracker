'use client';

import { useState, useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

// Types
type Simulation = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  budget_count: number;
};

interface SimulationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  simulation?: Simulation | null;
  onSuccess?: (simulation: Simulation) => void;
}

export function SimulationFormDialog({
  open,
  onOpenChange,
  mode,
  simulation,
  onSuccess,
}: SimulationFormDialogProps) {
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form validation errors
  const [errors, setErrors] = useState<{
    name?: string;
    description?: string;
  }>({});

  // Reset form when dialog opens/closes or simulation changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && simulation) {
        setFormData({
          name: simulation.name,
          description: simulation.description || '',
        });
      } else {
        setFormData({
          name: '',
          description: '',
        });
      }
      setErrors({});
    }
  }, [open, mode, simulation]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre de la simulación es requerido';
    } else if (formData.name.length > 255) {
      newErrors.name = 'El nombre no puede exceder 255 caracteres';
    }

    // Description validation (optional, but check length if provided)
    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'La descripción no puede exceder 1000 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const url =
        mode === 'create'
          ? '/api/simulations'
          : `/api/simulations/${simulation?.id}`;

      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Error al ${
              mode === 'create' ? 'crear' : 'actualizar'
            } la simulación`
        );
      }

      const resultSimulation = await response.json();

      // Show success message
      toast({
        title:
          mode === 'create' ? 'Simulación creada' : 'Simulación actualizada',
        description: `La simulación ha sido ${
          mode === 'create' ? 'creada' : 'actualizada'
        } exitosamente`,
      });

      // Call success callback
      if (onSuccess) {
        onSuccess(resultSimulation);
      }

      // Close dialog
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description:
          (error as Error).message ||
          `No se pudo ${
            mode === 'create' ? 'crear' : 'actualizar'
          } la simulación`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    onOpenChange(false);
  };

  // Handle input changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, name: value }));

    // Clear name error when user starts typing
    if (errors.name && value.trim()) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, description: value }));

    // Clear description error when user starts typing
    if (errors.description && value.length <= 1000) {
      setErrors((prev) => ({ ...prev, description: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Crear Nueva Simulación' : 'Editar Simulación'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Ingresa los detalles de la nueva simulación de presupuesto'
              : 'Actualiza los detalles de la simulación'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name field */}
          <div className="grid gap-2">
            <Label htmlFor="simulation-name">Nombre *</Label>
            <Input
              id="simulation-name"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="Ej: Presupuesto Optimizado 2024"
              maxLength={255}
              className={errors.name ? 'border-destructive' : ''}
            />
            <div className="flex items-center justify-between">
              <div>
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.name.length}/255 caracteres
              </p>
            </div>
          </div>

          {/* Description field */}
          <div className="grid gap-2">
            <Label htmlFor="simulation-description">
              Descripción (opcional)
            </Label>
            <Textarea
              id="simulation-description"
              value={formData.description}
              onChange={handleDescriptionChange}
              placeholder="Describe el propósito de esta simulación..."
              rows={3}
              maxLength={1000}
              className={errors.description ? 'border-destructive' : ''}
            />
            <div className="flex items-center justify-between">
              <div>
                {errors.description && (
                  <p className="text-xs text-destructive">
                    {errors.description}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/1000 caracteres
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? mode === 'create'
                ? 'Creando...'
                : 'Guardando...'
              : mode === 'create'
                ? 'Crear Simulación'
                : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
