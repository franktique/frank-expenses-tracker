"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface SaveScenarioDialogProps {
  onSave: (name: string, notes?: string) => Promise<void>;
  defaultName?: string;
  defaultNotes?: string;
  isUpdate?: boolean;
  trigger?: React.ReactNode;
}

export function SaveScenarioDialog({
  onSave,
  defaultName = "",
  defaultNotes = "",
  isUpdate = false,
  trigger,
}: SaveScenarioDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [notes, setNotes] = useState(defaultNotes);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la simulación es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await onSave(name.trim(), notes.trim() || undefined);
      setOpen(false);
      setName("");
      setNotes("");
      toast({
        title: isUpdate ? "Simulación actualizada" : "Simulación guardada",
        description: `"${name.trim()}" ha sido ${isUpdate ? "actualizada" : "guardada"} exitosamente`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message || `No se pudo ${isUpdate ? "actualizar" : "guardar"} la simulación`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setName(defaultName);
      setNotes(defaultNotes);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Save className="h-4 w-4 mr-2" />
            {isUpdate ? "Actualizar" : "Guardar"} Simulación
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isUpdate ? "Actualizar Simulación" : "Guardar Simulación"}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? "Actualiza el nombre y guarda los cambios de tu simulación."
              : "Dale un nombre a tu simulación para guardarla y poder cargarla después."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="scenario-name">Nombre de la simulación</Label>
            <Input
              id="scenario-name"
              placeholder="Ej: CDT Banco X, Fondo de inversión, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scenario-notes">Comentarios (opcional)</Label>
            <Textarea
              id="scenario-notes"
              placeholder="Agrega notas, observaciones o detalles adicionales sobre esta simulación..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length} / 2000 caracteres
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !name.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? "Guardando..." : isUpdate ? "Actualizar" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
