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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';
import type { SubgroupTemplate } from '@/types/subgroup-templates';

interface RefreshTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: SubgroupTemplate | null;
  onTemplateRefreshed?: (updatedTemplate: SubgroupTemplate) => void;
  currentSimulationId?: number; // Exclude current simulation from options
}

interface Simulation {
  id: number;
  name: string;
  hasSubgroups: boolean;
}

export function RefreshTemplateDialog({
  isOpen,
  onClose,
  template,
  onTemplateRefreshed,
  currentSimulationId,
}: RefreshTemplateDialogProps) {
  const [selectedSimulationId, setSelectedSimulationId] = useState<string>('');
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const { toast } = useToast();

  // Fetch simulations with subgroups when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchSimulations();
    }
  }, [isOpen]);

  const fetchSimulations = async () => {
    setIsFetching(true);
    try {
      const response = await fetch('/api/simulations');
      const data = await response.json();

      if (data.success && data.simulations) {
        // Filter simulations that have subgroups
        const simulationsWithSubgroups = await Promise.all(
          data.simulations.map(async (sim: any) => {
            try {
              const subgroupsResponse = await fetch(
                `/api/simulations/${sim.id}/subgroups`
              );
              const subgroupsData = await subgroupsResponse.json();
              return {
                id: sim.id,
                name: sim.name || `Simulation ${sim.id}`,
                hasSubgroups:
                  subgroupsData.success && subgroupsData.subgroups?.length > 0,
              };
            } catch {
              return {
                id: sim.id,
                name: sim.name || `Simulation ${sim.id}`,
                hasSubgroups: false,
              };
            }
          })
        );

        // Filter to only show simulations with subgroups, excluding current simulation
        const filtered = simulationsWithSubgroups
          .filter((s) => s.hasSubgroups && s.id !== currentSimulationId)
          .sort((a, b) => a.name.localeCompare(b.name));

        setSimulations(filtered);
      }
    } catch (error) {
      console.error('Error fetching simulations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch simulations',
        variant: 'destructive',
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleRefresh = async () => {
    if (!template || !selectedSimulationId) {
      toast({
        title: 'Error',
        description: 'Please select a source simulation',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/subgroup-templates/${template.id}/refresh`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourceSimulationId: parseInt(selectedSimulationId, 10),
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Template Refreshed',
          description:
            data.message || 'Template has been refreshed successfully',
        });
        onTemplateRefreshed?.(data.template);
        onClose();
        setSelectedSimulationId('');
      } else {
        throw new Error(data.error || 'Failed to refresh template');
      }
    } catch (error) {
      console.error('Error refreshing template:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to refresh template',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedSimulationId('');
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refresh Template</DialogTitle>
          <DialogDescription>
            Update this template with subgroups and categories from another
            simulation. This will replace all existing template data with the
            source simulation data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {template && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium">Template: {template.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {template.subgroups?.length || 0} subgroup(s)
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="source-simulation">Source Simulation *</Label>
            <Select
              value={selectedSimulationId}
              onValueChange={setSelectedSimulationId}
              disabled={isFetching || isLoading}
            >
              <SelectTrigger id="source-simulation">
                {isFetching ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading simulations...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Select a simulation" />
                )}
              </SelectTrigger>
              <SelectContent>
                {simulations.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    No simulations with subgroups found
                  </div>
                ) : (
                  simulations.map((sim) => (
                    <SelectItem key={sim.id} value={sim.id.toString()}>
                      {sim.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only simulations with subgroups are shown
            </p>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/20">
            <p className="mb-1 font-medium text-amber-800 dark:text-amber-400">
              ⚠️ This action will replace the template
            </p>
            <ul className="list-inside list-disc space-y-1 text-xs text-amber-700 dark:text-amber-500">
              <li>All current template subgroups will be deleted</li>
              <li>New subgroups will be created from the source simulation</li>
              <li>Category assignments will be updated</li>
              <li>This action cannot be undone</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isLoading || !selectedSimulationId || isFetching}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
