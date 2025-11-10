"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { Subtotals } from "@/lib/subgroup-calculations";

interface SubgroupSubtotalRowProps {
  subgroupId: string;
  subtotals: Subtotals;
  subgroupBalance: number;
  isSubgroupVisible?: boolean;
}

export function SubgroupSubtotalRow({
  subgroupId,
  subtotals,
  subgroupBalance,
  isSubgroupVisible = true,
}: SubgroupSubtotalRowProps) {
  return (
    <TableRow
      className={`bg-muted/30 border-y border-dashed font-medium text-sm ${
        !isSubgroupVisible ? "opacity-60 line-through" : ""
      }`}
      data-testid={`subgroup-subtotal-${subgroupId}`}
    >
      {/* Empty cell for expand/collapse */}
      <TableCell className="w-8 pl-2"></TableCell>

      {/* Subtotal label */}
      <TableCell className="italic text-muted-foreground">
        Subtotal:
      </TableCell>

      {/* Empty cell for tipo_gasto */}
      <TableCell>
        <span className="text-muted-foreground">-</span>
      </TableCell>

      {/* Efectivo Subtotal */}
      <TableCell className="text-right">
        <span className="font-semibold">
          {formatCurrency(subtotals.efectivoAmount)}
        </span>
      </TableCell>

      {/* Credito Subtotal */}
      <TableCell className="text-right">
        <span className="font-semibold">
          {formatCurrency(subtotals.creditoAmount)}
        </span>
      </TableCell>

      {/* Expected Savings Subtotal */}
      <TableCell className="text-right">
        <span className="font-semibold">
          {formatCurrency(subtotals.expectedSavings)}
        </span>
      </TableCell>

      {/* Total Subtotal */}
      <TableCell className="text-right">
        <span className="font-semibold">
          {formatCurrency(subtotals.total)}
        </span>
      </TableCell>

      {/* Balance column */}
      <TableCell className="text-right">
        <span className="font-semibold text-accent">
          {formatCurrency(subgroupBalance)}
        </span>
      </TableCell>

      {/* Delete button column */}
      <TableCell></TableCell>
    </TableRow>
  );
}
