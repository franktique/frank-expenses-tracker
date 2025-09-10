"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  TrendingUp,
  DollarSign,
  PiggyBank,
  Target,
  Download,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useBudget } from "@/context/budget-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FundFilter } from "@/components/fund-filter";
import { EstudioFilter } from "@/components/estudio-filter";
import { AgrupadorFilter } from "@/components/agrupador-filter";
import { formatCurrency } from "@/lib/utils";
import { Fund } from "@/types/funds";
import { 
  RemainderDashboardData, 
  RemainderCategoryItem,
  calculateBudgetUsagePercentage 
} from "@/types/remainder-dashboard";
import { Label } from "@/components/ui/label";

type EstudioData = {
  id: number;
  name: string;
  grouper_count: number;
  created_at: string;
  updated_at: string;
};

type GrouperData = {
  grouper_id: number;
  grouper_name: string;
  total_amount: number;
};

type SortField = 'category_name' | 'current_expenses' | 'remainder_planned_budget' | 'original_planned_budget' | 'progress';
type SortDirection = 'asc' | 'desc';

type SortConfig = {
  field: SortField;
  direction: SortDirection;
};

export function RemainderDashboard() {
  const {
    activePeriod: budgetActivePeriod,
    funds,
    isLoading: budgetLoading,
    error: budgetError,
    isDbInitialized,
    dbConnectionError,
  } = useBudget();

  const {
    activePeriod: authActivePeriod,
    isLoadingActivePeriod,
    activePeriodError,
  } = useAuth();

  const [dashboardData, setDashboardData] = useState<RemainderDashboardData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Filter states
  const [fundFilter, setFundFilter] = useState<Fund | null>(null);
  const [estudioFilter, setEstudioFilter] = useState<number | null>(null);
  const [agrupadorFilter, setAgrupadorFilter] = useState<number[]>([]);

  // Filter data states
  const [estudios, setEstudios] = useState<EstudioData[]>([]);
  const [groupers, setGroupers] = useState<GrouperData[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'category_name',
    direction: 'asc'
  });

  // Reset filters on mount
  useEffect(() => {
    setFundFilter(null);
    setEstudioFilter(null);
    setAgrupadorFilter([]);
  }, []);

  // Load filter data
  useEffect(() => {
    const loadFilterData = async () => {
      setIsLoadingFilters(true);
      try {
        // Load estudios
        const estudiosResponse = await fetch("/api/estudios");
        if (estudiosResponse.ok) {
          const estudiosData = await estudiosResponse.json();
          setEstudios(estudiosData);
        }

        // Load groupers if estudio is selected
        if (estudioFilter) {
          const groupersResponse = await fetch(`/api/estudios/${estudioFilter}/groupers`);
          if (groupersResponse.ok) {
            const groupersData = await groupersResponse.json();
            setGroupers(groupersData);
          }
        } else {
          setGroupers([]);
        }
      } catch (error) {
        console.error("Error loading filter data:", error);
      } finally {
        setIsLoadingFilters(false);
      }
    };

    loadFilterData();
  }, [estudioFilter]);

  // Reset agrupador filter when estudio changes
  useEffect(() => {
    setAgrupadorFilter([]);
  }, [estudioFilter]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchRemainderData = async () => {
      if (!isDbInitialized || dbConnectionError || budgetLoading) {
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);
      setDataError(null);

      try {
        const url = new URL("/api/dashboard/remainder", window.location.origin);
        
        if (fundFilter) {
          url.searchParams.set("fundId", fundFilter.id);
        }
        if (estudioFilter) {
          url.searchParams.set("estudioId", estudioFilter.toString());
        }
        if (agrupadorFilter.length > 0) {
          url.searchParams.set("agrupadorIds", agrupadorFilter.join(","));
        }

        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(`Failed to fetch remainder dashboard data: ${response.statusText}`);
        }

        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error("Error fetching remainder dashboard data:", error);
        setDataError(error instanceof Error ? error.message : "Unknown error occurred");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchRemainderData();
  }, [
    budgetLoading,
    isDbInitialized,
    dbConnectionError,
    fundFilter,
    estudioFilter,
    agrupadorFilter,
  ]);

  // Loading state
  if (budgetLoading || isLoadingData) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Error states
  if (dbConnectionError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Remanentes</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error de conexión a la base de datos</AlertTitle>
          <AlertDescription>
            No se pudo conectar a la base de datos. Por favor, verifica tu conexión.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (budgetError || activePeriodError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Remanentes</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {budgetError || activePeriodError}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Remanentes</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error al cargar datos</AlertTitle>
          <AlertDescription>{dataError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // No active period
  const activePeriod = budgetActivePeriod || authActivePeriod;
  if (!activePeriod || !dashboardData?.activePeriod) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Remanentes</h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No hay período activo</AlertTitle>
          <AlertDescription>
            Necesitas tener un período abierto para ver el dashboard de remanentes.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { categories: rawCategories, totals, appliedFilters } = dashboardData;

  // Sort categories based on current sort configuration
  const sortedCategories = [...rawCategories].sort((a, b) => {
    const { field, direction } = sortConfig;
    let aValue: number | string;
    let bValue: number | string;

    switch (field) {
      case 'category_name':
        aValue = a.category_name.toLowerCase();
        bValue = b.category_name.toLowerCase();
        break;
      case 'current_expenses':
        aValue = a.current_expenses;
        bValue = b.current_expenses;
        break;
      case 'remainder_planned_budget':
        aValue = a.remainder_planned_budget;
        bValue = b.remainder_planned_budget;
        break;
      case 'original_planned_budget':
        aValue = a.original_planned_budget;
        bValue = b.original_planned_budget;
        break;
      case 'progress':
        aValue = calculateBudgetUsagePercentage(a.original_planned_budget, a.current_expenses);
        bValue = calculateBudgetUsagePercentage(b.original_planned_budget, b.current_expenses);
        break;
      default:
        return 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const result = aValue.localeCompare(bValue);
      return direction === 'asc' ? result : -result;
    } else {
      const result = (aValue as number) - (bValue as number);
      return direction === 'asc' ? result : -result;
    }
  });

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    setSortConfig(prevConfig => {
      if (prevConfig.field === field) {
        // Toggle direction if same field
        return {
          field,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        // Set new field with ascending direction
        return {
          field,
          direction: 'asc'
        };
      }
    });
  };

  // Get sort icon for column header
  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ChevronsUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4" />
      : <ChevronDown className="h-4 w-4" />;
  };

  const categories = sortedCategories;

  // Export functionality
  const handleExport = () => {
    const csvContent = [
      ["Categoría", "Presupuesto Original", "Gastos Actuales", "Presupuesto Restante", "% Usado", "Fondo"].join(","),
      ...sortedCategories.map(cat => [
        `"${cat.category_name}"`,
        cat.original_planned_budget,
        cat.current_expenses,
        cat.remainder_planned_budget,
        calculateBudgetUsagePercentage(cat.original_planned_budget, cat.current_expenses).toFixed(1),
        `"${cat.fund_name || 'Sin fondo'}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `dashboard-remanentes-${dashboardData.activePeriod.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get filter display text
  const getFilterSummary = () => {
    const filters = [];
    if (appliedFilters.fundName) filters.push(`Fondo: ${appliedFilters.fundName}`);
    if (appliedFilters.estudioName) filters.push(`Estudio: ${appliedFilters.estudioName}`);
    if (appliedFilters.agrupadorNames && appliedFilters.agrupadorNames.length > 0) {
      filters.push(`Agrupadores: ${appliedFilters.agrupadorNames.join(", ")}`);
    }
    return filters.length > 0 ? ` • ${filters.join(" • ")}` : "";
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Remanentes</h1>
        <p className="text-muted-foreground">
          Categorías con presupuesto disponible • Período: {dashboardData.activePeriod.name}
          {getFilterSummary()}
        </p>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Filtra las categorías por fondo, estudio y agrupadores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Fondo</Label>
              <FundFilter
                selectedFund={fundFilter}
                onFundChange={setFundFilter}
                placeholder="Todos los fondos"
                includeAllFunds={true}
                allFundsLabel="Todos los fondos"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Estudio</Label>
              <EstudioFilter
                allEstudios={estudios}
                selectedEstudio={estudioFilter}
                onSelectionChange={setEstudioFilter}
                isLoading={isLoadingFilters}
              />
            </div>

            <div className="space-y-2">
              <Label>Agrupadores</Label>
              <AgrupadorFilter
                allGroupers={groupers}
                selectedGroupers={agrupadorFilter}
                onSelectionChange={setAgrupadorFilter}
                isLoading={isLoadingFilters}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.categoriesCount}</div>
            <p className="text-xs text-muted-foreground">Con presupuesto disponible</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Actuales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalCurrentExpenses)}</div>
            <p className="text-xs text-muted-foreground">Total gastado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presupuesto Restante</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalRemainderBudget)}</div>
            <p className="text-xs text-muted-foreground">Disponible para gastar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presupuesto Original</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalOriginalBudget)}</div>
            <p className="text-xs text-muted-foreground">Total planificado</p>
          </CardContent>
        </Card>
      </div>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Categorías con Presupuesto Disponible</CardTitle>
              <CardDescription>
                Solo se muestran categorías donde los gastos actuales están por debajo del presupuesto planificado
              </CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay categorías disponibles</h3>
              <p className="text-muted-foreground mb-4">
                No se encontraron categorías con presupuesto disponible para los filtros seleccionados.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setFundFilter(null);
                  setEstudioFilter(null);
                  setAgrupadorFilter([]);
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium text-left justify-start hover:bg-transparent"
                      onClick={() => handleSort('category_name')}
                    >
                      Categoría
                      <span className="ml-2">{getSortIcon('category_name')}</span>
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium hover:bg-transparent"
                      onClick={() => handleSort('current_expenses')}
                    >
                      Gastos Actuales
                      <span className="ml-2">{getSortIcon('current_expenses')}</span>
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium hover:bg-transparent"
                      onClick={() => handleSort('remainder_planned_budget')}
                    >
                      Presupuesto Restante
                      <span className="ml-2">{getSortIcon('remainder_planned_budget')}</span>
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium hover:bg-transparent"
                      onClick={() => handleSort('original_planned_budget')}
                    >
                      Presupuesto Original
                      <span className="ml-2">{getSortIcon('original_planned_budget')}</span>
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium hover:bg-transparent"
                      onClick={() => handleSort('progress')}
                    >
                      Progreso
                      <span className="ml-2">{getSortIcon('progress')}</span>
                    </Button>
                  </TableHead>
                  <TableHead>Fondo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => {
                  const usagePercentage = calculateBudgetUsagePercentage(
                    category.original_planned_budget,
                    category.current_expenses
                  );

                  return (
                    <TableRow key={category.category_id}>
                      <TableCell className="font-medium">
                        {category.category_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(category.current_expenses)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(category.remainder_planned_budget)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(category.original_planned_budget)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={usagePercentage} 
                            className="flex-1"
                          />
                          <span className="text-xs text-muted-foreground min-w-[3rem]">
                            {usagePercentage.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {category.fund_name ? (
                          <Badge variant="outline">{category.fund_name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin fondo</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}