"use client";

import { Badge } from "@/components/ui/badge";
import { TIPO_GASTO_LABELS, TipoGasto } from "@/types/funds";

interface TipoGastoBadgeProps {
  tipoGasto?: TipoGasto;
  showLabel?: boolean;
}

export function TipoGastoBadge({ tipoGasto, showLabel = true }: TipoGastoBadgeProps) {
  if (!tipoGasto) {
    return (
      <Badge variant="outline" className="text-gray-500">
        Sin clasificar
      </Badge>
    );
  }

  // Determine styling based on tipo_gasto value
  let variant: "default" | "outline" | "secondary" | "destructive" = "default";
  let className = "";

  switch (tipoGasto) {
    case "F": // Fijo (Fixed)
      variant = "default";
      className = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      break;
    case "V": // Variable
      variant = "secondary";
      className = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      break;
    case "SF": // Semi Fijo (Semi-Fixed)
      variant = "secondary";
      className = "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      break;
    case "E": // Eventual
      variant = "secondary";
      className = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      break;
    default:
      variant = "outline";
  }

  const label = TIPO_GASTO_LABELS[tipoGasto];

  return (
    <Badge variant={variant} className={className}>
      {showLabel ? label : tipoGasto}
    </Badge>
  );
}
