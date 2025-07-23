"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
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
};

type CategoryData = {
  category_id: string;
  category_name: string;
  total_amount: number;
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

  // Fetch groupers data
  useEffect(() => {
    if (!activePeriod || activeTab !== "current") return;

    const fetchGrouperData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/dashboard/groupers?periodId=${activePeriod.id}&paymentMethod=${paymentMethod}`
        );

        if (response.ok) {
          const data = await response.json();
          console.log("--------Data:", data);
          const sortedData = data
            // .filter((item: GrouperData) => item.total_amount > 0) // Temporarily removed for debugging
            .sort((a: GrouperData, b: GrouperData) =>
              a.grouper_name.localeCompare(b.grouper_name)
            ); // Sort by name as amount is 0

          console.log("--------Sorted Data:", sortedData);
          setGrouperData(sortedData);

          // Update tracking for current tab
          setLastPaymentMethodUsed((prev) => ({
            ...prev,
            current: paymentMethod,
          }));

          // Calculate max amount for chart scaling
          if (sortedData.length > 0) {
            setMaxGrouperAmount(sortedData[0].total_amount * 1.1); // Add 10% for visualization margin
          }
        } else {
          const error = await response.json();
          toast({
            title: "Error fetching grouper data",
            description: error.error || "An unknown error occurred",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching grouper data:", error);
        toast({
          title: "Error fetching grouper data",
          description: "Failed to load grouper statistics",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchGrouperData();
  }, [activePeriod, paymentMethod, activeTab]);

  // Fetch category data when a grouper is selected
  useEffect(() => {
    if (!activePeriod || !selectedGrouper || activeTab !== "current") return;

    const fetchCategoryData = async () => {
      try {
        const response = await fetch(
          `/api/dashboard/groupers/${selectedGrouper.grouper_id}/categories?periodId=${activePeriod.id}&paymentMethod=${paymentMethod}`
        );

        if (response.ok) {
          const data = await response.json();
          const sortedData = data
            .filter((item: CategoryData) => item.total_amount > 0)
            .sort(
              (a: CategoryData, b: CategoryData) =>
                b.total_amount - a.total_amount
            );

          setCategoryData(sortedData);
          setShowCategoryChart(true);

          // Calculate max amount for chart scaling
          if (sortedData.length > 0) {
            setMaxCategoryAmount(sortedData[0].total_amount * 1.1); // Add 10% for visualization margin
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
  }, [activePeriod, selectedGrouper, paymentMethod, activeTab]);

  // Fetch period comparison data
  useEffect(() => {
    if (activeTab !== "period-comparison") return;

    // Only fetch if payment method changed or data is empty
    const shouldFetch =
      lastPaymentMethodUsed.periodComparison !== paymentMethod ||
      periodComparisonData.length === 0;

    if (!shouldFetch) return;

    const fetchPeriodComparisonData = async () => {
      try {
        setIsLoadingPeriodComparison(true);
        setPeriodComparisonError(null);

        const response = await fetch(
          `/api/dashboard/groupers/period-comparison?paymentMethod=${paymentMethod}`
        );

        if (response.ok) {
          const data = await response.json();
          setPeriodComparisonData(data);
          setLastPaymentMethodUsed((prev) => ({
            ...prev,
            periodComparison: paymentMethod,
          }));
        } else {
          const error = await response.json();
          const errorMessage =
            error.error || "Error desconocido al cargar datos";
          setPeriodComparisonError(errorMessage);
          toast({
            title: "Error al cargar comparación por períodos",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching period comparison data:", error);
        const errorMessage = "Error de conexión al cargar datos de comparación";
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
  ]);

  // Fetch weekly cumulative data
  useEffect(() => {
    if (activeTab !== "weekly-cumulative" || !activePeriod) return;

    // Only fetch if payment method changed, period changed, or data is empty
    const shouldFetch =
      lastPaymentMethodUsed.weeklyCumulative !== paymentMethod ||
      weeklyCumulativeData.length === 0;

    if (!shouldFetch) return;

    const fetchWeeklyCumulativeData = async () => {
      try {
        setIsLoadingWeeklyCumulative(true);
        setWeeklyCumulativeError(null);

        const response = await fetch(
          `/api/dashboard/groupers/weekly-cumulative?periodId=${activePeriod.id}&paymentMethod=${paymentMethod}`
        );

        if (response.ok) {
          const data = await response.json();
          setWeeklyCumulativeData(data);
          setLastPaymentMethodUsed((prev) => ({
            ...prev,
            weeklyCumulative: paymentMethod,
          }));
        } else {
          const error = await response.json();
          const errorMessage =
            error.error || "Error desconocido al cargar datos";
          setWeeklyCumulativeError(errorMessage);
          toast({
            title: "Error al cargar acumulado semanal",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching weekly cumulative data:", error);
        const errorMessage = "Error de conexión al cargar datos semanales";
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
  }: {
    title: string;
    description: string;
  }) => (
    <div className="text-center py-16 space-y-4">
      <div className="text-muted-foreground text-lg font-medium">{title}</div>
      <p className="text-muted-foreground max-w-md mx-auto text-sm">
        {description}
      </p>
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

  // Custom tooltip for period comparison chart
  const CustomPeriodTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-white dark:bg-gray-800 border rounded shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.value > 0) {
              // Find grouper name from the data key
              const grouperKey = entry.dataKey;
              const grouperId = parseInt(grouperKey.replace("grouper_", ""));
              const uniqueGroupers = getUniqueGroupers(periodComparisonData);
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
                    {formatCurrency(entry.value)}
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

    // Set loading state for the tab being switched to if data needs to be fetched
    // This provides immediate visual feedback while data loads
    if (
      tab === "current" &&
      (!grouperData.length || lastPaymentMethodUsed.current !== paymentMethod)
    ) {
      setIsLoading(true);
    } else if (
      tab === "period-comparison" &&
      (!periodComparisonData.length ||
        lastPaymentMethodUsed.periodComparison !== paymentMethod)
    ) {
      setIsLoadingPeriodComparison(true);
    } else if (
      tab === "weekly-cumulative" &&
      (!weeklyCumulativeData.length ||
        lastPaymentMethodUsed.weeklyCumulative !== paymentMethod)
    ) {
      setIsLoadingWeeklyCumulative(true);
    }
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
  const renderCurrentView = () => (
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
            <div className="text-center py-10">
              No hay datos de gastos por agrupador disponibles.
            </div>
          ) : (
            <div className="w-full h-[400px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={grouperData.map((item) => ({
                    name: item.grouper_name,
                    amount: item.total_amount,
                    ...item,
                  }))}
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
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
                    width={90}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="amount"
                    onClick={(data) => handleGrouperClick(data)}
                    cursor="pointer"
                  >
                    {grouperData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
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
                      formatter={formatCurrency}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {showCategoryChart && selectedGrouper && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              Categorías en agrupador: {selectedGrouper.grouper_name}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleResetSelection}>
              Volver a todos los agrupadores
            </Button>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="text-center py-10">
                No hay datos de categorías disponibles para este agrupador.
              </div>
            ) : (
              <div className="w-full h-[400px] mt-4 px-2 sm:px-8 lg:px-24 xl:px-40 2xl:px-60 min-w-[600px] max-w-[1600px] mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={categoryData.map((item) => ({
                      name: item.category_name,
                      amount: item.total_amount,
                      ...item,
                    }))}
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
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
                      width={90}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount">
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                      <LabelList
                        dataKey="amount"
                        position="right"
                        formatter={formatCurrency}
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

  // Render period comparison view
  const renderPeriodComparisonView = () => {
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
              description="No hay datos de gastos por agrupador disponibles para comparar entre períodos. Asegúrate de tener gastos registrados en diferentes períodos."
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

  // Render weekly cumulative view
  const renderWeeklyCumulativeView = () => {
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
              description="No hay datos de gastos disponibles para mostrar el acumulado semanal en este período. Registra algunos gastos para ver la evolución semanal."
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
