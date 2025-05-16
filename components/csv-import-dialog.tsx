"use client"

import type React from "react"

import { useState } from "react"
import { AlertCircle, FileSpreadsheet, Upload } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { useBudget, type PaymentMethod } from "@/context/budget-context"
import { useToast } from "@/components/ui/use-toast"

type CSVExpense = {
  categoria: string
  fecha: string
  evento?: string
  medio: string
  descripcion: string
  monto: string
  periodo?: string
}

type ImportResult = {
  total: number
  imported: number
  errors: string[]
}

export function CSVImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { categories, periods, activePeriod, addExpense } = useBudget()
  const { toast } = useToast()

  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [progress, setProgress] = useState(0)

  const resetState = () => {
    setFile(null)
    setImporting(false)
    setImportResult(null)
    setProgress(0)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setImportResult(null)
    }
  }

  const parseCSV = (text: string): CSVExpense[] => {
    const lines = text.split("\n")
    const result: CSVExpense[] = []

    // Check if first line is a header
    const firstLine = lines[0].trim()
    const startIndex = firstLine.toLowerCase().includes("categoria") ? 1 : 0

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Split by comma, handling quoted values
      const values: string[] = []
      let inQuotes = false
      let currentValue = ""

      for (let j = 0; j < line.length; j++) {
        const char = line[j]

        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === "," && !inQuotes) {
          values.push(currentValue.trim())
          currentValue = ""
        } else {
          currentValue += char
        }
      }

      // Add the last value
      values.push(currentValue.trim())

      // Create expense object
      if (values.length >= 5) {
        result.push({
          categoria: values[0],
          fecha: values[1],
          evento: values[2] || undefined,
          medio: values[3],
          descripcion: values[4],
          monto: values[5],
          periodo: values[6] || undefined,
        })
      }
    }

    return result
  }

  const validateAndImportExpenses = async () => {
    if (!file || !activePeriod) return

    setImporting(true)
    setProgress(10)

    try {
      const text = await file.text()
      setProgress(30)

      const csvExpenses = parseCSV(text)
      setProgress(50)

      const result: ImportResult = {
        total: csvExpenses.length,
        imported: 0,
        errors: [],
      }

      // Process each expense
      for (let i = 0; i < csvExpenses.length; i++) {
        const csvExpense = csvExpenses[i]

        try {
          // Find category by name
          const category = categories.find((c) => c.name.toLowerCase() === csvExpense.categoria.toLowerCase())

          if (!category) {
            result.errors.push(`Fila ${i + 1}: Categoría "${csvExpense.categoria}" no encontrada`)
            continue
          }

          // Find period by name if provided, otherwise use active period
          let periodId = activePeriod.id
          if (csvExpense.periodo) {
            const period = periods.find((p) => p.name.toLowerCase() === csvExpense.periodo?.toLowerCase())
            if (period) {
              periodId = period.id
            } else {
              result.errors.push(`Fila ${i + 1}: Periodo "${csvExpense.periodo}" no encontrado, usando periodo activo`)
            }
          }

          // Parse date
          let date: Date
          try {
            // Try to parse date in various formats
            date = new Date(csvExpense.fecha)
            if (isNaN(date.getTime())) {
              // Try DD/MM/YYYY format
              const parts = csvExpense.fecha.split("/")
              if (parts.length === 3) {
                date = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
              }

              if (isNaN(date.getTime())) {
                throw new Error("Formato de fecha inválido")
              }
            }
          } catch (error) {
            result.errors.push(`Fila ${i + 1}: Fecha inválida "${csvExpense.fecha}"`)
            continue
          }

          // Validate payment method
          let paymentMethod: PaymentMethod = "credit"
          const medio = csvExpense.medio.toLowerCase()
          if (medio.includes("cred")) {
            paymentMethod = "credit"
          } else if (medio.includes("deb")) {
            paymentMethod = "debit"
          } else if (medio.includes("efec") || medio.includes("cash")) {
            paymentMethod = "cash"
          } else {
            result.errors.push(
              `Fila ${i + 1}: Medio de pago inválido "${csvExpense.medio}", usando crédito por defecto`,
            )
          }

          // Parse amount
          let amount: number
          try {
            // Remove currency symbol and thousands separators
            const cleanAmount = csvExpense.monto.replace(/[^\d.-]/g, "")
            amount = Number(cleanAmount)
            if (isNaN(amount) || amount <= 0) {
              throw new Error("Monto inválido")
            }
          } catch (error) {
            result.errors.push(`Fila ${i + 1}: Monto inválido "${csvExpense.monto}"`)
            continue
          }

          // Add expense
          addExpense(
            category.id,
            periodId,
            date.toISOString(),
            csvExpense.evento,
            paymentMethod,
            csvExpense.descripcion,
            amount,
          )

          result.imported++
        } catch (error) {
          result.errors.push(`Fila ${i + 1}: Error al procesar - ${(error as Error).message}`)
        }

        // Update progress
        setProgress(50 + Math.floor(((i + 1) / csvExpenses.length) * 50))
      }

      setImportResult(result)

      toast({
        title: "Importación completada",
        description: `Se importaron ${result.imported} de ${result.total} gastos.`,
      })
    } catch (error) {
      toast({
        title: "Error al importar",
        description: `Ocurrió un error al procesar el archivo: ${(error as Error).message}`,
        variant: "destructive",
      })
    } finally {
      setImporting(false)
      setProgress(100)
    }
  }

  const handleClose = () => {
    if (!importing) {
      resetState()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Gastos desde CSV</DialogTitle>
          <DialogDescription>Carga un archivo CSV con tus gastos para importarlos automáticamente.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!importResult && (
            <>
              <div className="flex items-center gap-4">
                <div className="grid flex-1 gap-2">
                  <label htmlFor="csv-file" className="text-sm font-medium leading-none">
                    Archivo CSV
                  </label>
                  <input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
                    disabled={importing}
                  />
                </div>
              </div>

              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertTitle>Formato esperado</AlertTitle>
                <AlertDescription className="text-xs">
                  El archivo CSV debe tener las siguientes columnas:
                  <ul className="list-disc pl-4 mt-1">
                    <li>Categoria (debe coincidir con una categoría existente)</li>
                    <li>Fecha (DD/MM/YYYY)</li>
                    <li>Evento (opcional)</li>
                    <li>Medio (crédito, débito, efectivo)</li>
                    <li>Descripción</li>
                    <li>Monto</li>
                    <li>Periodo (opcional, usa el periodo activo si no se especifica)</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {importing && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-center text-muted-foreground">Importando gastos... {progress}%</p>
                </div>
              )}
            </>
          )}

          {importResult && (
            <div className="space-y-4">
              <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Upload className="h-5 w-5 text-green-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-400">Importación completada</h3>
                    <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                      <p>
                        Se importaron {importResult.imported} de {importResult.total} gastos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Errores durante la importación</AlertTitle>
                  <AlertDescription>
                    <div className="max-h-40 overflow-y-auto text-xs">
                      <ul className="list-disc pl-4">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:space-x-2">
          {!importResult ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={importing}>
                Cancelar
              </Button>
              <Button onClick={validateAndImportExpenses} disabled={!file || importing || !activePeriod}>
                Importar
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="sm:ml-auto">
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
