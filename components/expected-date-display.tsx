"use client";

import { Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DateUtils } from "@/types/funds";

interface ExpectedDateDisplayProps {
  expectedDate?: string | null;
  recurringDate?: number | null;
  periodMonth?: number;
  periodYear?: number;
  showRecurringInfo?: boolean;
  className?: string;
}

export function ExpectedDateDisplay({
  expectedDate,
  recurringDate,
  periodMonth,
  periodYear,
  showRecurringInfo = true,
  className = "",
}: ExpectedDateDisplayProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const isAutoCalculated = expectedDate && recurringDate && periodMonth && periodYear;
  const autoCalculatedDate = isAutoCalculated 
    ? DateUtils.calculateExpectedDate(recurringDate, periodYear, periodMonth)
    : null;

  const isMatching = isAutoCalculated && autoCalculatedDate === expectedDate;

  if (!expectedDate) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <Calendar className="h-4 w-4" />
        <span>Sin fecha especificada</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Calendar className="h-4 w-4" />
      <span className="font-medium">{formatDate(expectedDate)}</span>
      
      {showRecurringInfo && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1">
                {isMatching ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : isAutoCalculated ? (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Manual
                  </Badge>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {recurringDate && (
                  <p>
                    <strong>Día recurrente:</strong> {DateUtils.formatRecurringDate(recurringDate)}
                  </p>
                )}
                {isAutoCalculated && (
                  <p>
                    <strong>Fecha calculada:</strong> {autoCalculatedDate && formatDate(autoCalculatedDate)}
                  </p>
                )}
                {isMatching && (
                  <p className="text-green-600">
                    ✓ La fecha coincide con el cálculo automático
                  </p>
                )}
                {isAutoCalculated && !isMatching && (
                  <p className="text-yellow-600">
                    ⚠ La fecha fue modificada manualmente
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}