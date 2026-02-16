'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, FileText, Plus, Trash2 } from 'lucide-react';
import type { SubgroupTemplate } from '@/types/subgroup-templates';

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
  const [isRemoving, setIsRemoving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
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
      const response = await fetch('/api/subgroup-templates');
      const data = await response.json();

      if (data.success && data.templates) {
        setTemplates(data.templates);
      } else {
        throw new Error(data.error || 'Failed to load templates');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    setIsApplying(true);
    setSelectedTemplateId(templateId);

    try {
      const response = await fetch(
        `/api/simulations/${simulationId}/apply-template`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ templateId }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Template Applied',
          description: data.message || 'Template applied successfully',
        });
        setIsOpen(false);
        onTemplateApplied();
      } else {
        throw new Error(data.error || 'Failed to apply template');
      }
    } catch (error) {
      console.error('Error applying template:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to apply template',
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
      setSelectedTemplateId(null);
    }
  };

  const handleRemoveTemplate = async () => {
    setIsRemoving(true);

    try {
      const response = await fetch(
        `/api/simulations/${simulationId}/applied-template`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Template Removed',
          description:
            data.message ||
            'Applied template has been removed. You can now apply a different template.',
        });
        setShowRemoveConfirm(false);
        onTemplateApplied();
      } else {
        throw new Error(data.error || 'Failed to remove template');
      }
    } catch (error) {
      console.error('Error removing template:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to remove template',
        variant: 'destructive',
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const displayText = currentTemplateName || 'None (Custom)';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Scenario: {displayText}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Template/Scenario</DialogTitle>
            <DialogDescription>
              Choose a template to apply to this simulation. This will replace
              all existing subgroups.
            </DialogDescription>
            {currentTemplateId && (
              <div className="mt-2 flex items-center justify-between rounded bg-muted p-2">
                <span className="text-sm">
                  Current: <strong>{currentTemplateName}</strong>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRemoveConfirm(true)}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Remove
                </Button>
              </div>
            )}
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No templates available.</p>
              <p className="mt-2 text-sm">
                Create a template by saving your current simulation setup.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => {
                const isCurrentTemplate = template.id === currentTemplateId;
                const isApplyingThis =
                  isApplying && selectedTemplateId === template.id;

                return (
                  <div
                    key={template.id}
                    className={`rounded-lg border p-4 ${
                      isCurrentTemplate ? 'border-primary bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {template.name}
                          {isCurrentTemplate && (
                            <span className="ml-2 rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                              Current
                            </span>
                          )}
                        </h3>
                        {template.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {template.description}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                          Created:{' '}
                          {new Date(template.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleApplyTemplate(template.id)}
                        disabled={isApplying || isCurrentTemplate}
                        variant={isCurrentTemplate ? 'secondary' : 'default'}
                        size="sm"
                      >
                        {isApplyingThis ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Applying...
                          </>
                        ) : isCurrentTemplate ? (
                          'Applied'
                        ) : (
                          'Apply'
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {templates.length} template{templates.length !== 1 ? 's' : ''}{' '}
              available
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Template Confirmation Dialog */}
      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Applied Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the link to the applied template{' '}
              <strong>"{currentTemplateName}"</strong>. Your current subgroups
              and categories will remain intact - you'll just be able to apply a
              different template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveTemplate}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Template'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
