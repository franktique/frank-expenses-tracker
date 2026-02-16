'use client';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Fund } from '@/types/funds';

interface FundCategoryRelationshipIndicatorProps {
  associatedFunds: Fund[];
  fallbackFundName?: string;
  showCount?: boolean;
  showTooltip?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export function FundCategoryRelationshipIndicator({
  associatedFunds,
  fallbackFundName,
  showCount = true,
  showTooltip = true,
  variant = 'default',
  className,
}: FundCategoryRelationshipIndicatorProps) {
  const hasSpecificFunds = associatedFunds && associatedFunds.length > 0;
  const fundCount = hasSpecificFunds ? associatedFunds.length : 0;

  const getStatusIcon = () => {
    if (hasSpecificFunds) {
      return fundCount === 1 ? (
        <CheckCircle2 className="h-3 w-3 text-green-600" />
      ) : (
        <Users className="h-3 w-3 text-blue-600" />
      );
    }
    return <AlertCircle className="h-3 w-3 text-amber-600" />;
  };

  const getStatusColor = () => {
    if (hasSpecificFunds) {
      return fundCount === 1
        ? 'text-green-700 bg-green-50 border-green-200'
        : 'text-blue-700 bg-blue-50 border-blue-200';
    }
    return 'text-amber-700 bg-amber-50 border-amber-200';
  };

  const getTooltipContent = () => {
    if (hasSpecificFunds) {
      if (fundCount === 1) {
        return `Esta categoría está asociada específicamente con el fondo "${associatedFunds[0].name}". Los gastos solo pueden registrarse desde este fondo.`;
      }
      return `Esta categoría está asociada con ${fundCount} fondos específicos: ${associatedFunds
        .map((f) => f.name)
        .join(
          ', '
        )}. Los gastos pueden registrarse desde cualquiera de estos fondos.`;
    }
    return `Esta categoría no tiene fondos específicos asociados. Los gastos pueden registrarse desde cualquier fondo disponible.`;
  };

  if (variant === 'compact') {
    const indicator = (
      <div className={cn('flex items-center gap-1', className)}>
        {getStatusIcon()}
        {showCount && hasSpecificFunds && (
          <span className="text-xs text-muted-foreground">{fundCount}</span>
        )}
      </div>
    );

    if (showTooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{indicator}</TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{getTooltipContent()}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return indicator;
  }

  if (variant === 'detailed') {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">
            {hasSpecificFunds ? 'Fondos específicos' : 'Todos los fondos'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {hasSpecificFunds ? (
            associatedFunds.map((fund) => (
              <Badge key={fund.id} variant="secondary" className="text-xs">
                {fund.name}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="text-xs">
              {fallbackFundName || 'Cualquier fondo'}
            </Badge>
          )}
        </div>
        {showTooltip && (
          <p className="text-xs text-muted-foreground">{getTooltipContent()}</p>
        )}
      </div>
    );
  }

  // Default variant
  const content = (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {hasSpecificFunds ? (
        <>
          {associatedFunds.map((fund) => (
            <Badge
              key={fund.id}
              variant="secondary"
              className="flex items-center gap-1 text-xs"
            >
              <div className="h-2 w-2 rounded-full bg-green-500" />
              {fund.name}
            </Badge>
          ))}
          {showCount && (
            <div className="ml-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />({fundCount} fondo
              {fundCount !== 1 ? 's' : ''})
            </div>
          )}
        </>
      ) : (
        <Badge variant="outline" className="flex items-center gap-1 text-xs">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          {fallbackFundName || 'Todos los fondos'}
        </Badge>
      )}
    </div>
  );

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">{content}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{getTooltipContent()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

// Status indicator for fund selection constraints
interface FundSelectionConstraintIndicatorProps {
  categoryId: string;
  availableFunds: Fund[];
  selectedFund: Fund | null;
  currentFilterFund: Fund | null;
  className?: string;
}

export function FundSelectionConstraintIndicator({
  categoryId,
  availableFunds,
  selectedFund,
  currentFilterFund,
  className,
}: FundSelectionConstraintIndicatorProps) {
  if (!categoryId) {
    return null;
  }

  const hasConstraints = availableFunds.length > 0;
  const isFilterFundAvailable =
    currentFilterFund &&
    availableFunds.some((f) => f.id === currentFilterFund.id);
  const isSelectedFundValid =
    selectedFund && availableFunds.some((f) => f.id === selectedFund.id);

  const getStatusInfo = () => {
    if (availableFunds.length === 0) {
      return {
        icon: <Info className="h-4 w-4 text-blue-500" />,
        message: 'Sin restricciones de fondo',
        description: 'Esta categoría acepta gastos desde cualquier fondo',
        variant: 'info' as const,
      };
    }

    if (isFilterFundAvailable) {
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        message: 'Fondo del filtro disponible',
        description: `El fondo actual del filtro (${currentFilterFund?.name}) está disponible para esta categoría`,
        variant: 'success' as const,
      };
    }

    if (selectedFund && isSelectedFundValid) {
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        message: 'Fondo válido seleccionado',
        description: `El fondo seleccionado (${selectedFund.name}) es válido para esta categoría`,
        variant: 'success' as const,
      };
    }

    return {
      icon: <AlertCircle className="h-4 w-4 text-amber-500" />,
      message: 'Fondos restringidos',
      description: `Esta categoría solo acepta gastos desde: ${availableFunds
        .map((f) => f.name)
        .join(', ')}`,
      variant: 'warning' as const,
    };
  };

  const status = getStatusInfo();
  const variantClasses = {
    info: 'text-blue-700 bg-blue-50 border-blue-200',
    success: 'text-green-700 bg-green-50 border-green-200',
    warning: 'text-amber-700 bg-amber-50 border-amber-200',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border p-2 text-sm',
        variantClasses[status.variant],
        className
      )}
    >
      {status.icon}
      <div className="min-w-0 flex-1">
        <p className="font-medium">{status.message}</p>
        <p className="mt-1 text-xs opacity-90">{status.description}</p>
      </div>
    </div>
  );
}

// Helper component for showing fund availability in dropdowns
interface FundAvailabilityBadgeProps {
  fund: Fund;
  isAvailable: boolean;
  isRecommended?: boolean;
  className?: string;
}

export function FundAvailabilityBadge({
  fund,
  isAvailable,
  isRecommended = false,
  className,
}: FundAvailabilityBadgeProps) {
  if (!isAvailable) {
    return (
      <Badge variant="outline" className={cn('text-xs opacity-50', className)}>
        No disponible
      </Badge>
    );
  }

  if (isRecommended) {
    return (
      <Badge
        variant="default"
        className={cn('bg-green-100 text-xs text-green-800', className)}
      >
        Recomendado
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={cn('text-xs', className)}>
      Disponible
    </Badge>
  );
}
