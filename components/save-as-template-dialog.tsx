"use client";

import { useState } from "react";
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
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save } from "lucide-react";

interface SaveAsTemplateDialogProps {
  simulationId: number;
  subgroupCount: number;
  categoryCount?: number;
  onTemplateSaved?: () => void;
}

export function SaveAsTemplateDialog({
  simulationId,
  subgroupCount,
  categoryCount,
  onTemplateSaved,
}: SaveAsTemplateDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/simulations/${simulationId}/save-as-template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Template Saved",
          description: `Template "${name}" has been saved successfully`,
        });
        setIsOpen(false);
        setName("");
        setDescription("");
        onTemplateSaved?.();
      } else {
        throw new Error(data.error || "Failed to save template");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName("");
      setDescription("");
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={subgroupCount === 0}>
          <Save className="h-4 w-4" />
          Save as Template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Current Setup as Template</DialogTitle>
          <DialogDescription>
            Save your current subgroup configuration as a reusable template that can be applied to other simulations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              placeholder="e.g., Typical Month 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Description (optional)</Label>
            <Textarea
              id="template-description"
              placeholder="Brief description of when to use this template..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              rows={3}
            />
          </div>

          <div className="bg-muted p-3 rounded-md text-sm">
            <p className="font-medium mb-1">This will save:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>{subgroupCount} subgroup{subgroupCount !== 1 ? "s" : ""} with their names</li>
              <li>Subgroup ordering</li>
              {categoryCount !== undefined && categoryCount > 0 && (
                <li>{categoryCount} category assignment{categoryCount !== 1 ? "s" : ""}</li>
              )}
            </ul>
            <p className="text-green-600 dark:text-green-400 mt-2 text-xs font-medium">
              ✓ Category assignments are preserved and will be automatically applied when using this template.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
