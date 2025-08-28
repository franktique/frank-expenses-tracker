"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Home,
  ChevronDown,
  Zap,
  Settings,
  BarChart3,
  ArrowLeft,
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

interface SimulationBreadcrumbProps {
  simulationId?: number;
  simulationName?: string;
  currentPage?: "config" | "analytics";
  showQuickActions?: boolean;
}

export function SimulationBreadcrumb({
  simulationId,
  simulationName,
  currentPage = "config",
  showQuickActions = true,
}: SimulationBreadcrumbProps) {
  const router = useRouter();

  // State
  const [recentSimulations, setRecentSimulations] = useState<Simulation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load recent simulations for quick switching
  useEffect(() => {
    const loadRecentSimulations = async () => {
      if (!simulationId) return;

      setIsLoading(true);
      try {
        const response = await fetch("/api/simulations");
        if (response.ok) {
          const data = await response.json();
          // Get recent simulations excluding current one
          const recent = data
            .filter((s: Simulation) => s.id !== simulationId)
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
      } finally {
        setIsLoading(false);
      }
    };

    loadRecentSimulations();
  }, [simulationId]);

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

  const navigateToHome = () => {
    router.push("/");
  };

  // Quick action handlers
  const handleQuickSwitch = () => {
    if (currentPage === "config" && simulationId) {
      navigateToAnalytics(simulationId);
    } else if (currentPage === "analytics" && simulationId) {
      navigateToSimulation(simulationId);
    }
  };

  const handleBackToList = () => {
    navigateToSimulationList();
  };

  return (
    <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/"
              className="flex items-center hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                navigateToHome();
              }}
            >
              <Home className="h-4 w-4" />
              <span className="sr-only">Inicio</span>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/simular"
              className="hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                navigateToSimulationList();
              }}
            >
              Simulaciones
            </BreadcrumbLink>
          </BreadcrumbItem>

          {simulationId && simulationName && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {currentPage === "analytics" ? (
                  <BreadcrumbLink
                    href={`/simular/${simulationId}`}
                    className="hover:text-foreground max-w-[200px] truncate"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateToSimulation(simulationId);
                    }}
                  >
                    {simulationName}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="max-w-[200px] truncate">
                    {simulationName}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>

              {currentPage === "analytics" && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Análisis</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Quick Actions */}
      {showQuickActions && simulationId && (
        <div className="flex items-center space-x-2">
          {/* Back to list button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToList}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            <span className="hidden sm:inline">Lista</span>
          </Button>

          {/* Quick switch between config and analytics */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleQuickSwitch}
            className="flex items-center gap-1"
          >
            {currentPage === "config" ? (
              <>
                <BarChart3 className="h-3 w-3" />
                <span className="hidden sm:inline">Análisis</span>
              </>
            ) : (
              <>
                <Settings className="h-3 w-3" />
                <span className="hidden sm:inline">Configurar</span>
              </>
            )}
          </Button>

          {/* Simulation switcher dropdown */}
          {recentSimulations.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isLoading}>
                  <Zap className="h-3 w-3" />
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Cambiar a otra simulación
                </div>
                {recentSimulations.map((simulation) => (
                  <DropdownMenuItem
                    key={simulation.id}
                    onClick={() => {
                      if (currentPage === "analytics") {
                        navigateToAnalytics(simulation.id);
                      } else {
                        navigateToSimulation(simulation.id);
                      }
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {simulation.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {simulation.budget_count} categorías configuradas
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
                <div className="border-t mt-1 pt-1">
                  <DropdownMenuItem onClick={navigateToSimulationList}>
                    <Zap className="h-4 w-4 mr-2" />
                    Ver todas
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
}
