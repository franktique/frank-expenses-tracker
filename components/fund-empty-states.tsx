"use client";

import {
  PlusCircle,
  Wallet,
  TrendingUp,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${
        className || ""
      }`}
    >
      {icon && <div className="mb-4 p-3 rounded-full bg-muted">{icon}</div>}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}

// Specialized empty states for funds
export function FundsEmptyState({
  onCreateFund,
}: {
  onCreateFund: () => void;
}) {
  return (
    <EmptyState
      title="No hay fondos creados"
      description="Los fondos te ayudan a organizar tus finanzas en diferentes categorías. Crea tu primer fondo para comenzar a gestionar tu dinero de manera más efectiva."
      icon={<Wallet className="h-8 w-8 text-muted-foreground" />}
      action={{
        label: "Crear primer fondo",
        onClick: onCreateFund,
      }}
    />
  );
}

export function FundsDashboardEmptyState() {
  return (
    <EmptyState
      title="No hay datos de fondos disponibles"
      description="Una vez que tengas fondos creados y transacciones registradas, aquí verás gráficos y estadísticas detalladas sobre el rendimiento de tus fondos."
      icon={<BarChart3 className="h-8 w-8 text-muted-foreground" />}
    />
  );
}

export function FundBalanceTrendsEmptyState() {
  return (
    <div className="h-[300px] flex items-center justify-center">
      <div className="text-center">
        <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h4 className="text-lg font-medium mb-2">Sin datos de tendencia</h4>
        <p className="text-muted-foreground text-sm">
          Los datos de tendencia aparecerán una vez que tengas transacciones
          registradas
        </p>
      </div>
    </div>
  );
}

export function FundTransfersEmptyState() {
  return (
    <div className="py-8 text-center">
      <div className="mb-4">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
          <RefreshCw className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
      <h4 className="text-lg font-medium mb-2">
        No hay transferencias recientes
      </h4>
      <p className="text-muted-foreground text-sm">
        Las transferencias entre fondos aparecerán aquí cuando registres gastos
        con destino a otros fondos
      </p>
    </div>
  );
}

// Loading states
export function FundsTableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4">
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[80px]" />
          <div className="flex space-x-2 ml-auto">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FundsDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px] mb-2" />
              <Skeleton className="h-3 w-[80px]" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Table Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[150px]" />
          <Skeleton className="h-4 w-[250px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-4 w-[60px]" />
                <Skeleton className="h-4 w-[60px]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function FundBalanceCalculationLoader({
  fundName,
}: {
  fundName: string;
}) {
  return (
    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
      <RefreshCw className="h-4 w-4 animate-spin" />
      <span>Recalculando balance de {fundName}...</span>
    </div>
  );
}

export function FundOperationLoader({ operation }: { operation: string }) {
  return (
    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
      <RefreshCw className="h-4 w-4 animate-spin" />
      <span>{operation}...</span>
    </div>
  );
}

// Chart loading states
export function ChartLoadingSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className={`h-[${height}px] flex items-center justify-center`}>
      <div className="text-center">
        <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Cargando datos...</p>
      </div>
    </div>
  );
}

// Inline loading indicators
export function InlineLoader({ text = "Cargando..." }: { text?: string }) {
  return (
    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
      <RefreshCw className="h-3 w-3 animate-spin" />
      <span>{text}</span>
    </div>
  );
}

// Button loading state
export function LoadingButton({
  children,
  isLoading,
  loadingText,
  ...props
}: {
  children: React.ReactNode;
  isLoading: boolean;
  loadingText?: string;
} & React.ComponentProps<typeof Button>) {
  return (
    <Button disabled={isLoading} {...props}>
      {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
      {isLoading ? loadingText || "Cargando..." : children}
    </Button>
  );
}
