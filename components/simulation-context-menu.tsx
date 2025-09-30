"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  Settings,
  BarChart3,
  Copy,
  Edit,
  Trash2,
  ArrowRight,
  Zap,
  Download,
  RefreshCw,
} from "lucide-react";

// Types
type Simulation = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  budget_count: number;
};

interface SimulationContextMenuProps {
  children: React.ReactNode;
  simulation?: Simulation;
  onEdit?: (simulation: Simulation) => void;
  onDelete?: (simulation: Simulation) => void;
  onDuplicate?: (simulation: Simulation) => void;
  onRefresh?: () => void;
  showNavigationOptions?: boolean;
}

export function SimulationContextMenu({
  children,
  simulation,
  onEdit,
  onDelete,
  onDuplicate,
  onRefresh,
  showNavigationOptions = true,
}: SimulationContextMenuProps) {
  const router = useRouter();
  const pathname = usePathname();

  // State
  const [recentSimulations, setRecentSimulations] = useState<Simulation[]>([]);

  // Load recent simulations for quick navigation
  useEffect(() => {
    const loadRecentSimulations = async () => {
      if (!simulation) return;

      try {
        const response = await fetch("/api/simulations");
        if (response.ok) {
          const data = await response.json();
          // Get recent simulations excluding current one
          const recent = data
            .filter((s: Simulation) => s.id !== simulation.id)
            .sort(
              (a: Simulation, b: Simulation) =>
                new Date(b.updated_at).getTime() -
                new Date(a.updated_at).getTime()
            )
            .slice(0, 5);
          setRecentSimulations(recent);
        }
      } catch (error) {
        console.error("Error loading recent simulations:", error);
      }
    };

    loadRecentSimulations();
  }, [simulation]);

  // Navigation handlers
  const navigateToSimulation = (id: number) => {
    router.push(`/simular/${id}`);
  };

  const navigateToAnalytics = (id: number) => {
    router.push(`/simular/${id}/analytics`);
  };

  const navigateToSimulationList = () => {
    router.push("/simular");
  };

  // Export handler
  const handleExportSimulation = async () => {
    if (!simulation) return;

    try {
      const response = await fetch(
        `/api/simulations/${simulation.id}/analytics?export=true`
      );
      if (!response.ok) {
        throw new Error("Error al exportar datos");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `simulacion-${simulation.id}-${simulation.name.replace(
        /[^a-zA-Z0-9]/g,
        "-"
      )}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting simulation:", error);
    }
  };

  // Check current page context
  const isAnalyticsPage = pathname.includes("/analytics");
  const isConfigPage = pathname.includes("/simular/") && !isAnalyticsPage;
  const isListPage = pathname === "/simular";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {/* Navigation options */}
        {showNavigationOptions && simulation && (
          <>
            {!isConfigPage && (
              <ContextMenuItem
                onClick={() => navigateToSimulation(simulation.id)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Configurar Simulación
              </ContextMenuItem>
            )}

            {!isAnalyticsPage && (
              <ContextMenuItem
                onClick={() => navigateToAnalytics(simulation.id)}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Ver Análisis
              </ContextMenuItem>
            )}

            {!isListPage && (
              <ContextMenuItem
                onClick={navigateToSimulationList}
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Ver Todas las Simulaciones
              </ContextMenuItem>
            )}

            <ContextMenuSeparator />
          </>
        )}

        {/* Simulation actions */}
        {simulation && (
          <>
            {onEdit && (
              <ContextMenuItem
                onClick={() => onEdit(simulation)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Editar Información
              </ContextMenuItem>
            )}

            {onDuplicate && (
              <ContextMenuItem
                onClick={() => onDuplicate(simulation)}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Duplicar Simulación
              </ContextMenuItem>
            )}

            <ContextMenuItem
              onClick={handleExportSimulation}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Datos
            </ContextMenuItem>

            <ContextMenuSeparator />

            {onDelete && (
              <ContextMenuItem
                onClick={() => onDelete(simulation)}
                className="flex items-center gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar Simulación
              </ContextMenuItem>
            )}
          </>
        )}

        {/* Quick navigation to other simulations */}
        {recentSimulations.length > 0 && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Cambiar a Otra Simulación
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-56">
                {recentSimulations.map((sim) => (
                  <ContextMenuItem
                    key={sim.id}
                    onClick={() => {
                      if (isAnalyticsPage) {
                        navigateToAnalytics(sim.id);
                      } else {
                        navigateToSimulation(sim.id);
                      }
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {sim.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {sim.budget_count} categorías
                      </div>
                    </div>
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        {/* General actions */}
        {onRefresh && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={onRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar Datos
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
