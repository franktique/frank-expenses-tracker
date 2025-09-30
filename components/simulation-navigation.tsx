"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  Clock,
  Zap,
  ArrowRight,
  BarChart3,
  Settings,
  Plus,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

// Types
type Simulation = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  budget_count: number;
};

interface SimulationNavigationProps {
  currentSimulationId?: number;
  showRecentList?: boolean;
  maxRecentItems?: number;
}

export function SimulationNavigation({
  currentSimulationId,
  showRecentList = true,
  maxRecentItems = 5,
}: SimulationNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  // State
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [recentSimulations, setRecentSimulations] = useState<Simulation[]>([]);
  const [currentSimulation, setCurrentSimulation] = useState<Simulation | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  // Load simulations
  const loadSimulations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/simulations");
      if (response.ok) {
        const data = await response.json();
        setSimulations(data);

        // Set current simulation
        if (currentSimulationId) {
          const current = data.find(
            (s: Simulation) => s.id === currentSimulationId
          );
          setCurrentSimulation(current || null);
        }

        // Set recent simulations (most recently updated, excluding current)
        const recent = data
          .filter((s: Simulation) => s.id !== currentSimulationId)
          .sort(
            (a: Simulation, b: Simulation) =>
              new Date(b.updated_at).getTime() -
              new Date(a.updated_at).getTime()
          )
          .slice(0, maxRecentItems);
        setRecentSimulations(recent);
      }
    } catch (error) {
      console.error("Error loading simulations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSimulations();
  }, [currentSimulationId, maxRecentItems]);

  // Navigation handlers
  const navigateToSimulation = (simulationId: number) => {
    router.push(`/simular/${simulationId}`);
  };

  const navigateToAnalytics = (simulationId: number) => {
    router.push(`/simular/${simulationId}/analytics`);
  };

  const navigateToSimulationList = () => {
    router.push("/simular");
  };

  const createNewSimulation = () => {
    router.push("/simular");
    // The simulation list component will handle opening the create dialog
  };

  // Check if we're in analytics view
  const isAnalyticsView = pathname.includes("/analytics");

  return (
    <div className="space-y-4">
      {/* Quick Navigation Dropdown */}
      {currentSimulation && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Zap className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-medium text-sm">Simulación Actual</h3>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {currentSimulation.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Quick actions */}
                {isAnalyticsView ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateToSimulation(currentSimulation.id)}
                    className="flex items-center gap-1"
                  >
                    <Settings className="h-3 w-3" />
                    <span className="hidden sm:inline">Config</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateToAnalytics(currentSimulation.id)}
                    disabled
                    className="flex items-center gap-1"
                  >
                    <BarChart3 className="h-3 w-3" />
                    <span className="hidden sm:inline">Análisis</span>
                  </Button>
                )}

                {/* Simulation selector dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isLoading}>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Cambiar Simulación</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* Recent simulations */}
                    {recentSimulations.length > 0 && (
                      <>
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          Recientes
                        </DropdownMenuLabel>
                        {recentSimulations.map((simulation) => (
                          <DropdownMenuItem
                            key={simulation.id}
                            onClick={() => navigateToSimulation(simulation.id)}
                            className="flex items-center justify-between"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {simulation.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {simulation.budget_count} categorías
                              </div>
                            </div>
                            <ArrowRight className="h-3 w-3 ml-2" />
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                      </>
                    )}

                    {/* Actions */}
                    <DropdownMenuItem onClick={navigateToSimulationList}>
                      <Zap className="h-4 w-4 mr-2" />
                      Ver Todas las Simulaciones
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={createNewSimulation}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nueva Simulación
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Simulations List (when not in a specific simulation) */}
      {showRecentList && !currentSimulation && recentSimulations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Simulaciones Recientes
            </CardTitle>
            <CardDescription className="text-sm">
              Accede rápidamente a tus simulaciones más utilizadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentSimulations.map((simulation) => (
              <div
                key={simulation.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigateToSimulation(simulation.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {simulation.name}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{simulation.budget_count} categorías</span>
                    <span>•</span>
                    <span>
                      {formatDate(new Date(simulation.updated_at), {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {simulation.budget_count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Configurada
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToAnalytics(simulation.id);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <BarChart3 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            {recentSimulations.length === maxRecentItems && (
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={navigateToSimulationList}
                  className="w-full text-xs"
                >
                  Ver todas las simulaciones
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
