"use client";

import { useState, useCallback } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useBudget, type PaymentMethod } from "@/context/budget-context";
import { useToast } from "@/components/ui/use-toast";
import { CSVPreviewTable, type CSVExpenseItem } from "./csv-preview-table";
// Función para generar IDs únicos (reemplazo de uuid)
function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    Date.now().toString(36)
  );
}

type ImportResult = {
  total: number;
  imported: number;
  errors: string[];
};

type ImportStage = "upload" | "preview" | "importing" | "complete";

export function CSVImportDialogEnhanced({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { categories, periods, activePeriod, addExpense } = useBudget();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<ImportStage>("upload");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [previewData, setPreviewData] = useState<CSVExpenseItem[]>([]);
  const [skipHeader, setSkipHeader] = useState(true);
  const [separator, setSeparator] = useState(",");

  const resetState = () => {
    setFile(null);
    setStage("upload");
    setImportResult(null);
    setProgress(0);
    setPreviewData([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setImportResult(null);
    }
  };

  const parseCSV = (text: string): CSVExpenseItem[] => {
    const lines = text.split("\n");
    const result: CSVExpenseItem[] = [];

    // Skip header if the option is selected
    const startIndex = skipHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Split by the selected separator, handling quoted values
      const values: string[] = [];
      let inQuotes = false;
      let currentValue = "";

      for (let j = 0; j < line.length; j++) {
        const char = line[j];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = "";
        } else {
          currentValue += char;
        }
      }

      // Add the last value
      values.push(currentValue.trim());

      // Create expense object with validation
      if (values.length >= 5) {
        const categoria = values[0];
        const fecha = values[1];
        const evento = values[2] || undefined;
        const medio = values[3];
        const descripcion = values[4];
        const monto = values[5];
        const periodo = values[6] || undefined;

        // Validate and transform values
        let hasError = false;
        const errors: Record<string, boolean> = {};

        // Validate category
        const category = categories.find(
          (c) => c.name.toLowerCase() === categoria.toLowerCase()
        );
        if (!category) {
          hasError = true;
          errors.category = true;
        }

        // Validate date
        let date: Date | undefined;
        try {
          // Primero intentar con formato DD/MM/YYYY que es el más común en español
          if (fecha.includes("/")) {
            const parts = fecha.split("/");
            if (parts.length === 3) {
              // Asegurarse que tenemos día, mes y año en el orden correcto
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1; // Los meses en JavaScript son 0-indexed
              const year = parseInt(parts[2], 10);

              // Validar que son números válidos
              if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                // Si el año tiene 2 dígitos, asumimos 2000+
                const fullYear = year < 100 ? 2000 + year : year;
                date = new Date(fullYear, month, day);
              }
            }
          }

          // Si el formato DD/MM/YYYY no funcionó, intentar con el constructor estándar de Date
          if (!date || isNaN(date.getTime())) {
            date = new Date(fecha);
          }

          // Si todavía es inválido, lanzar error
          if (!date || isNaN(date.getTime())) {
            throw new Error("Formato de fecha inválido");
          }
        } catch (error) {
          hasError = true;
          errors.date = true;
        }

        // Validate payment method
        let paymentMethod: PaymentMethod | undefined;
        const medioLower = medio.toLowerCase();
        if (medioLower.includes("cred")) {
          paymentMethod = "credit";
        } else if (medioLower.includes("deb")) {
          paymentMethod = "debit";
        } else if (medioLower.includes("efec") || medioLower.includes("cash")) {
          paymentMethod = "cash";
        } else {
          hasError = true;
          errors.payment_method = true;
        }

        // Parse amount
        let amount: number | undefined;
        try {
          // Remove currency symbol and thousands separators
          const cleanAmount = monto.replace(/[^\d.-]/g, "");
          amount = Number(cleanAmount);
          if (isNaN(amount) || amount <= 0) {
            throw new Error("Monto inválido");
          }
        } catch (error) {
          hasError = true;
          errors.amount = true;
        }

        // Find period by name if provided, otherwise use active period
        let periodId = activePeriod?.id;
        if (periodo) {
          const foundPeriod = periods.find(
            (p) => p.name.toLowerCase() === periodo.toLowerCase()
          );
          if (foundPeriod) {
            periodId = foundPeriod.id;
          } else {
            // Si se especificó un periodo pero no se encontró, es un error
            hasError = true;
            errors.period = true;
          }
        } else if (!activePeriod) {
          // Si no hay periodo activo y no se especificó un periodo, es un error
          hasError = true;
          errors.period = true;
        }

        result.push({
          id: generateId(),
          categoria,
          fecha,
          evento,
          medio,
          descripcion,
          monto,
          periodo,
          category_id: category?.id,
          date,
          payment_method: paymentMethod,
          amount,
          period_id: periodId,
          hasError,
          errors,
        });
      }
    }

    return result;
  };

  const loadPreview = async () => {
    if (!file || !activePeriod) return;

    setProgress(10);

    try {
      const text = await file.text();
      setProgress(50);

      const csvData = parseCSV(text);
      setPreviewData(csvData);
      setStage("preview");
    } catch (error) {
      toast({
        title: "Error al procesar archivo",
        description: `Ocurrió un error al leer el archivo: ${
          (error as Error).message
        }`,
        variant: "destructive",
      });
    } finally {
      setProgress(100);
    }
  };

  const handleUpdateItem = useCallback(
    (id: string, updates: Partial<CSVExpenseItem>) => {
      setPreviewData((prev) => {
        // Primero encontremos el item original que está siendo editado
        const originalItem = prev.find((item) => item.id === id);
        if (!originalItem) return prev;

        // Verificamos qué campos están siendo actualizados
        const isUpdatingCategory = updates.category_id !== undefined;
        const isUpdatingPeriod = updates.period_id !== undefined;
        const isUpdatingPaymentMethod = updates.payment_method !== undefined;
        const isUpdatingDate = updates.date !== undefined;

        return prev.map((item) => {
          // Si es el item que se está editando directamente
          if (item.id === id) {
            const updatedItem = { ...item, ...updates };

            // Recalculate if the item has any errors
            const hasAnyError = Object.values(updatedItem.errors).some(
              (error) => error
            );

            return {
              ...updatedItem,
              hasError: hasAnyError,
            };
          }

          // Para los demás items, verificamos si tienen los mismos valores originales
          // y aplicamos la misma corrección si es necesario
          let itemUpdates: Partial<CSVExpenseItem> = {};
          let needsUpdate = false;

          // Corrección automática para categorías
          if (
            isUpdatingCategory &&
            item.categoria.toLowerCase() ===
              originalItem.categoria.toLowerCase() &&
            item.errors.category
          ) {
            itemUpdates.category_id = updates.category_id;
            itemUpdates.errors = { ...item.errors, category: false };
            needsUpdate = true;
          }

          // Corrección automática para periodos
          if (
            isUpdatingPeriod &&
            item.periodo === originalItem.periodo &&
            item.errors.period
          ) {
            itemUpdates.period_id = updates.period_id;
            itemUpdates.errors = { ...item.errors, period: false };
            needsUpdate = true;
          }

          // Corrección automática para medios de pago
          if (
            isUpdatingPaymentMethod &&
            item.medio.toLowerCase() === originalItem.medio.toLowerCase() &&
            item.errors.payment_method
          ) {
            itemUpdates.payment_method = updates.payment_method;
            itemUpdates.errors = { ...item.errors, payment_method: false };
            needsUpdate = true;
          }

          if (needsUpdate) {
            const updatedItem = { ...item, ...itemUpdates };
            // Recalcular si todavía tiene errores
            const hasAnyError = Object.values(updatedItem.errors).some(
              (error) => error
            );
            return { ...updatedItem, hasError: hasAnyError };
          }

          return item;
        });
      });
    },
    []
  );

  const handleDeleteItem = useCallback((id: string) => {
    setPreviewData((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const importData = async () => {
    if (previewData.length === 0 || !activePeriod) return;

    // Filter out any items that still have errors
    const validItems = previewData.filter((item) => !item.hasError);

    if (validItems.length === 0) {
      toast({
        title: "No hay datos válidos",
        description:
          "Todos los registros tienen errores que deben ser corregidos antes de importar.",
        variant: "destructive",
      });
      return;
    }

    setStage("importing");
    setProgress(10);

    try {
      const result: ImportResult = {
        total: validItems.length,
        imported: 0,
        errors: [],
      };

      // Process each expense
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];

        try {
          if (
            !item.category_id ||
            !item.date ||
            !item.payment_method ||
            !item.amount
          ) {
            result.errors.push(`Registro ${i + 1}: Datos incompletos`);
            continue;
          }

          // Add expense
          addExpense(
            item.category_id,
            item.period_id || activePeriod.id,
            item.date.toISOString(),
            item.evento,
            item.payment_method,
            item.descripcion,
            item.amount
          );

          result.imported++;
        } catch (error) {
          result.errors.push(
            `Registro ${i + 1}: Error al procesar - ${(error as Error).message}`
          );
        }

        // Update progress
        setProgress(10 + Math.floor(((i + 1) / validItems.length) * 90));
      }

      setImportResult(result);
      setStage("complete");

      toast({
        title: "Importación completada",
        description: `Se importaron ${result.imported} de ${result.total} gastos.`,
      });
    } catch (error) {
      toast({
        title: "Error al importar",
        description: `Ocurrió un error durante la importación: ${
          (error as Error).message
        }`,
        variant: "destructive",
      });
    } finally {
      setProgress(100);
    }
  };

  const handleClose = () => {
    if (stage !== "importing") {
      resetState();
      onOpenChange(false);
    }
  };

  const renderContent = () => {
    switch (stage) {
      case "upload":
        return (
          <>
            <Alert className="mb-4">
              <FileSpreadsheet className="h-4 w-4" />
              <AlertTitle>Formato esperado</AlertTitle>
              <AlertDescription>
                El archivo CSV debe tener las siguientes columnas:
                <ol className="list-decimal pl-5 mt-2 space-y-1">
                  <li>
                    Categoría (debe coincidir con una categoría existente)
                  </li>
                  <li>Fecha (en formato DD/MM/YYYY)</li>
                  <li>Evento (opcional)</li>
                  <li>Medio de pago (Crédito, Débito, Efectivo)</li>
                  <li>Descripción</li>
                  <li>
                    Monto (numérico, puede incluir separadores de miles y
                    símbolo de moneda)
                  </li>
                  <li>
                    Periodo (opcional, si no se especifica se usará el periodo
                    activo)
                  </li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="grid w-full max-w-sm items-center gap-1.5 mx-auto my-6">
              <label htmlFor="csv-file" className="text-center mb-2">
                Selecciona un archivo CSV para importar gastos
              </label>
              <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg">
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
                  <label
                    htmlFor="csv-file"
                    className="cursor-pointer text-primary hover:underline"
                  >
                    Haz clic para seleccionar un archivo
                  </label>
                  {file && <p className="mt-2 text-sm">{file.name}</p>}
                </div>
              </div>

              {file && (
                <div className="space-y-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="skip-header"
                      checked={skipHeader}
                      onCheckedChange={(checked) =>
                        setSkipHeader(checked as boolean)
                      }
                    />
                    <label
                      htmlFor="skip-header"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Omitir la primera línea (contiene encabezados de columnas)
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="separator"
                        className="text-sm font-medium mb-1 block"
                      >
                        Separador de campos
                      </label>
                      <select
                        id="separator"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={separator}
                        onChange={(e) => setSeparator(e.target.value)}
                      >
                        <option value=",">Coma (,)</option>
                        <option value=";">Punto y coma (;)</option>
                        <option value="\t">Tabulación</option>
                        <option value="|">Barra vertical (|)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={loadPreview} disabled={!file}>
                Continuar
              </Button>
            </div>
          </>
        );

      case "preview":
        return (
          <CSVPreviewTable
            data={previewData}
            onUpdateItem={handleUpdateItem}
            onImport={importData}
            onCancel={handleClose}
            onDeleteItem={handleDeleteItem}
            isLoading={false}
          />
        );

      case "importing":
        return (
          <div className="py-6 text-center">
            <h3 className="font-medium mb-6">Importando datos...</h3>
            <Progress value={progress} className="mb-4" />
            <p className="text-sm text-muted-foreground">
              Por favor, espere mientras se importan los gastos.
            </p>
          </div>
        );

      case "complete":
        return (
          <div className="py-6">
            <h3 className="font-medium mb-2 text-center">
              Importación completada
            </h3>
            <div className="mb-4 text-center">
              <p>
                Se importaron {importResult?.imported} de {importResult?.total}{" "}
                gastos.
              </p>
            </div>

            {importResult && importResult.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">
                  Errores ({importResult.errors.length})
                </h4>
                <div className="max-h-48 overflow-auto bg-muted p-3 rounded text-sm">
                  <ul className="list-disc pl-5 space-y-1">
                    {importResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <Button onClick={handleClose}>Cerrar</Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={stage === "preview" ? "max-w-5xl" : "max-w-md"}>
        <DialogHeader>
          <DialogTitle>Importar gastos desde CSV</DialogTitle>
          <DialogDescription>
            Importa gastos desde un archivo CSV.
          </DialogDescription>
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
