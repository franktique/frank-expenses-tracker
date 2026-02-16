'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  CalendarRange,
  CreditCard,
  Database,
  DollarSign,
  ExternalLink,
  LineChart,
  PieChart,
  PiggyBank,
  PlusCircle,
  TrendingUp,
  Wallet,
  CreditCardIcon,
} from 'lucide-react';
import { ExpenseFormDialog } from '@/components/expense-form-dialog';
import { useAuth } from '@/lib/auth-context';
import { ActivePeriodErrorHandler } from '@/components/active-period-error-handler';
import { NoActivePeriodFallback } from '@/components/no-active-period-fallback';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBudget } from '@/context/budget-context';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  CategoryExpensesChart,
  CumulativeExpensesChart,
  DailyExpensesChart,
} from './dashboard-charts';
import { useRouter } from 'next/navigation';
import { FundFilter } from '@/components/fund-filter';
import { Fund } from '@/types/funds';
import { Label } from '@/components/ui/label';
import { CategoryExclusionFilter } from '@/components/category-exclusion-filter';
import {
  loadExcludedCategories,
  saveExcludedCategories,
  cleanupInvalidCategories,
} from '@/lib/excluded-categories-storage';
import {
  DashboardData,
  BudgetSummaryItem,
  calculateBudgetTotals,
  verifyBudgetTotals,
} from '@/types/dashboard';
import { getCategoryNameStyle } from '@/lib/category-styling';
import { ExportBudgetSummaryButton } from '@/components/export-budget-summary-button';

// DashboardData type is now imported from @/types/dashboard

export function DashboardView() {
  const {
    activePeriod: budgetActivePeriod,
    funds,
    isLoading,
    error,
    isDbInitialized,
    dbConnectionError,
    connectionErrorDetails,
  } = useBudget();

  const {
    activePeriod: authActivePeriod,
    isLoadingActivePeriod,
    activePeriodError,
    retryActivePeriodLoading,
  } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fundFilter, setFundFilter] = useState<Fund | null>(null);
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const router = useRouter();

  // State for quick add expense dialog
  const [isQuickAddExpenseOpen, setIsQuickAddExpenseOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Sorting state for default_day column
  const [sortBy, setSortBy] = useState<'default_day' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Memoized sorted and filtered budget summary
  const sortedBudgetSummary = useMemo(() => {
    if (!dashboardData?.budgetSummary) return [];

    const filtered = dashboardData.budgetSummary.filter(
      (item) => !excludedCategories.includes(item.category_id)
    );

    if (!sortBy) return filtered;

    return [...filtered].sort((a, b) => {
      const aValue = a.default_day ?? 1;
      const bValue = b.default_day ?? 1;

      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  }, [dashboardData?.budgetSummary, excludedCategories, sortBy, sortDirection]);

  // Memoized filtered budget summary (unsorted) for calculations
  const filteredBudgetSummary = useMemo(() => {
    if (!dashboardData?.budgetSummary) return [];

    return dashboardData.budgetSummary.filter(
      (item) => !excludedCategories.includes(item.category_id)
    );
  }, [dashboardData?.budgetSummary, excludedCategories]);

  // Reset fund filter to "All Funds" on page refresh
  useEffect(() => {
    setFundFilter(null);
  }, []);

  // Load excluded categories from localStorage on mount
  useEffect(() => {
    const excluded = loadExcludedCategories();
    setExcludedCategories(excluded);
  }, []);

  // Cleanup invalid category IDs when budgetSummary changes
  useEffect(() => {
    if (
      dashboardData?.budgetSummary &&
      dashboardData.budgetSummary.length > 0
    ) {
      const validCategoryIds = dashboardData.budgetSummary.map(
        (item) => item.category_id
      );
      cleanupInvalidCategories(validCategoryIds);

      // Re-load excluded categories to reflect cleanup
      const cleanedExcluded = loadExcludedCategories();
      if (cleanedExcluded.length !== excludedCategories.length) {
        setExcludedCategories(cleanedExcluded);
      }
    }
  }, [dashboardData?.budgetSummary, excludedCategories.length]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isDbInitialized || dbConnectionError) {
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);
      try {
        // Build URL with fund filter parameter
        const url = new URL('/api/dashboard', window.location.origin);
        if (fundFilter) {
          url.searchParams.set('fundId', fundFilter.id);
        }

        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const data = await response.json();

        // Debug log para identificar problemas con los valores
        console.log('Dashboard data received:', {
          totalIncome: data.totalIncome,
          totalIncome_type: typeof data.totalIncome,
          totalExpenses: data.totalExpenses,
          totalExpenses_type: typeof data.totalExpenses,
          activePeriodName: data.activePeriod?.name,
        });

        // Asegurar que los valores son números válidos
        if (
          data.totalIncome !== undefined &&
          (isNaN(data.totalIncome) || data.totalIncome === null)
        ) {
          data.totalIncome = 0;
        }

        if (
          data.totalExpenses !== undefined &&
          (isNaN(data.totalExpenses) || data.totalExpenses === null)
        ) {
          data.totalExpenses = 0;
        }

        // Asegurar que los valores en budgetSummary también son números válidos
        if (data.budgetSummary && Array.isArray(data.budgetSummary)) {
          data.budgetSummary = data.budgetSummary.map(
            (item: any): BudgetSummaryItem => ({
              category_id: item.category_id || '',
              category_name: item.category_name || '',
              default_day: item.default_day ?? null,
              credit_budget: isNaN(Number(item.credit_budget))
                ? 0
                : Number(item.credit_budget),
              cash_debit_budget: isNaN(Number(item.cash_debit_budget))
                ? 0
                : Number(item.cash_debit_budget),
              expected_amount: isNaN(Number(item.expected_amount))
                ? 0
                : Number(item.expected_amount),
              total_amount: isNaN(Number(item.total_amount))
                ? 0
                : Number(item.total_amount),
              confirmed_amount: isNaN(Number(item.confirmed_amount))
                ? 0
                : Number(item.confirmed_amount),
              pending_amount: isNaN(Number(item.pending_amount))
                ? 0
                : Number(item.pending_amount),
              credit_amount: isNaN(Number(item.credit_amount))
                ? 0
                : Number(item.credit_amount),
              debit_amount: isNaN(Number(item.debit_amount))
                ? 0
                : Number(item.debit_amount),
              cash_amount: isNaN(Number(item.cash_amount))
                ? 0
                : Number(item.cash_amount),
              remaining: isNaN(Number(item.remaining))
                ? 0
                : Number(item.remaining),
            })
          );

          // Verify budget totals consistency - Requirement 2.3
          const verification = verifyBudgetTotals(data.budgetSummary);
          if (!verification.isValid) {
            console.warn(
              'Budget totals verification failed for categories:',
              verification.discrepancies
            );
          }
        }

        setDashboardData(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (!isLoading) {
      fetchDashboardData();
    }
  }, [
    isLoading,
    budgetActivePeriod,
    authActivePeriod,
    isDbInitialized,
    dbConnectionError,
    fundFilter,
    refreshTrigger,
  ]);

  if (isLoading || isLoadingData) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (dbConnectionError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error de conexión a la base de datos</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              No se pudo conectar a la base de datos. Por favor, verifica tu
              conexión a la base de datos y asegúrate de que las credenciales
              sean correctas.
            </p>
            {connectionErrorDetails && (
              <div className="overflow-auto rounded bg-destructive/10 p-2 text-xs">
                <p className="whitespace-pre-wrap break-all font-mono">
                  {connectionErrorDetails}
                </p>
              </div>
            )}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Solución de problemas</CardTitle>
            <CardDescription>
              Pasos para resolver problemas de conexión a la base de datos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium">
                1. Verifica las variables de entorno
              </h3>
              <p className="text-sm text-muted-foreground">
                Asegúrate de que la variable de entorno DATABASE_URL esté
                correctamente configurada en tu proyecto de Vercel.
              </p>
            </div>
            <div>
              <h3 className="font-medium">2. Verifica el estado de Neon</h3>
              <p className="text-sm text-muted-foreground">
                Verifica que tu base de datos Neon esté activa y funcionando
                correctamente.
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <Button onClick={() => router.push('/setup')} className="w-full">
                <Database className="mr-2 h-4 w-4" />
                Ir a Configuración
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <a
                  href="https://console.neon.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ir al panel de Neon
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isDbInitialized) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center">
        <Database className="mb-4 h-16 w-16 text-muted-foreground" />
        <h2 className="mb-2 text-2xl font-bold">
          Base de datos no configurada
        </h2>
        <p className="mb-4 max-w-md text-muted-foreground">
          Para comenzar a usar la aplicación, primero debes configurar la base
          de datos.
        </p>
        <Button onClick={() => router.push('/setup')}>
          Ir a Configuración
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center">
        <h2 className="mb-2 text-2xl font-bold">Error</h2>
        <p className="mb-4 max-w-md text-muted-foreground">{error}</p>
        <Button onClick={() => router.push('/setup')}>
          Ir a Configuración
        </Button>
      </div>
    );
  }

  // Handle active period error from auth context
  if (activePeriodError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <ActivePeriodErrorHandler
          error={activePeriodError}
          onRetry={retryActivePeriodLoading}
          isRetrying={isLoadingActivePeriod}
          showFullCard={true}
        />
      </div>
    );
  }

  // Handle no active period scenario
  if (!budgetActivePeriod && !authActivePeriod && !isLoadingActivePeriod) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <NoActivePeriodFallback />
      </div>
    );
  }

  // Use the active period from either context (prefer budget context as it's more up-to-date)
  const activePeriod = budgetActivePeriod || authActivePeriod;

  if (!activePeriod || !dashboardData?.activePeriod) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <NoActivePeriodFallback showCompact={true} />
      </div>
    );
  }

  const { totalIncome, totalExpenses, budgetSummary } = dashboardData;

  // Handle excluded categories change
  const handleExcludedCategoriesChange = (categoryIds: string[]) => {
    setExcludedCategories(categoryIds);
    saveExcludedCategories(categoryIds);
  };

  // Handle default_day column sort
  const handleDefaultDaySort = () => {
    if (sortBy !== 'default_day') {
      setSortBy('default_day');
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortBy(null); // Clear sorting
    }
  };

  // Get available categories for the filter
  const availableCategories = budgetSummary.map((item) => ({
    id: item.category_id,
    name: item.category_name,
  }));

  // Calculate total credit card purchases (using filtered summary to respect excluded categories)
  const totalCreditCardPurchases = filteredBudgetSummary.reduce(
    (sum, item) => sum + item.credit_amount,
    0
  );

  // Calculate total cash/debit expenses (actual)
  const totalCashDebitExpenses = filteredBudgetSummary.reduce(
    (sum, item) => sum + item.debit_amount + item.cash_amount,
    0
  );

  // Calculate remainder for cash/debit (budget - actual)
  const remainderCashDebit = filteredBudgetSummary.reduce(
    (sum, item) =>
      sum + item.cash_debit_budget - (item.debit_amount + item.cash_amount),
    0
  );

  // Calculate remainder for credit (budget - actual)
  const remainderCredit = filteredBudgetSummary.reduce(
    (sum, item) => sum + item.credit_budget - item.credit_amount,
    0
  );

  return (
    <div className="w-full max-w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Periodo activo: {dashboardData.activePeriod.name}
          {fundFilter && ` • Fondo: ${fundFilter.name}`}
          {excludedCategories.length > 0 &&
            ` • ${excludedCategories.length} ${
              excludedCategories.length === 1
                ? 'categoría excluida'
                : 'categorías excluidas'
            }`}
        </p>
      </div>

      {/* Fund Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filtro de Fondo</CardTitle>
          <CardDescription>
            Filtra los datos del dashboard por fondo específico o muestra datos
            combinados de todos los fondos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="dashboard-fund-filter">Fondo:</Label>
            <FundFilter
              selectedFund={fundFilter}
              onFundChange={setFundFilter}
              placeholder="Todos los fondos"
              includeAllFunds={true}
              allFundsLabel="Todos los fondos"
              className="w-[300px]"
            />
            <p className="text-sm text-muted-foreground">
              {fundFilter
                ? `Mostrando datos del fondo "${fundFilter.name}"`
                : 'Mostrando datos combinados de todos los fondos'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary" className="mt-6 w-full max-w-full">
        <TabsList className="grid w-full max-w-full grid-cols-4">
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="daily">Gastos Diarios</TabsTrigger>
          <TabsTrigger value="cumulative">Gastos Acumulados</TabsTrigger>
          <TabsTrigger value="categories">Por Categoría</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          {/* Row 1: Main Financial Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Ingresos Totales
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalIncome)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Gastos Totales
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalExpenses)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Balance</CardTitle>
                <PiggyBank className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalIncome - totalExpenses)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalIncome > totalExpenses ? 'Superávit' : 'Déficit'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Categorías
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{budgetSummary.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Payment Method Breakdown */}
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Tarjeta Crédito
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalCreditCardPurchases)}
                </div>
                <p className="text-xs text-muted-foreground">Periodo actual</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Efectivo
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalCashDebitExpenses)}
                </div>
                <p className="text-xs text-muted-foreground">Periodo actual</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Remanente Efectivo
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    remainderCashDebit >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(remainderCashDebit)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Presupuesto disponible
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Remanente Crédito
                </CardTitle>
                <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    remainderCredit >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(remainderCredit)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Presupuesto disponible
                </p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => router.push('/dashboard/groupers')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Dashboard Agrupadores
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push('/dashboard/groupers');
                  }}
                >
                  Ver gráficos
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card
              className="cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => router.push('/dashboard/remainder')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Dashboard Remanentes
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push('/dashboard/remainder');
                  }}
                >
                  Ver remanentes
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Categorías con presupuesto disponible
                </p>
              </CardContent>
            </Card>

            <Card className="flex items-center justify-center border-dashed">
              <CardContent className="py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Más dashboards próximamente
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Resumen de Presupuesto
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Gastos por categoría en el periodo actual
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <CategoryExclusionFilter
                    categories={availableCategories}
                    excludedCategories={excludedCategories}
                    onExclusionChange={handleExcludedCategoriesChange}
                  />
                  <ExportBudgetSummaryButton
                    budgetSummary={budgetSummary}
                    totalIncome={totalIncome}
                    fundFilter={fundFilter}
                    periodName={dashboardData.activePeriod.name}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="max-h-[60vh]">
                <TableHeader className="sticky top-0 z-10 bg-muted">
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead
                      className="cursor-pointer text-center transition-colors hover:bg-accent"
                      onClick={handleDefaultDaySort}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Día por Defecto
                        {sortBy === 'default_day' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">
                      Presupuesto Crédito
                    </TableHead>
                    <TableHead className="text-right">
                      Presupuesto Efectivo
                    </TableHead>
                    <TableHead className="text-right">Gasto Total</TableHead>
                    <TableHead className="text-right">
                      Tarjeta Crédito
                    </TableHead>
                    <TableHead className="text-right">Tarjeta Débito</TableHead>
                    <TableHead className="text-right">Efectivo</TableHead>
                    <TableHead className="text-right">Restante</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Initialize running balance with total income
                    let runningBalance = totalIncome;

                    // Return the mapped array
                    return sortedBudgetSummary.map((item) => {
                      // Calculate the effective expense for this row (debit + cash only)
                      const effectiveExpense =
                        item.debit_amount + item.cash_amount;

                      // Update the running balance by subtracting this row's expenses
                      runningBalance -= effectiveExpense;

                      // Build className string
                      const categoryNameStyle = getCategoryNameStyle(item);
                      let backgroundClass = '';

                      if (item.pending_amount > 0) {
                        backgroundClass = 'bg-purple-200 dark:bg-purple-900';
                      } else if (item.total_amount === 0) {
                        backgroundClass = 'bg-white dark:bg-gray-800';
                      } else if (item.remaining <= 0) {
                        if (
                          item.remaining < 0 &&
                          Math.abs(item.remaining) >= item.expected_amount * 0.3
                        ) {
                          backgroundClass = 'bg-red-100 dark:bg-red-950/50';
                        } else if (
                          item.remaining < 0 &&
                          Math.abs(item.remaining) > item.expected_amount * 0.1
                        ) {
                          backgroundClass =
                            'bg-yellow-100 dark:bg-yellow-950/50';
                        } else {
                          backgroundClass = 'bg-green-100 dark:bg-green-950/50';
                        }
                      }

                      const fullClassName = `font-medium ${categoryNameStyle} ${backgroundClass}`;

                      // Debug logging for Ayuno and Diezmo
                      if (
                        item.category_name === 'Ayuno' ||
                        item.category_name === 'Diezmo'
                      ) {
                        console.log(
                          `[DEBUG ${new Date().toISOString()}] ${item.category_name}:`,
                          {
                            pending_amount: item.pending_amount,
                            pending_amount_type: typeof item.pending_amount,
                            total_amount: item.total_amount,
                            remaining: item.remaining,
                            condition_check: item.pending_amount > 0,
                            backgroundClass: backgroundClass,
                            fullClassName: fullClassName,
                          }
                        );
                      }

                      return (
                        <TableRow key={item.category_id} className="group">
                          <TableCell className={fullClassName}>
                            <div className="flex items-center gap-2">
                              <span>{item.category_name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCategoryId(item.category_id);
                                  setIsQuickAddExpenseOpen(true);
                                }}
                                title={`Agregar gasto para ${item.category_name}`}
                              >
                                <PlusCircle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.default_day ?? 1}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.credit_budget)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.cash_debit_budget)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.total_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.credit_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.debit_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.cash_amount)}
                          </TableCell>
                          <TableCell
                            className={`text-right ${
                              item.remaining < 0 ? 'text-destructive' : ''
                            }`}
                          >
                            {formatCurrency(item.remaining)}
                          </TableCell>
                          <TableCell
                            className={`text-right ${
                              runningBalance < 0 ? 'text-destructive' : ''
                            }`}
                          >
                            {formatCurrency(runningBalance)}
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}

                  {/* Totals Row */}
                  {sortedBudgetSummary.length > 0 && (
                    <>
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell className="font-bold">TOTAL</TableCell>
                        <TableCell className="text-center"></TableCell>
                        <TableCell className="text-right">
                          {/* Sum of all credit budgets - Requirement 2.1 */}
                          {(() => {
                            const totals =
                              calculateBudgetTotals(sortedBudgetSummary);
                            return formatCurrency(totals.totalCreditBudget);
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          {/* Sum of all cash/debit budgets - Requirement 2.2 */}
                          {(() => {
                            const totals =
                              calculateBudgetTotals(sortedBudgetSummary);
                            return formatCurrency(totals.totalCashDebitBudget);
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            // Calculate totals using utility function - Requirement 2.3
                            const totals =
                              calculateBudgetTotals(sortedBudgetSummary);

                            // Verify that credit + cash/debit budgets equal total budget
                            const splitBudgetSum =
                              totals.totalCreditBudget +
                              totals.totalCashDebitBudget;
                            if (
                              Math.abs(
                                splitBudgetSum - totals.totalExpectedAmount
                              ) > 0.01
                            ) {
                              console.warn(
                                'Budget totals verification failed:',
                                {
                                  creditBudget: totals.totalCreditBudget,
                                  cashDebitBudget: totals.totalCashDebitBudget,
                                  splitSum: splitBudgetSum,
                                  expectedTotal: totals.totalExpectedAmount,
                                  difference:
                                    splitBudgetSum - totals.totalExpectedAmount,
                                }
                              );
                            }

                            return formatCurrency(totals.totalActualAmount);
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            const totals =
                              calculateBudgetTotals(sortedBudgetSummary);
                            return formatCurrency(totals.totalCreditAmount);
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            const totals =
                              calculateBudgetTotals(sortedBudgetSummary);
                            return formatCurrency(totals.totalDebitAmount);
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            const totals =
                              calculateBudgetTotals(sortedBudgetSummary);
                            return formatCurrency(totals.totalCashAmount);
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            const totals =
                              calculateBudgetTotals(sortedBudgetSummary);
                            return formatCurrency(totals.totalRemaining);
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(
                            totalIncome -
                              sortedBudgetSummary.reduce(
                                (sum, item) =>
                                  sum + (item.debit_amount + item.cash_amount),
                                0
                              )
                          )}
                        </TableCell>
                      </TableRow>
                      {/* Column Headers */}
                      <TableRow className="bg-muted/20">
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">
                          Presupuesto Crédito
                        </TableHead>
                        <TableHead className="text-right">
                          Presupuesto Efectivo
                        </TableHead>
                        <TableHead className="text-right">
                          Gasto Total
                        </TableHead>
                        <TableHead className="text-right">
                          Tarjeta Crédito
                        </TableHead>
                        <TableHead className="text-right">
                          Tarjeta Débito
                        </TableHead>
                        <TableHead className="text-right">Efectivo</TableHead>
                        <TableHead className="text-right">Restante</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </>
                  )}

                  {filteredBudgetSummary.length === 0 &&
                    budgetSummary.length > 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="py-4 text-center text-muted-foreground"
                        >
                          Todas las categorías están excluidas. Selecciona
                          algunas categorías para mostrar.
                        </TableCell>
                      </TableRow>
                    )}

                  {budgetSummary.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="py-4 text-center text-muted-foreground"
                      >
                        No hay datos para mostrar. Agrega categorías y
                        presupuestos.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="daily"
          className="mt-6 w-full max-w-full overflow-x-hidden p-0"
        >
          <div className="w-full max-w-full p-0">
            <DailyExpensesChart periodId={dashboardData.activePeriod.id} />
          </div>
        </TabsContent>

        <TabsContent
          value="cumulative"
          className="mt-6 w-full max-w-full overflow-x-hidden p-0"
        >
          <div className="w-full max-w-full p-0">
            <CumulativeExpensesChart periodId={dashboardData.activePeriod.id} />
          </div>
        </TabsContent>

        <TabsContent
          value="categories"
          className="mt-6 w-full max-w-full overflow-x-hidden p-0"
        >
          <div className="w-full max-w-full p-0">
            <CategoryExpensesChart periodId={dashboardData.activePeriod.id} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Add Expense Dialog */}
      <ExpenseFormDialog
        open={isQuickAddExpenseOpen}
        onOpenChange={(open) => {
          setIsQuickAddExpenseOpen(open);
          if (!open) {
            setSelectedCategoryId(null);
          }
        }}
        preSelectedCategoryId={selectedCategoryId || undefined}
        currentFundFilter={fundFilter}
        onSuccess={() => {
          // Refresh dashboard data after expense is added
          // Increment refreshTrigger to trigger useEffect refetch
          setRefreshTrigger((prev) => prev + 1);
        }}
      />
    </div>
  );
}
