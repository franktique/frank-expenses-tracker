'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { objectsToCSV } from '@/lib/csv-export';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function ExportExpensesButton() {
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
      // Fetch expenses data
      const response = await fetch('/api/export/expenses');

      if (!response.ok) {
        throw new Error('Error al exportar gastos');
      }

      const expenses = await response.json();

      // Define columns for the CSV
      const columns = [
        { header: 'Fecha', key: 'date', formatter: formatDateForDisplay },
        { header: 'Categoría', key: 'category_name' },
        { header: 'Periodo', key: 'period_name' },
        {
          header: 'Medio de Pago',
          key: 'payment_method',
          formatter: formatPaymentMethod,
        },
        {
          header: 'Tarjeta de Crédito',
          key: 'credit_card_info',
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
          formatter: (value: number) => value.toString(),
        },
      ];

      // Generate CSV string
      const csvString = objectsToCSV(expenses, columns);

      // Get current date for filename
      const currentDate = format(new Date(), 'yyyy-MM-dd', { locale: es });

      // Use client-side function to download the CSV
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `gastos-export-${currentDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Exportación completada',
        description: `${expenses.length} gastos exportados exitosamente`,
      });
    } catch (error) {
      console.error('Error exporting expenses:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron exportar los gastos',
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
          <Download className="mr-2 h-4 w-4" />
          Exportar a CSV
        </>
      )}
    </Button>
  );
}
