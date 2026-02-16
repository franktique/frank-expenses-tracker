'use client';

import { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { createMultiSheetExcel, downloadExcel } from '@/lib/csv-export';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function ExportExpensesExcelButton() {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'credit':
        return 'Tarjeta de Crédito';
      case 'debit':
        return 'Tarjeta de Débito';
      case 'cash':
        return 'Efectivo';
      default:
        return method;
    }
  };

  const formatCreditCardInfo = (expense: any) => {
    if (!expense.credit_card_bank || !expense.credit_card_last_four) {
      return '';
    }

    const franchiseDisplay = expense.credit_card_franchise
      ? expense.credit_card_franchise.charAt(0).toUpperCase() +
        expense.credit_card_franchise.slice(1)
      : '';

    return `${expense.credit_card_bank} - ${franchiseDisplay} ****${expense.credit_card_last_four}`;
  };

  const formatDateForDisplay = (dateString: string) => {
    try {
      // Ensure consistent date formatting regardless of timezone
      const dateParts = dateString.split('T')[0].split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // month is 0-indexed in Date
        const day = parseInt(dateParts[2]);

        return format(new Date(year, month, day), 'dd/MM/yyyy', { locale: es });
      }
      return dateString;
    } catch (e) {
      return dateString;
    }
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Fetch expenses data grouped by period
      const response = await fetch('/api/export/expenses-excel');

      if (!response.ok) {
        throw new Error('Error al exportar gastos');
      }

      const expensesByPeriod = await response.json();

      // Check if there's any data
      const totalExpenses = Object.values(expensesByPeriod).reduce(
        (total: number, expenses: any) => total + expenses.length,
        0
      );

      if (totalExpenses === 0) {
        toast({
          title: 'Sin datos',
          description: 'No hay gastos para exportar',
          variant: 'destructive',
        });
        return;
      }

      // Define columns for Excel export (same as CSV but without period column)
      const columns = [
        { header: 'Fecha', key: 'date', formatter: formatDateForDisplay },
        { header: 'Categoría', key: 'category_name' },
        {
          header: 'Medio de Pago',
          key: 'payment_method',
          formatter: formatPaymentMethod,
        },
        {
          header: 'Tarjeta de Crédito',
          key: 'credit_card_info',
          columnType: 'text' as const,
          formatter: (value: any, expense: any) =>
            formatCreditCardInfo(expense),
        },
        { header: 'Descripción', key: 'description' },
        {
          header: 'Evento',
          key: 'event',
          formatter: (value: string) => value || '',
        },
        {
          header: 'Monto',
          key: 'amount',
          formatter: (value: number) =>
            `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
        },
      ];

      // Create multi-sheet workbook
      const workbook = createMultiSheetExcel(expensesByPeriod, columns);

      // Get current date for filename
      const currentDate = format(new Date(), 'yyyy-MM-dd', { locale: es });

      // Download the Excel file
      downloadExcel(workbook, `gastos-por-periodo-${currentDate}.xlsx`);

      const periodCount = Object.keys(expensesByPeriod).length;
      toast({
        title: 'Exportación completada',
        description: `${totalExpenses} gastos exportados en ${periodCount} hojas (períodos)`,
      });
    } catch (error) {
      console.error('Error exporting expenses to Excel:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron exportar los gastos a Excel',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exportando...
        </>
      ) : (
        <>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar Excel
        </>
      )}
    </Button>
  );
}
