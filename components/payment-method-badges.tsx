"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PAYMENT_METHODS } from "@/components/payment-method-selector";
import { HelpCircle } from "lucide-react";

interface PaymentMethodBadgesProps {
  selectedMethods: string[];
  className?: string;
  showTooltip?: boolean;
}

export function PaymentMethodBadges({
  selectedMethods,
  className = "",
  showTooltip = true,
}: PaymentMethodBadgesProps) {
  const getTooltipContent = () => {
    if (selectedMethods.length === 0) {
      return "Este agrupador incluye gastos de todos los métodos de pago (efectivo, crédito y débito)";
    }

    const methodLabels = selectedMethods
      .map(
        (method) =>
          PAYMENT_METHODS.find((m) => m.value === method)?.label || method
      )
      .join(", ");

    return `Este agrupador solo incluye gastos de: ${methodLabels}`;
  };

  const content = (
    <>
      {/* If no methods selected, show "All Methods" */}
      {selectedMethods.length === 0 ? (
        <div className={`flex items-center gap-1 ${className}`}>
          <Badge variant="secondary" className="text-xs">
            Todos los métodos
          </Badge>
          {showTooltip && (
            <HelpCircle className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      ) : (
        /* Show individual method badges */
        <div className={`flex flex-wrap items-center gap-1 ${className}`}>
          {selectedMethods.map((method) => {
            const methodInfo = PAYMENT_METHODS.find((m) => m.value === method);
            return (
              <Badge key={method} variant="outline" className="text-xs">
                {methodInfo?.label || method}
              </Badge>
            );
          })}
          {showTooltip && (
            <HelpCircle className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      )}
    </>
  );

  if (!showTooltip) {
    return content;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{content}</div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
