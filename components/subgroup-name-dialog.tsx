"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface SubgroupNameDialogProps {
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
  existingNames?: string[];
}

export function SubgroupNameDialog({
  isOpen,
  isLoading = false,
  onClose,
  onConfirm,
  existingNames = [],
}: SubgroupNameDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    setName("");
    setError(null);
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(async () => {
    const trimmedName = name.trim();

    // Validation
    if (!trimmedName) {
      setError("El nombre del subgrupo no puede estar vacío");
      return;
    }

    if (trimmedName.length > 255) {
      setError("El nombre del subgrupo no puede exceder 255 caracteres");
      return;
    }

    if (
      existingNames.some(
        (existing) => existing.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      setError("Ya existe un subgrupo con este nombre");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(trimmedName);
      handleClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al crear el subgrupo";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [name, existingNames, onConfirm, handleClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !isSubmitting) {
        handleConfirm();
      } else if (e.key === "Escape") {
        handleClose();
      }
    },
    [handleConfirm, isSubmitting, handleClose]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Subgrupo</DialogTitle>
          <DialogDescription>
            Ingresa un nombre para el nuevo subgrupo de categorías
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="subgroup-name">Nombre del Subgrupo</Label>
            <Input
              id="subgroup-name"
              placeholder="Ej: Servicios, Seguros, Transporte..."
              value={name}
              onChange={handleNameChange}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting || isLoading}
              autoFocus
              maxLength={255}
            />
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting || isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || isLoading || !name.trim()}
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear Subgrupo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
