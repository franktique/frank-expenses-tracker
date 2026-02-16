'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpDown,
  PieChart,
  Activity,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { FundErrorDisplay } from '@/components/fund-error-display';
import {
  FundsDashboardEmptyState,
  FundsDashboardSkeleton,
  FundBalanceTrendsEmptyState,
  FundTransfersEmptyState,
  ChartLoadingSkeleton,
} from '@/components/fund-empty-states';

interface FundDashboardData {
  funds: Array<{
    id: string;
    name: string;
    description?: string;
    current_balance: number;
    total_income: number;
    total_expenses: number;
    total_transfers_in: number;
    total_transfers_out: number;
    allocation_percentage: number;
    category_count: number;
  }>;
  summary: {
    total_funds: number;
    total_balance: number;
    total_income: number;
    total_expenses: number;
    total_transfers: number;
    total_categories: number;
  };
}

interface BalanceTrend {
  date: string;
  balance: number;
  net_change: number;
}

interface Transfer {
  id: string;
  date: string;
  description: string;
  amount: number;
  transfer_type: 'incoming' | 'outgoing' | 'transfer';
  category_name: string;
  source_fund_name: string;
  destination_fund_name: string;
}

interface TransferData {
  transfers: Transfer[];
  statistics: {
    total_transfers: number;
    total_transfer_amount: number;
    incoming_total?: number;
    outgoing_total?: number;
    net_transfer_amount?: number;
  };
}

export function FundsDashboard() {
  const [dashboardData, setDashboardData] = useState<FundDashboardData | null>(
    null
  );
  const [balanceData, setBalanceData] = useState<BalanceTrend[]>([]);
  const [transferData, setTransferData] = useState<TransferData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch main dashboard data
        const dashboardResponse = await fetch('/api/dashboard/funds');
        if (!dashboardResponse.ok) {
          throw new Error(
            `Failed to fetch dashboard data: ${dashboardResponse.statusText}`
          );
        }
        const dashboard = await dashboardResponse.json();
        setDashboardData(dashboard);

        // Fetch balance trends (last 30 days)
        const balanceResponse = await fetch(
          '/api/dashboard/funds/balances?days=30'
        );
        if (!balanceResponse.ok) {
          // If balance trends fail, set empty data instead of throwing error
          console.warn(
            'Failed to fetch balance trends:',
            balanceResponse.statusText
          );
          setBalanceData([]);
        } else {
          const balance = await balanceResponse.json();
          setBalanceData(balance.balance_trends || []);
        }

        // Fetch recent transfers
        const transferResponse = await fetch(
          '/api/dashboard/funds/transfers?limit=10'
        );
        if (!transferResponse.ok) {
          // If transfers fail, set empty data instead of throwing error
          console.warn(
            'Failed to fetch transfers:',
            transferResponse.statusText
          );
          setTransferData({
            transfers: [],
            statistics: { total_transfers: 0, total_transfer_amount: 0 },
          });
        } else {
          const transfers = await transferResponse.json();
          setTransferData(transfers);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  // Colors for pie chart
  const COLORS = [
    '#0088FE',
    '#00C49F',
    '#FFBB28',
    '#FF8042',
    '#8884D8',
    '#82CA9D',
    '#FFC658',
    '#FF7C7C',
    '#8DD1E1',
    '#D084D0',
  ];

  if (isLoading) {
    return <FundsDashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <FundErrorDisplay
          error={error}
          onRetry={() => window.location.reload()}
          showDetails={true}
        />
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              No se pudieron cargar los datos del dashboard
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData || dashboardData.funds.length === 0) {
    return <FundsDashboardEmptyState />;
  }

  const { funds, summary } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.total_balance)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.total_funds} fondos activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos Totales
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.total_income)}
            </div>
            <p className="text-xs text-muted-foreground">Todos los fondos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gastos Totales
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.total_expenses)}
            </div>
            <p className="text-xs text-muted-foreground">Todos los fondos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Transferencias
            </CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.total_transfers)}
            </div>
            <p className="text-xs text-muted-foreground">Entre fondos</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Balance Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Tendencia de Balance (30 días)
            </CardTitle>
            <CardDescription>
              Evolución del balance total de todos los fondos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {balanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={balanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    fontSize={12}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCurrency(value)}
                    fontSize={12}
                  />
                  <Tooltip
                    labelFormatter={(label) => formatFullDate(label)}
                    formatter={(value: number) => [
                      formatCurrency(value),
                      'Balance',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <FundBalanceTrendsEmptyState />
            )}
          </CardContent>
        </Card>

        {/* Fund Allocation Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribución de Fondos
            </CardTitle>
            <CardDescription>Porcentaje de balance por fondo</CardDescription>
          </CardHeader>
          <CardContent>
            {funds &&
            funds.length > 0 &&
            funds.some((f) => f.current_balance > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={funds.filter((f) => f.current_balance > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, allocation_percentage }) =>
                      `${name}: ${allocation_percentage.toFixed(1)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="current_balance"
                  >
                    {funds
                      .filter((f) => f.current_balance > 0)
                      .map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <FundBalanceTrendsEmptyState />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fund Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Fondos</CardTitle>
          <CardDescription>
            Balance y estadísticas de cada fondo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fondo</TableHead>
                <TableHead className="text-right">Balance Actual</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
                <TableHead className="text-right">Gastos</TableHead>
                <TableHead className="text-right">Transferencias</TableHead>
                <TableHead className="text-right">Categorías</TableHead>
                <TableHead className="text-right">Asignación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funds
                .sort((a, b) => b.current_balance - a.current_balance)
                .map((fund) => (
                  <TableRow key={fund.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{fund.name}</div>
                        {fund.description && (
                          <div className="text-sm text-muted-foreground">
                            {fund.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span
                        className={
                          fund.current_balance >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {formatCurrency(fund.current_balance)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(fund.total_income)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(fund.total_expenses)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <div className="text-xs">
                        <div className="text-green-600">
                          +{formatCurrency(fund.total_transfers_in)}
                        </div>
                        <div className="text-red-600">
                          -{formatCurrency(fund.total_transfers_out)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{fund.category_count}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {fund.allocation_percentage.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              {(!funds || funds.length === 0) && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No hay fondos disponibles
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Transfers */}
      <Card>
        <CardHeader>
          <CardTitle>Transferencias Recientes</CardTitle>
          <CardDescription>Últimas transferencias entre fondos</CardDescription>
        </CardHeader>
        <CardContent>
          {transferData && transferData.transfers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hacia</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transferData.transfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell>{formatFullDate(transfer.date)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {transfer.description}
                    </TableCell>
                    <TableCell>{transfer.source_fund_name}</TableCell>
                    <TableCell>{transfer.destination_fund_name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(transfer.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transfer.transfer_type === 'incoming'
                            ? 'default'
                            : transfer.transfer_type === 'outgoing'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {transfer.transfer_type === 'incoming'
                          ? 'Entrada'
                          : transfer.transfer_type === 'outgoing'
                            ? 'Salida'
                            : 'Transferencia'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <FundTransfersEmptyState />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
