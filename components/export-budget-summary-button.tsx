"use client"

import { useState } from "react"
import { FileSpreadsheet, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { objectsToExcel, downloadExcel } from "@/lib/csv-export"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { BudgetSummaryItem, calculateBudgetTotals } from "@/types/dashboard"
import { formatCurrency } from "@/lib/utils"

interface ExportBudgetSummaryButtonProps {
  budgetSummary: BudgetSummaryItem[]
  totalIncome: number
  fundFilter?: { name: string } | null
  periodName: string
}

export function ExportBudgetSummaryButton({ 
  budgetSummary, 
  totalIncome,
  fundFilter,
  periodName
}: ExportBudgetSummaryButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const handleExport = async () => {
    setIsExporting(true)
    
    try {
      // Prepare data with running balance calculation and totals row
      const dataWithTotals: Array<BudgetSummaryItem & { balance?: number }> = [];
      let runningBalance = totalIncome;
      
      // Add each item with calculated running balance
      budgetSummary.forEach(item => {
        const effectiveExpense = item.debit_amount + item.cash_amount;
        runningBalance -= effectiveExpense;
        
        dataWithTotals.push({
          ...item,
          balance: runningBalance
        });
      });
      
      if (budgetSummary.length > 0) {
        const totals = calculateBudgetTotals(budgetSummary);
        const finalBalance = totalIncome - budgetSummary.reduce(
          (sum, item) => sum + (item.debit_amount + item.cash_amount), 
          0
        );
        
        // Add totals row
        dataWithTotals.push({
          category_id: 'TOTAL',
          category_name: 'TOTAL',
          credit_budget: totals.totalCreditBudget,
          cash_debit_budget: totals.totalCashDebitBudget,
          expected_amount: totals.totalExpectedAmount,
          total_amount: totals.totalActualAmount,
          credit_amount: totals.totalCreditAmount,
          debit_amount: totals.totalDebitAmount,
          cash_amount: totals.totalCashAmount,
          remaining: totals.totalRemaining,
          balance: finalBalance
        } as BudgetSummaryItem & { balance: number });
      }

      // Define columns for Excel export
      const columns = [
        { header: "Categoría", key: "category_name" },
        { 
          header: "Presupuesto Crédito", 
          key: "credit_budget", 
          formatter: (value: number) => formatCurrency(value) 
        },
        { 
          header: "Presupuesto Efectivo", 
          key: "cash_debit_budget", 
          formatter: (value: number) => formatCurrency(value) 
        },
        { 
          header: "Gasto Total", 
          key: "total_amount", 
          formatter: (value: number) => formatCurrency(value) 
        },
        { 
          header: "Tarjeta Crédito", 
          key: "credit_amount", 
          formatter: (value: number) => formatCurrency(value) 
        },
        { 
          header: "Tarjeta Débito", 
          key: "debit_amount", 
          formatter: (value: number) => formatCurrency(value) 
        },
        { 
          header: "Efectivo", 
          key: "cash_amount", 
          formatter: (value: number) => formatCurrency(value) 
        },
        { 
          header: "Restante", 
          key: "remaining", 
          formatter: (value: number) => formatCurrency(value) 
        },
        { 
          header: "Saldo", 
          key: "balance", 
          formatter: (value: number) => formatCurrency(value) 
        }
      ];

      // Create Excel workbook
      const sheetName = fundFilter 
        ? `Resumen ${fundFilter.name}`
        : 'Resumen Presupuesto';
      
      const workbook = objectsToExcel(dataWithTotals, columns, sheetName);
      
      // Generate filename with current date
      const currentDate = format(new Date(), 'yyyy-MM-dd', { locale: es });
      const fundSuffix = fundFilter ? `-${fundFilter.name.toLowerCase().replace(/\s+/g, '-')}` : '';
      const filename = `resumen-presupuesto-${currentDate}${fundSuffix}.xlsx`;
      
      // Download the Excel file
      downloadExcel(workbook, filename);
      
      toast({
        title: "Exportación completada",
        description: `Resumen de presupuesto del ${periodName} exportado exitosamente`,
      })
    } catch (error) {
      console.error("Error exporting budget summary:", error)
      toast({
        title: "Error",
        description: "No se pudo exportar el resumen de presupuesto",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }
  
  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={handleExport}
      disabled={isExporting || budgetSummary.length === 0}
    >
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
  )
}