"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, FileText, Plus } from "lucide-react";
import type { SubgroupTemplate } from "@/types/subgroup-templates";

interface TemplateSelectorProps {
  simulationId: number;
  currentTemplateId?: string | null;
  currentTemplateName?: string | null;
  onTemplateApplied: () => void;
}

export function TemplateSelector({
  simulationId,
  currentTemplateId,
  currentTemplateName,
  onTemplateApplied,
}: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<SubgroupTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const { toast } = useToast();

  // Load templates when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/subgroup-templates");
      const data = await response.json();

      if (data.success && data.templates) {
        setTemplates(data.templates);
      } else {
        throw new Error(data.error || "Failed to load templates");
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    setIsApplying(true);
    setSelectedTemplateId(templateId);

    try {
      const response = await fetch(`/api/simulations/${simulationId}/apply-template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ templateId }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Template Applied",
          description: data.message || "Template applied successfully",
        });
        setIsOpen(false);
        onTemplateApplied();
      } else {
        throw new Error(data.error || "Failed to apply template");
      }
    } catch (error) {
      console.error("Error applying template:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to apply template",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
      setSelectedTemplateId(null);
    }
  };

  const displayText = currentTemplateName || "None (Custom)";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Scenario: {displayText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Template/Scenario</DialogTitle>
          <DialogDescription>
            Choose a template to apply to this simulation. This will replace all existing subgroups.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No templates available.</p>
            <p className="text-sm mt-2">Create a template by saving your current simulation setup.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => {
              const isCurrentTemplate = template.id === currentTemplateId;
              const isApplyingThis = isApplying && selectedTemplateId === template.id;

              return (
                <div
                  key={template.id}
                  className={`border rounded-lg p-4 ${
                    isCurrentTemplate ? "bg-accent border-primary" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {template.name}
                        {isCurrentTemplate && (
                          <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </h3>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Created: {new Date(template.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleApplyTemplate(template.id)}
                      disabled={isApplying || isCurrentTemplate}
                      variant={isCurrentTemplate ? "secondary" : "default"}
                      size="sm"
                    >
                      {isApplyingThis ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Applying...
                        </>
                      ) : isCurrentTemplate ? (
                        "Applied"
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {templates.length} template{templates.length !== 1 ? "s" : ""} available
          </p>
          <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
