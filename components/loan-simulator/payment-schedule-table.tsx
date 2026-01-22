"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, DollarSign, TrendingUp } from "lucide-react";
import type { AmortizationPayment, ExtraPayment, CurrencyCode } from "@/types/loan-simulator";
import { formatCurrency, formatDate } from "@/lib/loan-calculations";

interface PaymentScheduleTableProps {
  payments: AmortizationPayment[];
  extraPayments: ExtraPayment[];
  onAddExtraPayment?: (paymentNumber: number) => void;
  onRemoveExtraPayment?: (extraPaymentId: string) => void;
  currency?: CurrencyCode;
}

export function PaymentScheduleTable({
  payments,
  extraPayments,
  onAddExtraPayment,
  onRemoveExtraPayment,
  currency = "USD",
}: PaymentScheduleTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Create a map of extra payments for quick lookup
  const extraPaymentsMap = useMemo(() => {
    const map = new Map<number, ExtraPayment>();
    extraPayments.forEach((ep) => {
      map.set(ep.paymentNumber, ep);
    });
    return map;
  }, [extraPayments]);

  // Filter payments based on search term
  const filteredPayments = useMemo(() => {
    if (!searchTerm) return payments;

    const term = searchTerm.toLowerCase();
    return payments.filter((payment) => {
      const searchStr = `${payment.paymentNumber} ${payment.date} ${payment.paymentAmount} ${payment.remainingBalance}`.toLowerCase();
      return searchStr.includes(term);
    });
  }, [payments, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Calculate cumulative totals for displayed page
  const pageTotals = useMemo(() => {
    return paginatedPayments.reduce(
      (acc, payment) => ({
        totalPrincipal: acc.totalPrincipal + payment.principalPortion,
        totalInterest: acc.totalInterest + payment.interestPortion,
        totalPaid: acc.totalPaid + payment.paymentAmount,
      }),
      { totalPrincipal: 0, totalInterest: 0, totalPaid: 0 }
    );
  }, [paginatedPayments]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendario de Pagos
          {extraPayments.length > 0 && (
            <Badge variant="secondary">
              {extraPayments.length} pago{extraPayments.length !== 1 ? "s" : ""} extra
            </Badge>
          )}
        </CardTitle>

        {/* Search */}
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por pago, fecha, monto..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Extra Payments Summary */}
        {extraPayments.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">Pagos Extra Aplicados:</h4>
            <div className="space-y-1">
              {extraPayments
                .sort((a, b) => a.paymentNumber - b.paymentNumber)
                .map((ep) => (
                  <div
                    key={ep.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      Pago #{ep.paymentNumber}: {formatCurrency(ep.amount, currency)}
                      {ep.description && ` (${ep.description})`}
                    </span>
                    {onRemoveExtraPayment && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveExtraPayment(ep.id)}
                        className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Payment Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">#</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead className="text-right">Capital</TableHead>
                <TableHead className="text-right">Interés</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                {onAddExtraPayment && <TableHead className="w-[100px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPayments.map((payment) => {
                const extraPayment = extraPaymentsMap.get(payment.paymentNumber);
                const isFinalPayment = payment.remainingBalance === 0;

                return (
                  <TableRow
                    key={payment.paymentNumber}
                    className={extraPayment ? "bg-blue-50 dark:bg-blue-950/50" : ""}
                  >
                    <TableCell className="font-medium">
                      {payment.paymentNumber}
                      {isFinalPayment && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Final
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium">
                        {formatCurrency(payment.paymentAmount, currency)}
                      </div>
                      {extraPayment && (
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          +{formatCurrency(extraPayment.amount, currency)} extra
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DollarSign className="inline h-3 w-3 text-green-600 dark:text-green-400 mr-1" />
                      {formatCurrency(payment.principalPortion, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <TrendingUp className="inline h-3 w-3 text-orange-600 dark:text-orange-400 mr-1" />
                      {formatCurrency(payment.interestPortion, currency)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payment.remainingBalance, currency)}
                    </TableCell>
                    {onAddExtraPayment && !isFinalPayment && (
                      <TableCell>
                        {!extraPayment && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onAddExtraPayment(payment.paymentNumber)
                            }
                            className="h-7 text-xs"
                          >
                            + Extra
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Page Totals */}
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Capital pagado: </span>
              <span className="font-semibold">
                {formatCurrency(pageTotals.totalPrincipal, currency)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Interés pagado: </span>
              <span className="font-semibold">
                {formatCurrency(pageTotals.totalInterest, currency)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Total pagado: </span>
              <span className="font-semibold">
                {formatCurrency(pageTotals.totalPaid, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1} - {Math.min(endIndex, filteredPayments.length)} de{" "}
              {filteredPayments.length} pagos
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
