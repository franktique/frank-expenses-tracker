"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Filter,
  BarChart3,
  TrendingUp,
  Calendar,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBudget } from "@/context/budget-context-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AgrupadorFilter } from "@/components/agrupador-filter";
import { BudgetToggle } from "@/components/budget-toggle";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
  LineChart,
  Line,
  Legend,
} from "recharts";

type GrouperData = {
  grouper_id: number;
  grouper_name: string;
  total_amount: number;
  budget_amount?: number;
};

type CategoryData = {
  category_id: string;
  category_name: string;
  total_amount: number;
  budget_amount?: number;
};

type PeriodComparisonData = {
  period_id: number;
  period_name: string;
  period_month: number;
  period_year: number;
  grouper_data: {
    grouper_id: number;
    grouper_name: string;
    total_amount: number;
    budget_amount?: number;
  }[];
}[];

type TransformedPeriodData = {
  period_name: string;
  [key: `grouper_${number}`]: number;
}[];

type WeeklyCumulativeData = {
  week_start: string;
  week_end: string;
  week_label: string;
  grouper_data: {
    grouper_id: number;
    grouper_name: string;
    cumulative_amount: number;
    budget_amount?: number;
  }[];
}[];

type TransformedWeeklyData = {
  week_label: string;
  [key: `grouper_${number}`]: number;
}[];

export default function GroupersChartPage() {
  const router = useRouter();
  const { activePeriod } = useBudget();

  // Tab state management
  const [activeTab, setActiveTab] = useState<
    "current" | "period-comparison" | "weekly-cumulative"
  >("current");

  // Filter state management
  const [selectedGroupers, setSelectedGroupers] = useState<number[]>([]);
  const [showBudgets, setShowBudgets] = useState<boolean>(false);
  const [allGroupers, setAllGroupers] = useState<GrouperData[]>([]);

  // Existing state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [grouperData, setGrouperData] = useState<GrouperData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("all");
  const [selectedGrouper, setSelectedGrouper] = useState<GrouperData | null>(
    null
  );
  const [showCategoryChart, setShowCategoryChart] = useState<boolean>(false);
  const [maxGrouperAmount, setMaxGrouperAmount] = useState<number>(0);
  const [maxCategoryAmount, setMaxCategoryAmount] = useState<number>(0);

  // Period comparison state
  const [periodComparisonData, setPeriodComparisonData] =
    useState<PeriodComparisonData>([]);
  const [isLoadingPeriodComparison, setIsLoadingPeriodComparison] =
    useState<boolean>(false);
  const [periodComparisonError, setPeriodComparisonError] = useState<
    string | null
  >(null);

  // Weekly cumulative state
  const [weeklyCumulativeData, setWeeklyCumulativeData] =
    useState<WeeklyCumulativeData>([]);
  const [isLoadingWeeklyCumulative, setIsLoadingWeeklyCumulative] =
    useState<boolean>(false);
  const [weeklyCumulativeError, setWeeklyCumulativeError] = useState<
    string | null
  >(null);

  // Budget data state
  const [budgetData, setBudgetData] = useState<{
    [key: string]: { [grouperId: number]: number };
  }>({});
  const [isLoadingBudgets, setIsLoadingBudgets] = useState<boolean>(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  // Filter loading state and error handling
  const [isLoadingFilters, setIsLoadingFilters] = useState<boolean>(false);
  const [filterError, setFilterError] = useState<string | null>(null);

  // General error state for main data loading
  const [mainDataError, setMainDataError] = useState<string | null>(null);

  // Track last payment method used for each tab to ensure proper data refresh
  const [lastPaymentMethodUsed, setLastPaymentMethodUsed] = useState<{
    current: string;
    periodComparison: string;
    weeklyCumulative: string;
  }>({
    current: "all",
    periodComparison: "all",
    weeklyCumulative: "all",
  });

  // Track filter state for each tab to ensure proper synchronization
  const [lastFilterState, setLastFilterState] = useState<{
    current: { selectedGroupers: number[]; showBudgets: boolean };
    periodComparison: { selectedGroupers: number[]; showBudgets: boolean };
    weeklyCumulative: { selectedGroupers: number[]; showBudgets: boolean };
  }>({
    current: { selectedGroupers: [], showBudgets: false },
    periodComparison: { selectedGroupers: [], showBudgets: false },
    weeklyCumulative: { selectedGroupers: [], showBudgets: false },
  });

  // Define colors for the charts
  const COLORS = [
    "#8884d8",
    "#83a6ed",
    "#8dd1e1",
    "#82ca9d",
    "#a4de6c",
    "#d0ed57",
    "#ffc658",
    "#ff8042",
    "#ff6361",
    "#bc5090",
  ];

  // Fetch all groupers for filter dropdown with retry functionality
  const fetchAllGroupers = async () => {
    try {
      setIsLoadingFilters(true);
      setFilterError(null);

      const response = await fetch(
        `/api/dashboard/groupers?periodId=${activePeriod?.id}&paymentMethod=all`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      const sortedData = data.sort((a: GrouperData, b: GrouperData) =>
        a.grouper_name.localeCompare(b.grouper_name)
      );
      setAllGroupers(sortedData);

      // Initialize selected groupers to all groupers if none selected
      if (selectedGroupers.length === 0) {
        const allGrouperIds = sortedData.map((g: GrouperData) => g.grouper_id);
        setSelectedGroupers(allGrouperIds);

        // Initialize filter state tracking for all tabs
        setLastFilterState({
          current: {
            selectedGroupers: [...allGrouperIds],
            showBudgets: false,
          },
          periodComparison: {
            selectedGroupers: [...allGrouperIds],
            showBudgets: false,
          },
          weeklyCumulative: {
            selectedGroupers: [...allGrouperIds],
            showBudgets: false,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching all groupers:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al cargar los filtros de agrupadores";
      setFilterError(errorMessage);

      toast({
        title: "Error al cargar filtros",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingFilters(false);
    }
  };

  // Retry function for filter loading
  const retryFilterLoad = () => {
    if (activePeriod) {
      fetchAllGroupers();
    }
  };

  useEffect(() => {
    if (!activePeriod) return;
    fetchAllGroupers();
  }, [activePeriod]);

  // Fetch groupers data
  useEffect(() => {
    if (!activePeriod || activeTab !== "current") return;

    const fetchGrouperData = async () => {
      try {
        setIsLoading(true);

        // Build query parameters
        const params = new URLSearchParams({
          periodId: activePeriod.id.toString(),
          paymentMethod: paymentMethod,
        });

        // Add grouper filtering if specific groupers are selected
        if (
          selectedGroupers.length > 0 &&
          selectedGroupers.length < allGroupers.length
        ) {
          params.append("grouperIds", selectedGroupers.join(","));
        }

        // Add budget parameter if budget display is enabled
        if (showBudgets) {
          params.append("includeBudgets", "true");
        }

        const response = await fetch(
          `/api/dashboard/groupers?${params.toString()}`
        );

        if (response.ok) {
          const data = await response.json();
          // Process data and ensure budget_amount is properly handled
          const processedData = data.map((item: GrouperData) => ({
            ...item,
            // Ensure budget_amount is a number or undefined, handle null/undefined cases
            budget_amount: showBudgets
              ? item.budget_amount != null
                ? parseFloat(item.budget_amount.toString()) || 0
                : 0
              : undefined,
          }));

          const sortedData = processedData
            .filter((item: GrouperData) => item.total_amount > 0)
            .sort(
              (a: GrouperData, b: GrouperData) =>
                b.total_amount - a.total_amount
            );
          setGrouperData(sortedData);

          // Update tracking for current tab
          setLastPaymentMethodUsed((prev) => ({
            ...prev,
            current: paymentMethod,
          }));

          // Update filter state tracking for current tab
          setLastFilterState((prev) => ({
            ...prev,
            current: { selectedGroupers: [...selectedGroupers], showBudgets },
          }));

          // Calculate max amount for chart scaling, considering both expense and budget amounts
          if (sortedData.length > 0) {
            const maxExpenseAmount = Math.max(
              ...sortedData.map((item: GrouperData) => item.total_amount)
            );
            const maxBudgetAmount = showBudgets
              ? Math.max(
                  ...sortedData.map(
                    (item: GrouperData) => item.budget_amount || 0
                  )
                )
              : 0;
            const maxAmount = Math.max(maxExpenseAmount, maxBudgetAmount);
            setMaxGrouperAmount(maxAmount * 1.1); // Add 10% for visualization margin
          }
        } else {
          const error = await response.json().catch(() => ({}));
          const errorMessage =
            error.error || `HTTP ${response.status}: Error al cargar datos`;
          setMainDataError(errorMessage);

          toast({
            title: "Error al cargar datos de agrupadores",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching grouper data:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error de conexión al cargar estadísticas";
        setMainDataError(errorMessage);

        toast({
          title: "Error de conexión",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchGrouperData();
  }, [
    activePeriod,
    paymentMethod,
    activeTab,
    selectedGroupers,
    showBudgets,
    allGroupers.length,
  ]);

  // Retry function for main data loading
  const retryMainDataLoad = () => {
    if (activePeriod && activeTab === "current") {
      setMainDataError(null);
      // The useEffect will trigger automatically due to dependency changes
    }
  };

  // Reset category view when agrupador filters change and selected grouper is no longer in filter
  useEffect(() => {
    if (
      selectedGrouper &&
      selectedGroupers.length > 0 &&
      !selectedGroupers.includes(selectedGrouper.grouper_id)
    ) {
      // If the selected grouper is not in the current filter, reset the selection
      setSelectedGrouper(null);
      setShowCategoryChart(false);
    }
  }, [selectedGroupers, selectedGrouper]);

  // Fetch aggregated category data for all selected groupers when no specific grouper is selected
  useEffect(() => {
    if (!activePeriod || activeTab !== "current" || selectedGrouper) return;

    // Only fetch if we have selected groupers and showCategoryChart is true
    if (selectedGroupers.length === 0 || !showCategoryChart) {
      setCategoryData([]);
      return;
    }

    const fetchAggregatedCategoryData = async () => {
      try {
        console.log(
          "--------Fetching aggregated category data for groupers:",
          selectedGroupers
        );

        // Fetch category data for each selected grouper and aggregate
        const categoryPromises = selectedGroupers.map(async (grouperId) => {
          const params = new URLSearchParams({
            periodId: activePeriod.id.toString(),
            paymentMethod: paymentMethod,
          });

          if (showBudgets) {
            params.append("includeBudgets", "true");
          }

          const response = await fetch(
            `/api/dashboard/groupers/${grouperId}/categories?${params.toString()}`
          );

          if (response.ok) {
            const data = await response.json();
            console.log(
              `--------Category data for grouper ${grouperId}:`,
              data
            );
            return data.map((item: CategoryData) => ({
              ...item,
              budget_amount: showBudgets
                ? item.budget_amount != null
                  ? parseFloat(item.budget_amount.toString()) || 0
                  : 0
                : undefined,
            }));
          } else {
            console.error(
              `--------Failed to fetch category data for grouper ${grouperId}:`,
              response.status
            );
          }
          return [];
        });

        const allCategoryData = await Promise.all(categoryPromises);

        // Aggregate categories by category_id
        const categoryMap = new Map<string, CategoryData>();

        allCategoryData.flat().forEach((category) => {
          // Ensure amounts are numbers
          const totalAmount = parseFloat(category.total_amount.toString()) || 0;
          const budgetAmount =
            showBudgets && category.budget_amount !== undefined
              ? parseFloat(category.budget_amount.toString()) || 0
              : undefined;

          const existingCategory = categoryMap.get(category.category_id);
          if (existingCategory) {
            // Aggregate amounts
            existingCategory.total_amount += totalAmount;
            if (showBudgets && budgetAmount !== undefined) {
              existingCategory.budget_amount =
                (existingCategory.budget_amount || 0) + budgetAmount;
            }
          } else {
            categoryMap.set(category.category_id, {
              ...category,
              total_amount: totalAmount,
              budget_amount: budgetAmount,
            });
          }
        });

        const aggregatedData = Array.from(categoryMap.values())
          .filter((item: CategoryData) => item.total_amount > 0)
          .sort(
            (a: CategoryData, b: CategoryData) =>
              b.total_amount - a.total_amount
          );

        console.log("--------Aggregated category data:", aggregatedData);
        setCategoryData(aggregatedData);
        // Don't automatically set showCategoryChart here, let the button control it

        // Calculate max amount for chart scaling
        if (aggregatedData.length > 0) {
          const maxExpenseAmount = Math.max(
            ...aggregatedData.map((item: CategoryData) => item.total_amount)
          );
          const maxBudgetAmount = showBudgets
            ? Math.max(
                ...aggregatedData.map(
                  (item: CategoryData) => item.budget_amount || 0
                )
              )
            : 0;
          const maxAmount = Math.max(maxExpenseAmount, maxBudgetAmount);
          setMaxCategoryAmount(maxAmount * 1.1);
        }
      } catch (error) {
        console.error("Error fetching aggregated category data:", error);
        toast({
          title: "Error fetching category data",
          description: "Failed to load aggregated category statistics",
          variant: "destructive",
        });
      }
    };

    fetchAggregatedCategoryData();
  }, [
    activePeriod,
    paymentMethod,
    activeTab,
    showBudgets,
    selectedGroupers,
    allGroupers.length,
    selectedGrouper,
    showCategoryChart,
  ]);

  // Fetch category data when a grouper is selected
  useEffect(() => {
    if (!activePeriod || !selectedGrouper || activeTab !== "current") return;

    // Ensure the selected grouper is within the filtered groupers
    if (
      selectedGroupers.length > 0 &&
      !selectedGroupers.includes(selectedGrouper.grouper_id)
    ) {
      // If the selected grouper is not in the current filter, reset the selection
      setSelectedGrouper(null);
      setShowCategoryChart(false);
      return;
    }

    const fetchCategoryData = async () => {
      try {
        // Build query parameters
        const params = new URLSearchParams({
          periodId: activePeriod.id.toString(),
          paymentMethod: paymentMethod,
        });

        // Add budget parameter if budget display is enabled
        if (showBudgets) {
          params.append("includeBudgets", "true");
        }

        const response = await fetch(
          `/api/dashboard/groupers/${
            selectedGrouper.grouper_id
          }/categories?${params.toString()}`
        );

        if (response.ok) {
          const data = await response.json();

          // Process category data and ensure both total_amount and budget_amount are properly handled
          const processedData = data.map((item: CategoryData) => ({
            ...item,
            // Ensure total_amount is a number
            total_amount: parseFloat(item.total_amount.toString()) || 0,
            // Ensure budget_amount is a number or undefined, handle null/undefined cases
            budget_amount: showBudgets
              ? item.budget_amount != null
                ? parseFloat(item.budget_amount.toString()) || 0
                : 0
              : undefined,
          }));

          const sortedData = processedData
            .filter((item: CategoryData) => item.total_amount > 0)
            .sort(
              (a: CategoryData, b: CategoryData) =>
                b.total_amount - a.total_amount
            );

          setCategoryData(sortedData);
          setShowCategoryChart(true);

          // Calculate max amount for chart scaling, considering both expense and budget amounts
          if (sortedData.length > 0) {
            const maxExpenseAmount = Math.max(
              ...sortedData.map((item: CategoryData) => item.total_amount)
            );
            const maxBudgetAmount = showBudgets
              ? Math.max(
                  ...sortedData.map(
                    (item: CategoryData) => item.budget_amount || 0
                  )
                )
              : 0;
            const maxAmount = Math.max(maxExpenseAmount, maxBudgetAmount);
            setMaxCategoryAmount(maxAmount * 1.1); // Add 10% for visualization margin
          }
        } else {
          const error = await response.json();
          toast({
            title: "Error fetching category data",
            description: error.error || "An unknown error occurred",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching category data:", error);
        toast({
          title: "Error fetching category data",
          description: "Failed to load category statistics",
          variant: "destructive",
        });
      }
    };

    fetchCategoryData();
  }, [
    activePeriod,
    selectedGrouper,
    paymentMethod,
    activeTab,
    showBudgets,
    selectedGroupers,
  ]);

  // Fetch period comparison data
  useEffect(() => {
    if (activeTab !== "period-comparison") return;

    // Check if filter state has changed for this tab
    const currentFilterState = {
      selectedGroupers: [...selectedGroupers],
      showBudgets,
    };
    const lastFilterStateForTab = lastFilterState.periodComparison;
    const filterStateChanged =
      JSON.stringify(currentFilterState.selectedGroupers) !==
        JSON.stringify(lastFilterStateForTab.selectedGroupers) ||
      currentFilterState.showBudgets !== lastFilterStateForTab.showBudgets;

    // Only fetch if payment method changed, filters changed, or data is empty
    const shouldFetch =
      lastPaymentMethodUsed.periodComparison !== paymentMethod ||
      filterStateChanged ||
      periodComparisonData.length === 0;

    if (!shouldFetch) return;

    const fetchPeriodComparisonData = async () => {
      try {
        setIsLoadingPeriodComparison(true);
        setPeriodComparisonError(null);

        // Build query parameters
        const params = new URLSearchParams({
          paymentMethod: paymentMethod,
        });

        // Add grouper filtering if specific groupers are selected
        if (
          selectedGroupers.length > 0 &&
          selectedGroupers.length < allGroupers.length
        ) {
          params.append("grouperIds", selectedGroupers.join(","));
        }

        // Add budget parameter if budget display is enabled
        if (showBudgets) {
          params.append("includeBudgets", "true");
        }

        const response = await fetch(
          `/api/dashboard/groupers/period-comparison?${params.toString()}`
        );

        if (response.ok) {
          const data = await response.json();

          // Process period comparison data and ensure budget_amount is properly handled
          const processedData = data.map((period: any) => ({
            ...period,
            grouper_data: period.grouper_data.map((grouper: any) => ({
              ...grouper,
              // Ensure budget_amount is a number or undefined, handle null/undefined cases
              budget_amount: showBudgets
                ? typeof grouper.budget_amount === "number"
                  ? grouper.budget_amount
                  : 0
                : undefined,
            })),
          }));

          setPeriodComparisonData(processedData);
          setLastPaymentMethodUsed((prev) => ({
            ...prev,
            periodComparison: paymentMethod,
          }));

          // Update filter state tracking for period comparison tab
          setLastFilterState((prev) => ({
            ...prev,
            periodComparison: {
              selectedGroupers: [...selectedGroupers],
              showBudgets,
            },
          }));
        } else {
          const error = await response.json().catch(() => ({}));
          const errorMessage =
            error.error ||
            `HTTP ${response.status}: Error al cargar comparación por períodos`;
          setPeriodComparisonError(errorMessage);
          toast({
            title: "Error al cargar comparación por períodos",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching period comparison data:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error de conexión al cargar datos de comparación";
        setPeriodComparisonError(errorMessage);
        toast({
          title: "Error de conexión",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoadingPeriodComparison(false);
      }
    };

    fetchPeriodComparisonData();
  }, [
    activeTab,
    paymentMethod,
    lastPaymentMethodUsed.periodComparison,
    periodComparisonData.length,
    selectedGroupers,
    showBudgets,
    allGroupers.length,
    lastFilterState.periodComparison,
  ]);

  // Fetch weekly cumulative data
  useEffect(() => {
    if (activeTab !== "weekly-cumulative" || !activePeriod) return;

    // Check if filter state has changed for this tab
    const currentFilterState = {
      selectedGroupers: [...selectedGroupers],
      showBudgets,
    };
    const lastFilterStateForTab = lastFilterState.weeklyCumulative;
    const filterStateChanged =
      JSON.stringify(currentFilterState.selectedGroupers) !==
        JSON.stringify(lastFilterStateForTab.selectedGroupers) ||
      currentFilterState.showBudgets !== lastFilterStateForTab.showBudgets;

    // Only fetch if payment method changed, period changed, filters changed, or data is empty
    const shouldFetch =
      lastPaymentMethodUsed.weeklyCumulative !== paymentMethod ||
      filterStateChanged ||
      weeklyCumulativeData.length === 0;

    if (!shouldFetch) return;

    const fetchWeeklyCumulativeData = async () => {
      try {
        setIsLoadingWeeklyCumulative(true);
        setWeeklyCumulativeError(null);

        // Build query parameters
        const params = new URLSearchParams({
          periodId: activePeriod.id.toString(),
          paymentMethod: paymentMethod,
        });

        // Add grouper filtering if specific groupers are selected
        if (
          selectedGroupers.length > 0 &&
          selectedGroupers.length < allGroupers.length
        ) {
          params.append("grouperIds", selectedGroupers.join(","));
        }

        // Add budget parameter if budget display is enabled
        if (showBudgets) {
          params.append("includeBudgets", "true");
        }

        const response = await fetch(
          `/api/dashboard/groupers/weekly-cumulative?${params.toString()}`
        );

        if (response.ok) {
          const data = await response.json();

          // Process weekly cumulative data and ensure budget_amount is properly handled
          const processedData = data.map((week: any) => ({
            ...week,
            grouper_data: week.grouper_data.map((grouper: any) => ({
              ...grouper,
              // Ensure budget_amount is a number or undefined, handle null/undefined cases
              budget_amount: showBudgets
                ? typeof grouper.budget_amount === "number"
                  ? grouper.budget_amount
                  : 0
                : undefined,
            })),
          }));

          setWeeklyCumulativeData(processedData);
          setLastPaymentMethodUsed((prev) => ({
            ...prev,
            weeklyCumulative: paymentMethod,
          }));

          // Update filter state tracking for weekly cumulative tab
          setLastFilterState((prev) => ({
            ...prev,
            weeklyCumulative: {
              selectedGroupers: [...selectedGroupers],
              showBudgets,
            },
          }));
        } else {
          const error = await response.json().catch(() => ({}));
          const errorMessage =
            error.error ||
            `HTTP ${response.status}: Error al cargar acumulado semanal`;
          setWeeklyCumulativeError(errorMessage);
          toast({
            title: "Error al cargar acumulado semanal",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching weekly cumulative data:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error de conexión al cargar datos semanales";
        setWeeklyCumulativeError(errorMessage);
        toast({
          title: "Error de conexión",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoadingWeeklyCumulative(false);
      }
    };

    fetchWeeklyCumulativeData();
  }, [
    activeTab,
    activePeriod,
    paymentMethod,
    lastPaymentMethodUsed.weeklyCumulative,
    weeklyCumulativeData.length,
    selectedGroupers,
    showBudgets,
    allGroupers.length,
    lastFilterState.weeklyCumulative,
  ]);

  // Handle period changes for weekly cumulative data
  useEffect(() => {
    if (activeTab === "weekly-cumulative" && activePeriod) {
      // Clear data when period changes to force refresh
      setWeeklyCumulativeData([]);
      setLastPaymentMethodUsed((prev) => ({
        ...prev,
        weeklyCumulative: "",
      }));
    }
  }, [activePeriod, activeTab]);

  // Fetch budget data when budget toggle is enabled
  useEffect(() => {
    if (!showBudgets || !activePeriod) {
      setBudgetData({});
      setBudgetError(null);
      return;
    }

    const fetchBudgetData = async () => {
      try {
        setIsLoadingBudgets(true);
        setBudgetError(null);

        // Build query parameters for budget data
        const params = new URLSearchParams();

        // For current view, fetch budget for active period only
        if (activeTab === "current") {
          params.append("periodId", activePeriod.id.toString());
        }
        // For period comparison and weekly cumulative, fetch all periods

        // Add grouper filtering if specific groupers are selected
        if (
          selectedGroupers.length > 0 &&
          selectedGroupers.length < allGroupers.length
        ) {
          params.append("grouperIds", selectedGroupers.join(","));
        }

        const response = await fetch(
          `/api/dashboard/groupers/budgets?${params.toString()}`
        );

        if (response.ok) {
          const data = await response.json();
          // Transform budget data into a lookup structure
          // Format: { "period_id": { grouper_id: budget_amount } }
          const budgetLookup: {
            [key: string]: { [grouperId: number]: number };
          } = {};

          data.forEach((item: any) => {
            const periodKey = item.period_id?.toString() || "all";
            if (!budgetLookup[periodKey]) {
              budgetLookup[periodKey] = {};
            }
            budgetLookup[periodKey][item.grouper_id] =
              parseFloat(item.total_budget) || 0;
          });
          setBudgetData(budgetLookup);
        } else {
          const error = await response.json().catch(() => ({}));
          const errorMessage =
            error.error ||
            `HTTP ${response.status}: Error al cargar presupuestos`;
          setBudgetError(errorMessage);

          // Don't show toast for budget errors, just log them
          console.warn("Budget data fetch failed:", errorMessage);
        }
      } catch (error) {
        console.error("Error fetching budget data:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error de conexión al cargar presupuestos";
        setBudgetError(errorMessage);
      } finally {
        setIsLoadingBudgets(false);
      }
    };

    fetchBudgetData();
  }, [
    showBudgets,
    activePeriod,
    selectedGroupers,
    allGroupers.length,
    activeTab,
  ]);

  // Retry function for budget data loading
  const retryBudgetDataLoad = () => {
    if (showBudgets && activePeriod) {
      setBudgetError(null);
      // The useEffect will trigger automatically due to dependency changes
    }
  };

  // Retry function for period comparison data
  const retryPeriodComparisonLoad = () => {
    if (activeTab === "period-comparison") {
      setPeriodComparisonError(null);
      setLastPaymentMethodUsed((prev) => ({
        ...prev,
        periodComparison: "",
      }));
    }
  };

  // Retry function for weekly cumulative data
  const retryWeeklyCumulativeLoad = () => {
    if (activeTab === "weekly-cumulative" && activePeriod) {
      setWeeklyCumulativeError(null);
      setLastPaymentMethodUsed((prev) => ({
        ...prev,
        weeklyCumulative: "",
      }));
    }
  };

  // Helper function to integrate budget data with expense data
  const integrateBudgetData = <T extends { grouper_id: number }>(
    expenseData: T[],
    periodId?: number
  ): (T & { budget_amount?: number })[] => {
    if (!showBudgets || Object.keys(budgetData).length === 0) {
      return expenseData;
    }

    const periodKey = periodId?.toString() || "all";
    const periodBudgets = budgetData[periodKey] || {};

    return expenseData.map((item) => ({
      ...item,
      budget_amount: periodBudgets[item.grouper_id] || 0,
    }));
  };

  // Helper function to integrate budget data with period comparison data
  const integrateBudgetDataForPeriods = (
    data: PeriodComparisonData
  ): PeriodComparisonData => {
    if (!showBudgets || Object.keys(budgetData).length === 0) {
      return data;
    }

    return data.map((period) => ({
      ...period,
      grouper_data: period.grouper_data.map((grouper) => {
        const periodBudgets = budgetData[period.period_id.toString()] || {};
        return {
          ...grouper,
          budget_amount: periodBudgets[grouper.grouper_id] || 0,
        };
      }),
    }));
  };

  // Helper function to integrate budget data with weekly cumulative data
  const integrateBudgetDataForWeekly = (
    data: WeeklyCumulativeData
  ): WeeklyCumulativeData => {
    if (!showBudgets || Object.keys(budgetData).length === 0 || !activePeriod) {
      return data;
    }

    const periodBudgets = budgetData[activePeriod.id.toString()] || {};

    return data.map((week) => ({
      ...week,
      grouper_data: week.grouper_data.map((grouper) => ({
        ...grouper,
        budget_amount: periodBudgets[grouper.grouper_id] || 0,
      })),
    }));
  };

  // Transform period comparison data for chart consumption
  const transformPeriodComparisonData = (
    data: PeriodComparisonData
  ): TransformedPeriodData => {
    if (!data || data.length === 0) return [];

    // Get all unique groupers
    const allGroupers = new Set<string>();
    data.forEach((period) => {
      period.grouper_data.forEach((grouper) => {
        allGroupers.add(`grouper_${grouper.grouper_id}`);
        // Add budget keys if budget display is enabled
        if (showBudgets) {
          allGroupers.add(`budget_${grouper.grouper_id}`);
        }
      });
    });

    // Transform data for chart
    return data.map((period) => {
      const transformedPeriod: any = {
        period_name: period.period_name,
      };

      // Initialize all groupers with 0
      allGroupers.forEach((grouperKey) => {
        transformedPeriod[grouperKey] = 0;
      });

      // Fill in actual values
      period.grouper_data.forEach((grouper) => {
        transformedPeriod[`grouper_${grouper.grouper_id}`] =
          grouper.total_amount;

        // Add budget data if available
        if (showBudgets && grouper.budget_amount !== undefined) {
          transformedPeriod[`budget_${grouper.grouper_id}`] =
            grouper.budget_amount;
        }
      });

      return transformedPeriod;
    });
  };

  // Get unique groupers for legend
  const getUniqueGroupers = (data: PeriodComparisonData) => {
    const groupersMap = new Map<number, string>();
    data.forEach((period) => {
      period.grouper_data.forEach((grouper) => {
        groupersMap.set(grouper.grouper_id, grouper.grouper_name);
      });
    });
    return Array.from(groupersMap.entries()).map(([id, name]) => ({
      grouper_id: id,
      grouper_name: name,
    }));
  };

  // Transform weekly cumulative data for chart consumption
  const transformWeeklyCumulativeData = (
    data: WeeklyCumulativeData
  ): TransformedWeeklyData => {
    if (!data || data.length === 0) return [];

    // Get all unique groupers
    const allGroupers = new Set<string>();
    data.forEach((week) => {
      week.grouper_data.forEach((grouper) => {
        allGroupers.add(`grouper_${grouper.grouper_id}`);
      });
    });

    // Transform data for chart
    return data.map((week) => {
      const transformedWeek: any = {
        week_label: week.week_label,
      };

      // Initialize all groupers with 0
      allGroupers.forEach((grouperKey) => {
        transformedWeek[grouperKey] = 0;
      });

      // Fill in actual values
      week.grouper_data.forEach((grouper) => {
        transformedWeek[`grouper_${grouper.grouper_id}`] =
          grouper.cumulative_amount;
      });

      return transformedWeek;
    });
  };

  // Get unique groupers for weekly cumulative legend
  const getUniqueGroupersFromWeekly = (data: WeeklyCumulativeData) => {
    const groupersMap = new Map<number, string>();
    data.forEach((week) => {
      week.grouper_data.forEach((grouper) => {
        groupersMap.set(grouper.grouper_id, grouper.grouper_name);
      });
    });
    return Array.from(groupersMap.entries()).map(([id, name]) => ({
      grouper_id: id,
      grouper_name: name,
    }));
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Retry functions
  const retryPeriodComparison = () => {
    setLastPaymentMethodUsed((prev) => ({
      ...prev,
      periodComparison: "",
    }));
    setPeriodComparisonError(null);
  };

  const retryWeeklyCumulative = () => {
    setLastPaymentMethodUsed((prev) => ({
      ...prev,
      weeklyCumulative: "",
    }));
    setWeeklyCumulativeError(null);
  };

  const retryBudgetData = () => {
    setBudgetError(null);
    setBudgetData({});
    // The useEffect will automatically refetch when budgetError is cleared
  };

  // Loading skeleton components
  const ChartSkeleton = () => (
    <div className="w-full h-[400px] space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );

  const LineChartSkeleton = () => (
    <div className="w-full h-[500px] space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="relative h-[400px] border rounded">
        <div className="absolute inset-4 space-y-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-end space-x-8 h-12">
              {[...Array(6)].map((_, j) => (
                <Skeleton
                  key={j}
                  className="flex-1"
                  style={{ height: `${Math.random() * 100 + 20}%` }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex justify-between">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-16" />
          ))}
        </div>
      </div>
      <div className="flex justify-center space-x-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );

  // Error state component
  const ErrorState = ({
    message,
    onRetry,
  }: {
    message: string;
    onRetry: () => void;
  }) => (
    <div className="text-center py-16 space-y-4">
      <div className="text-red-500 text-lg font-medium">
        Error al cargar los datos
      </div>
      <p className="text-muted-foreground max-w-md mx-auto">{message}</p>
      <Button variant="outline" onClick={onRetry} className="mt-4">
        Intentar de nuevo
      </Button>
    </div>
  );

  // Empty state component
  const EmptyState = ({
    title,
    description,
    icon,
    action,
  }: {
    title: string;
    description: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
  }) => (
    <div className="text-center py-16 space-y-4">
      {icon && <div className="flex justify-center mb-4">{icon}</div>}
      <div className="text-muted-foreground text-lg font-medium">{title}</div>
      <p className="text-muted-foreground max-w-md mx-auto text-sm">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );

  // Custom tooltip for the charts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-white dark:bg-gray-800 border rounded shadow-sm">
          <p className="font-medium">{payload[0].payload.name}</p>
          <p className="text-sm">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for current view chart with budget support
  const CustomCurrentViewTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Sort payload to show expenses first, then budget
      const sortedPayload = [...payload].sort((a, b) => {
        if (a.dataKey === "amount") return -1;
        if (b.dataKey === "amount") return 1;
        return 0;
      });

      return (
        <div className="p-3 bg-white dark:bg-gray-800 border rounded shadow-lg min-w-[200px]">
          <p className="font-semibold mb-3 text-center border-b pb-2">
            {label}
          </p>
          {sortedPayload.map((entry: any, index: number) => {
            const isExpense = entry.dataKey === "amount";
            const isBudget = entry.dataKey === "budget_amount";

            if (isBudget && entry.value === 0) return null; // Don't show zero budget values

            return (
              <div
                key={index}
                className="flex items-center justify-between gap-3 py-1"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 ${
                      isExpense
                        ? "rounded-sm"
                        : "rounded-sm border-2 border-dashed"
                    }`}
                    style={{
                      backgroundColor: isExpense
                        ? entry.color
                        : entry.color + "80",
                      borderColor: isExpense ? entry.color : entry.color,
                    }}
                  />
                  <span
                    className={`text-sm ${
                      isExpense ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {isExpense ? "💰 Gastos Reales" : "📊 Presupuesto"}
                  </span>
                </div>
                <span
                  className={`font-bold ${
                    isExpense
                      ? "text-green-600 dark:text-green-400"
                      : "text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {formatCurrency(entry.value)}
                </span>
              </div>
            );
          })}

          {/* Show comparison if both values exist */}
          {payload.length === 2 &&
            payload.find((p: any) => p.dataKey === "budget_amount")?.value >
              0 && (
              <div className="mt-3 pt-2 border-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Diferencia:</span>
                  {(() => {
                    const expense =
                      payload.find((p: any) => p.dataKey === "amount")?.value ||
                      0;
                    const budget =
                      payload.find((p: any) => p.dataKey === "budget_amount")
                        ?.value || 0;
                    const difference = expense - budget;
                    const isOverBudget = difference > 0;

                    return (
                      <span
                        className={`font-semibold ${
                          isOverBudget
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {isOverBudget ? "+" : ""}
                        {formatCurrency(difference)}
                        {isOverBudget ? " 📈" : " 📉"}
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for period comparison chart
  const CustomPeriodTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Group payload by grouper to show expense and budget together
      const grouperMap = new Map();

      payload.forEach((entry: any) => {
        if (
          entry.value > 0 ||
          (showBudgets && entry.dataKey.startsWith("budget_"))
        ) {
          const isBudget = entry.dataKey.startsWith("budget_");
          const grouperId = parseInt(
            entry.dataKey.replace(isBudget ? "budget_" : "grouper_", "")
          );

          if (!grouperMap.has(grouperId)) {
            const uniqueGroupers = getUniqueGroupers(periodComparisonData);
            const grouperName =
              uniqueGroupers.find((g) => g.grouper_id === grouperId)
                ?.grouper_name || "Unknown";
            grouperMap.set(grouperId, {
              name: grouperName,
              expense: 0,
              budget: 0,
              expenseColor: null,
              budgetColor: null,
            });
          }

          const grouperData = grouperMap.get(grouperId);
          if (isBudget) {
            grouperData.budget = entry.value;
            grouperData.budgetColor = entry.color;
          } else {
            grouperData.expense = entry.value;
            grouperData.expenseColor = entry.color;
          }
        }
      });

      return (
        <div className="p-3 bg-white dark:bg-gray-800 border rounded shadow-lg min-w-[250px]">
          <p className="font-semibold mb-3 text-center border-b pb-2">
            {label}
          </p>
          {Array.from(grouperMap.entries()).map(
            ([grouperId, data]: [number, any]) => (
              <div key={grouperId} className="mb-3 last:mb-0">
                <p className="font-medium text-sm mb-2">{data.name}</p>

                {/* Expense data */}
                {data.expense > 0 && (
                  <div className="flex items-center justify-between gap-3 py-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: data.expenseColor }}
                      />
                      <span className="text-sm font-semibold">
                        💰 Gastos Reales
                      </span>
                    </div>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(data.expense)}
                    </span>
                  </div>
                )}

                {/* Budget data */}
                {showBudgets && data.budget > 0 && (
                  <div className="flex items-center justify-between gap-3 py-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm border-2 border-dashed"
                        style={{
                          backgroundColor: data.budgetColor + "40",
                          borderColor: data.budgetColor,
                        }}
                      />
                      <span className="text-sm font-medium">
                        📊 Presupuesto
                      </span>
                    </div>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(data.budget)}
                    </span>
                  </div>
                )}

                {/* Show comparison if both values exist */}
                {showBudgets && data.expense > 0 && data.budget > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Diferencia:</span>
                      {(() => {
                        const difference = data.expense - data.budget;
                        const isOverBudget = difference > 0;

                        return (
                          <span
                            className={`font-semibold ${
                              isOverBudget
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400"
                            }`}
                          >
                            {isOverBudget ? "+" : ""}
                            {formatCurrency(difference)}
                            {isOverBudget ? " 📈" : " 📉"}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for weekly cumulative chart
  const CustomWeeklyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-white dark:bg-gray-800 border rounded shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.value > 0) {
              // Find grouper name from the data key
              const grouperKey = entry.dataKey;
              const grouperId = parseInt(grouperKey.replace("grouper_", ""));
              const uniqueGroupers =
                getUniqueGroupersFromWeekly(weeklyCumulativeData);
              const grouperName =
                uniqueGroupers.find((g) => g.grouper_id === grouperId)
                  ?.grouper_name || "Unknown";

              return (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span>{grouperName}:</span>
                  <span className="font-medium">
                    {formatCurrency(entry.value)} (acumulado)
                  </span>
                </div>
              );
            }
            return null;
          })}
        </div>
      );
    }
    return null;
  };

  // Handle grouper click
  const handleGrouperClick = (data: GrouperData) => {
    setSelectedGrouper(data);
  };

  // Reset category selection
  const handleResetSelection = () => {
    setSelectedGrouper(null);
    setShowCategoryChart(false);
    setCategoryData([]);
  };

  // Handle agrupador filter changes
  const handleGrouperSelectionChange = (selected: number[]) => {
    setSelectedGroupers(selected);

    // Reset category selection when filter changes (only relevant for current tab)
    if (activeTab === "current") {
      setSelectedGrouper(null);
      setShowCategoryChart(false);
      setCategoryData([]);
    }

    // Set appropriate loading states based on active tab to provide immediate feedback
    if (activeTab === "current") {
      setIsLoading(true);
    } else if (activeTab === "period-comparison") {
      setIsLoadingPeriodComparison(true);
    } else if (activeTab === "weekly-cumulative") {
      setIsLoadingWeeklyCumulative(true);
    }
  };

  // Handle budget toggle changes
  const handleBudgetToggle = (show: boolean) => {
    setShowBudgets(show);

    // Clear any previous budget errors
    setBudgetError(null);

    // Set appropriate loading states based on active tab to provide immediate feedback
    if (activeTab === "current") {
      setIsLoading(true);
    } else if (activeTab === "period-comparison") {
      setIsLoadingPeriodComparison(true);
    } else if (activeTab === "weekly-cumulative") {
      setIsLoadingWeeklyCumulative(true);
    }
  };

  // Handle payment method filter changes
  const handlePaymentMethodChange = (newPaymentMethod: string) => {
    setPaymentMethod(newPaymentMethod);

    // Reset category selection when filter changes (only relevant for current tab)
    if (activeTab === "current") {
      setSelectedGrouper(null);
      setShowCategoryChart(false);
      setCategoryData([]);
    }

    // Set appropriate loading states based on active tab to provide immediate feedback
    // This ensures users see loading state immediately when filter changes
    if (activeTab === "current") {
      setIsLoading(true);
    } else if (activeTab === "period-comparison") {
      setIsLoadingPeriodComparison(true);
    } else if (activeTab === "weekly-cumulative") {
      setIsLoadingWeeklyCumulative(true);
    }
  };

  // Handle tab switching with filter state maintenance
  const handleTabChange = (
    tab: "current" | "period-comparison" | "weekly-cumulative"
  ) => {
    // Store the previous tab for reference
    const previousTab = activeTab;

    // Clear loading states for tabs we're switching away from
    if (activeTab === "current") {
      setIsLoading(false);
    } else if (activeTab === "period-comparison") {
      setIsLoadingPeriodComparison(false);
    } else if (activeTab === "weekly-cumulative") {
      setIsLoadingWeeklyCumulative(false);
    }

    setActiveTab(tab);

    // Reset category selection when switching tabs (only relevant for current view)
    if (tab !== "current") {
      setSelectedGrouper(null);
      setShowCategoryChart(false);
      setCategoryData([]);
    }

    // Determine if data needs to be refetched based on filter state changes
    const needsDataRefresh = (tabType: string) => {
      const currentFilterState = {
        selectedGroupers: [...selectedGroupers],
        showBudgets,
      };

      switch (tabType) {
        case "current":
          const lastCurrentState = lastFilterState.current;
          return (
            !grouperData.length ||
            lastPaymentMethodUsed.current !== paymentMethod ||
            // Check if filter state has changed since last fetch for this tab
            JSON.stringify(currentFilterState.selectedGroupers) !==
              JSON.stringify(lastCurrentState.selectedGroupers) ||
            currentFilterState.showBudgets !== lastCurrentState.showBudgets
          );
        case "period-comparison":
          const lastPeriodState = lastFilterState.periodComparison;
          return (
            !periodComparisonData.length ||
            lastPaymentMethodUsed.periodComparison !== paymentMethod ||
            // Data needs refresh if filters changed
            JSON.stringify(currentFilterState.selectedGroupers) !==
              JSON.stringify(lastPeriodState.selectedGroupers) ||
            currentFilterState.showBudgets !== lastPeriodState.showBudgets
          );
        case "weekly-cumulative":
          const lastWeeklyState = lastFilterState.weeklyCumulative;
          return (
            !weeklyCumulativeData.length ||
            lastPaymentMethodUsed.weeklyCumulative !== paymentMethod ||
            // Data needs refresh if filters changed (note: weekly cumulative doesn't use showBudgets currently)
            JSON.stringify(currentFilterState.selectedGroupers) !==
              JSON.stringify(lastWeeklyState.selectedGroupers)
          );
        default:
          return false;
      }
    };

    // Set loading state for the tab being switched to if data needs to be fetched
    // This provides immediate visual feedback while data loads and ensures filter state is applied
    if (tab === "current" && needsDataRefresh("current")) {
      setIsLoading(true);
    } else if (
      tab === "period-comparison" &&
      needsDataRefresh("period-comparison")
    ) {
      setIsLoadingPeriodComparison(true);
    } else if (
      tab === "weekly-cumulative" &&
      needsDataRefresh("weekly-cumulative")
    ) {
      setIsLoadingWeeklyCumulative(true);
    }

    // Force data refresh for the new tab to ensure filter state is properly applied
    // This is especially important when switching between tabs with different filter states
    setTimeout(() => {
      if (tab === "current") {
        // Trigger current view data refresh by updating a dependency
        setLastPaymentMethodUsed((prev) => ({ ...prev, current: "" }));
      } else if (tab === "period-comparison") {
        // Trigger period comparison data refresh
        setLastPaymentMethodUsed((prev) => ({ ...prev, periodComparison: "" }));
      } else if (tab === "weekly-cumulative") {
        // Trigger weekly cumulative data refresh
        setLastPaymentMethodUsed((prev) => ({ ...prev, weeklyCumulative: "" }));
      }
    }, 0);
  };

  // Tab navigation component
  const TabNavigation = () => (
    <div className="flex space-x-1 mb-6">
      <Button
        variant={activeTab === "current" ? "default" : "outline"}
        onClick={() => handleTabChange("current")}
      >
        Vista Actual
      </Button>
      <Button
        variant={activeTab === "period-comparison" ? "default" : "outline"}
        onClick={() => handleTabChange("period-comparison")}
      >
        Comparación por Períodos
      </Button>
      <Button
        variant={activeTab === "weekly-cumulative" ? "default" : "outline"}
        onClick={() => handleTabChange("weekly-cumulative")}
      >
        Acumulado Semanal
      </Button>
    </div>
  );

  // Render current view (existing chart functionality)
  const renderCurrentView = () => {
    // Show error state if there's a main data error
    if (mainDataError) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Error al cargar datos</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {mainDataError}
                </p>
              </div>
              <Button onClick={retryMainDataLoad} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Show empty state if no groupers are selected
    if (selectedGroupers.length === 0) {
      return (
        <Card>
          <CardContent>
            <EmptyState
              title="No hay agrupadores seleccionados"
              description="Selecciona uno o más agrupadores en el filtro para ver los datos de gastos del período actual."
              icon={<Filter className="h-12 w-12 text-muted-foreground/50" />}
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    // Select all groupers
                    const allGrouperIds = allGroupers.map((g) => g.grouper_id);
                    setSelectedGroupers(allGrouperIds);
                  }}
                  disabled={allGroupers.length === 0}
                >
                  Seleccionar todos los agrupadores
                </Button>
              }
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              Total de gastos por agrupador
              {paymentMethod !== "all" &&
                ` (${paymentMethod === "cash" ? "Efectivo" : "Crédito"})`}
              {activePeriod && ` - ${activePeriod.name}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {grouperData.length === 0 ? (
              <EmptyState
                title="Sin datos de gastos"
                description={`No hay gastos registrados para ${
                  selectedGroupers.length === 1
                    ? "el agrupador seleccionado"
                    : "los agrupadores seleccionados"
                } en este período${
                  paymentMethod !== "all"
                    ? ` con el método de pago ${
                        paymentMethod === "cash" ? "efectivo" : "crédito"
                      }`
                    : ""
                }.`}
                icon={
                  <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
                }
                action={
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Intenta cambiar los filtros o registra algunos gastos para
                      este período.
                    </p>
                    {paymentMethod !== "all" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePaymentMethodChange("all")}
                      >
                        Ver todos los métodos de pago
                      </Button>
                    )}
                  </div>
                }
              />
            ) : (
              <div className="w-full h-[400px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={grouperData.map((item) => ({
                      name: item.grouper_name,
                      amount: item.total_amount,
                      budget_amount: showBudgets
                        ? item.budget_amount || 0
                        : undefined,
                      ...item,
                    }))}
                    margin={{ top: 10, right: 120, left: 120, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      domain={[0, maxGrouperAmount]}
                      tickFormatter={formatCurrency}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={150}
                      tick={{
                        fontSize: 12,
                      }}
                      interval={0}
                    />
                    <Tooltip content={<CustomCurrentViewTooltip />} />

                    {/* Budget bars - shown first so they appear behind expense bars */}
                    {showBudgets && (
                      <Bar
                        dataKey="budget_amount"
                        name="Presupuesto"
                        opacity={0.5}
                      >
                        {grouperData.map((entry, index) => {
                          // Create a more distinct budget color scheme
                          const baseColor = COLORS[index % COLORS.length];

                          // Convert hex to RGB and create a lighter, more muted version
                          const hexToRgb = (hex: string) => {
                            const result =
                              /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
                                hex
                              );
                            return result
                              ? {
                                  r: parseInt(result[1], 16),
                                  g: parseInt(result[2], 16),
                                  b: parseInt(result[3], 16),
                                }
                              : null;
                          };

                          const rgb = hexToRgb(baseColor);
                          const budgetColor = rgb
                            ? `rgba(${Math.min(255, rgb.r + 40)}, ${Math.min(
                                255,
                                rgb.g + 40
                              )}, ${Math.min(255, rgb.b + 40)}, 0.6)`
                            : `${baseColor}60`;

                          return (
                            <Cell
                              key={`budget-cell-${index}`}
                              fill={budgetColor}
                              stroke={baseColor}
                              strokeWidth={2}
                              strokeDasharray="8 4" // More prominent dashed pattern
                            />
                          );
                        })}
                        <LabelList
                          dataKey="budget_amount"
                          position="right"
                          formatter={(value: number) =>
                            value > 0 ? `Presup: ${formatCurrency(value)}` : ""
                          }
                          style={{
                            fontSize: "11px",
                            fill: "#475569",
                            fontWeight: "600",
                            fontStyle: "italic",
                          }}
                        />
                      </Bar>
                    )}

                    {/* Expense bars - shown on top */}
                    <Bar
                      dataKey="amount"
                      name="Gastos"
                      onClick={(data) => handleGrouperClick(data)}
                      cursor="pointer"
                    >
                      {grouperData.map((entry, index) => (
                        <Cell
                          key={`expense-cell-${index}`}
                          fill={
                            selectedGrouper?.grouper_id === entry.grouper_id
                              ? "#ff6361"
                              : COLORS[index % COLORS.length]
                          }
                        />
                      ))}
                      <LabelList
                        dataKey="amount"
                        position="right"
                        formatter={(value: number) =>
                          `Gastos: ${formatCurrency(value)}`
                        }
                        style={{
                          fontSize: "11px",
                          fontWeight: "600",
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Show aggregated categories button when groupers are filtered and no specific grouper is selected */}
        {selectedGroupers.length > 0 &&
          selectedGroupers.length < allGroupers.length &&
          !selectedGrouper &&
          !showCategoryChart && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">
                    Ver categorías{" "}
                    {selectedGroupers.length === 1
                      ? "del agrupador seleccionado"
                      : `agregadas de los ${selectedGroupers.length} agrupadores seleccionados`}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Trigger the aggregated category fetch by setting a flag
                      // The useEffect will handle the actual fetching
                      setShowCategoryChart(true);
                    }}
                  >
                    {selectedGroupers.length === 1
                      ? "Mostrar Categorías"
                      : "Mostrar Categorías Agregadas"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        {showCategoryChart && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {selectedGrouper
                  ? `Categorías en agrupador: ${selectedGrouper.grouper_name}`
                  : selectedGroupers.length === 1
                  ? `Categorías en agrupador: ${
                      allGroupers.find(
                        (g) => g.grouper_id === selectedGroupers[0]
                      )?.grouper_name || "Desconocido"
                    }`
                  : `Categorías agregadas (${selectedGroupers.length} agrupadores)`}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetSelection}
              >
                {selectedGrouper
                  ? "Volver a vista de agrupadores"
                  : "Ocultar categorías"}
              </Button>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <EmptyState
                  title="Sin datos de categorías"
                  description={
                    selectedGrouper
                      ? `No hay gastos registrados en las categorías del agrupador "${selectedGrouper.grouper_name}" para este período.`
                      : selectedGroupers.length === 1
                      ? `No hay gastos registrados en las categorías del agrupador seleccionado para este período.`
                      : `No hay gastos registrados en las categorías de los ${selectedGroupers.length} agrupadores seleccionados para este período.`
                  }
                  icon={
                    <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
                  }
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetSelection}
                    >
                      Volver a vista de agrupadores
                    </Button>
                  }
                />
              ) : (
                <div className="w-full h-[400px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={categoryData.map((item) => ({
                        name: item.category_name,
                        amount: item.total_amount,
                        budget_amount: showBudgets
                          ? item.budget_amount || 0
                          : undefined,
                        ...item,
                      }))}
                      margin={{ top: 10, right: 120, left: 120, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        domain={[0, maxCategoryAmount]}
                        tickFormatter={formatCurrency}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={150}
                        tick={{
                          fontSize: 12,
                        }}
                        interval={0}
                      />
                      <Tooltip content={<CustomCurrentViewTooltip />} />

                      {/* Budget bars for categories - shown first so they appear behind expense bars */}
                      {showBudgets && (
                        <Bar
                          dataKey="budget_amount"
                          name="Presupuesto"
                          opacity={0.5}
                        >
                          {categoryData.map((entry, index) => {
                            // Create a more distinct budget color scheme
                            const baseColor = COLORS[index % COLORS.length];

                            // Convert hex to RGB and create a lighter, more muted version
                            const hexToRgb = (hex: string) => {
                              const result =
                                /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
                                  hex
                                );
                              return result
                                ? {
                                    r: parseInt(result[1], 16),
                                    g: parseInt(result[2], 16),
                                    b: parseInt(result[3], 16),
                                  }
                                : null;
                            };

                            const rgb = hexToRgb(baseColor);
                            const budgetColor = rgb
                              ? `rgba(${Math.min(255, rgb.r + 40)}, ${Math.min(
                                  255,
                                  rgb.g + 40
                                )}, ${Math.min(255, rgb.b + 40)}, 0.6)`
                              : `${baseColor}60`;

                            return (
                              <Cell
                                key={`budget-cell-${index}`}
                                fill={budgetColor}
                                stroke={baseColor}
                                strokeWidth={2}
                                strokeDasharray="8 4" // More prominent dashed pattern
                              />
                            );
                          })}
                          <LabelList
                            dataKey="budget_amount"
                            position="right"
                            formatter={(value: number) =>
                              value > 0
                                ? `Presup: ${formatCurrency(value)}`
                                : ""
                            }
                            style={{
                              fontSize: "11px",
                              fill: "#475569",
                              fontWeight: "600",
                              fontStyle: "italic",
                            }}
                          />
                        </Bar>
                      )}

                      {/* Expense bars for categories */}
                      <Bar dataKey="amount" name="Gastos">
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`expense-cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                        <LabelList
                          dataKey="amount"
                          position="right"
                          formatter={(value: number) =>
                            `Gastos: ${formatCurrency(value)}`
                          }
                          style={{
                            fontSize: "11px",
                            fontWeight: "600",
                          }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </>
    );
  };

  // Render period comparison view
  const renderPeriodComparisonView = () => {
    // Show error state if there's a period comparison error
    if (periodComparisonError) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  Error al cargar comparación por períodos
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {periodComparisonError}
                </p>
              </div>
              <Button onClick={retryPeriodComparisonLoad} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Show empty state if no groupers are selected
    if (selectedGroupers.length === 0) {
      return (
        <Card>
          <CardContent>
            <EmptyState
              title="No hay agrupadores seleccionados"
              description="Selecciona uno o más agrupadores en el filtro para ver la comparación de gastos entre diferentes períodos."
              icon={<Filter className="h-12 w-12 text-muted-foreground/50" />}
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    // Select all groupers
                    const allGrouperIds = allGroupers.map((g) => g.grouper_id);
                    setSelectedGroupers(allGrouperIds);
                  }}
                  disabled={allGroupers.length === 0}
                >
                  Seleccionar todos los agrupadores
                </Button>
              }
            />
          </CardContent>
        </Card>
      );
    }

    const transformedData = transformPeriodComparisonData(periodComparisonData);
    const uniqueGroupers = getUniqueGroupers(periodComparisonData);

    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Comparación por Períodos
            {paymentMethod !== "all" &&
              ` (${
                paymentMethod === "cash"
                  ? "Efectivo"
                  : paymentMethod === "credit"
                  ? "Crédito"
                  : "Débito"
              })`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPeriodComparison ? (
            <LineChartSkeleton />
          ) : periodComparisonError ? (
            <ErrorState
              message={periodComparisonError}
              onRetry={retryPeriodComparison}
            />
          ) : transformedData.length === 0 || uniqueGroupers.length === 0 ? (
            <EmptyState
              title="Sin datos de comparación"
              description={`No hay datos de gastos disponibles para comparar entre períodos${
                selectedGroupers.length === 1
                  ? " para el agrupador seleccionado"
                  : ` para los ${selectedGroupers.length} agrupadores seleccionados`
              }${
                paymentMethod !== "all"
                  ? ` con el método de pago ${
                      paymentMethod === "cash" ? "efectivo" : "crédito"
                    }`
                  : ""
              }. Registra gastos en diferentes períodos para ver la evolución.`}
              icon={
                <TrendingUp className="h-12 w-12 text-muted-foreground/50" />
              }
              action={
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Intenta cambiar los filtros o registra gastos en múltiples
                    períodos.
                  </p>
                  {paymentMethod !== "all" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePaymentMethodChange("all")}
                    >
                      Ver todos los métodos de pago
                    </Button>
                  )}
                </div>
              }
            />
          ) : (
            <div className="w-full h-[500px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={transformedData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="period_name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip content={<CustomPeriodTooltip />} />
                  <Legend />

                  {/* Expense lines */}
                  {uniqueGroupers.map((grouper, index) => (
                    <Line
                      key={`expense-${grouper.grouper_id}`}
                      type="monotone"
                      dataKey={`grouper_${grouper.grouper_id}`}
                      stroke={COLORS[index % COLORS.length]}
                      name={`${grouper.grouper_name} (Gastos)`}
                      strokeWidth={3}
                      dot={{ r: 4, fill: COLORS[index % COLORS.length] }}
                      activeDot={{ r: 6, fill: COLORS[index % COLORS.length] }}
                    />
                  ))}

                  {/* Budget lines - only show when budget toggle is enabled */}
                  {showBudgets &&
                    uniqueGroupers.map((grouper, index) => (
                      <Line
                        key={`budget-${grouper.grouper_id}`}
                        type="monotone"
                        dataKey={`budget_${grouper.grouper_id}`}
                        stroke={COLORS[index % COLORS.length]}
                        name={`${grouper.grouper_name} (Presupuesto)`}
                        strokeWidth={2}
                        strokeDasharray="8 4"
                        dot={{
                          r: 3,
                          fill: "white",
                          stroke: COLORS[index % COLORS.length],
                          strokeWidth: 2,
                        }}
                        activeDot={{
                          r: 5,
                          fill: "white",
                          stroke: COLORS[index % COLORS.length],
                          strokeWidth: 2,
                        }}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render weekly cumulative view
  const renderWeeklyCumulativeView = () => {
    // Show error state if there's a weekly cumulative error
    if (weeklyCumulativeError) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  Error al cargar acumulado semanal
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {weeklyCumulativeError}
                </p>
              </div>
              <Button onClick={retryWeeklyCumulativeLoad} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Show empty state if no groupers are selected
    if (selectedGroupers.length === 0) {
      return (
        <Card>
          <CardContent>
            <EmptyState
              title="No hay agrupadores seleccionados"
              description="Selecciona uno o más agrupadores en el filtro para ver la evolución semanal acumulada de gastos en el período actual."
              icon={<Filter className="h-12 w-12 text-muted-foreground/50" />}
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    // Select all groupers
                    const allGrouperIds = allGroupers.map((g) => g.grouper_id);
                    setSelectedGroupers(allGrouperIds);
                  }}
                  disabled={allGroupers.length === 0}
                >
                  Seleccionar todos los agrupadores
                </Button>
              }
            />
          </CardContent>
        </Card>
      );
    }

    const transformedData = transformWeeklyCumulativeData(weeklyCumulativeData);
    const uniqueGroupers = getUniqueGroupersFromWeekly(weeklyCumulativeData);

    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Acumulado Semanal
            {paymentMethod !== "all" &&
              ` (${
                paymentMethod === "cash"
                  ? "Efectivo"
                  : paymentMethod === "credit"
                  ? "Crédito"
                  : "Débito"
              })`}
            {activePeriod && ` - ${activePeriod.name}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingWeeklyCumulative ? (
            <LineChartSkeleton />
          ) : weeklyCumulativeError ? (
            <ErrorState
              message={weeklyCumulativeError}
              onRetry={retryWeeklyCumulative}
            />
          ) : transformedData.length === 0 || uniqueGroupers.length === 0 ? (
            <EmptyState
              title="Sin datos semanales"
              description={`No hay gastos registrados para mostrar el acumulado semanal${
                selectedGroupers.length === 1
                  ? " del agrupador seleccionado"
                  : ` de los ${selectedGroupers.length} agrupadores seleccionados`
              } en el período "${activePeriod?.name || "actual"}"${
                paymentMethod !== "all"
                  ? ` con el método de pago ${
                      paymentMethod === "cash" ? "efectivo" : "crédito"
                    }`
                  : ""
              }. Registra algunos gastos para ver la evolución semanal.`}
              icon={<Calendar className="h-12 w-12 text-muted-foreground/50" />}
              action={
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Intenta cambiar los filtros o registra gastos en este
                    período.
                  </p>
                  {paymentMethod !== "all" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePaymentMethodChange("all")}
                    >
                      Ver todos los métodos de pago
                    </Button>
                  )}
                </div>
              }
            />
          ) : (
            <div className="w-full h-[500px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={transformedData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="week_label"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip content={<CustomWeeklyTooltip />} />
                  <Legend />
                  {uniqueGroupers.map((grouper, index) => (
                    <Line
                      key={grouper.grouper_id}
                      type="monotone"
                      dataKey={`grouper_${grouper.grouper_id}`}
                      stroke={COLORS[index % COLORS.length]}
                      name={grouper.grouper_name}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <Button
        variant="outline"
        onClick={() => router.push("/")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al Dashboard
      </Button>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard de Agrupadores</h1>

        <div className="flex items-center gap-4">
          <Select
            value={paymentMethod}
            onValueChange={handlePaymentMethodChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Método de pago" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cash">Efectivo</SelectItem>
              <SelectItem value="credit">Crédito</SelectItem>
              <SelectItem value="debit">Debito</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Filtros:
          </span>
        </div>

        <AgrupadorFilter
          allGroupers={allGroupers}
          selectedGroupers={selectedGroupers}
          onSelectionChange={handleGrouperSelectionChange}
          isLoading={
            isLoadingFilters || !activePeriod || allGroupers.length === 0
          }
          error={filterError}
          onRetry={retryFilterLoad}
        />

        {/* Budget toggle is only available for current and period comparison views */}
        {(activeTab === "current" || activeTab === "period-comparison") && (
          <BudgetToggle
            showBudgets={showBudgets}
            onToggle={handleBudgetToggle}
            disabled={selectedGroupers.length === 0}
            isLoading={isLoadingBudgets}
            error={budgetError}
            onRetry={retryBudgetDataLoad}
          />
        )}

        {selectedGroupers.length === 0 && (
          <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-3 py-1 rounded-md">
            Selecciona al menos un agrupador para ver los datos
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <TabNavigation />

      {/* Conditional rendering based on active tab */}
      {activeTab === "current" &&
        (isLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-6 w-64" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartSkeleton />
            </CardContent>
          </Card>
        ) : (
          renderCurrentView()
        ))}
      {activeTab === "period-comparison" && renderPeriodComparisonView()}
      {activeTab === "weekly-cumulative" && renderWeeklyCumulativeView()}
    </div>
  );
}
