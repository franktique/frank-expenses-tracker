"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SaveRateDialogProps {
  onSave: (name: string, notes?: string) => Promise<void>;
  defaultName?: string;
  defaultNotes?: string;
  isUpdate?: boolean;
}

export function SaveRateDialog({
  onSave,
  defaultName = "",
  defaultNotes = "",
  isUpdate = false,
}: SaveRateDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [notes, setNotes] = useState(defaultNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName(defaultName);
      setNotes(defaultNotes);
      setError(null);
    }
    setOpen(newOpen);
  };

  const handleSave = async () => {
    // Validate name
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("El nombre es requerido");
      return;
    }

    if (trimmedName.length > 255) {
      setError("El nombre no puede exceder 255 caracteres");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(trimmedName, notes.trim() || undefined);
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al guardar. Intenta de nuevo."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Save className="h-4 w-4 mr-2" />
          {isUpdate ? "Actualizar" : "Guardar Simulación"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isUpdate ? "Actualizar Simulación" : "Guardar Simulación"}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? "Actualiza los datos de esta simulación de tasas."
              : "Dale un nombre a esta simulación para encontrarla fácilmente después."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Ej: Tasa CDT Bancolombia"
              className={error ? "border-red-500" : ""}
              maxLength={255}
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Tasa ofrecida para CDT a 360 días..."
              rows={3}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">
              {notes.length}/2000 caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSaving ? "Guardando..." : isUpdate ? "Actualizar" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
