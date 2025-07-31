"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  X,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaymentMethod, useBudget } from "@/context/budget-context";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type CSVExpenseItem = {
  id: string;
  categoria: string;
  fecha: string;
  evento?: string;
  medio: string;
  descripcion: string;
  monto: string;
  periodo?: string;

  // Validated data
  category_id?: string;
  date?: Date;
  payment_method?: PaymentMethod;
  amount?: number;
  period_id?: string;

  // Validation status
  hasError: boolean;
  errors: {
    category?: boolean;
    date?: boolean;
    payment_method?: boolean;
    amount?: boolean;
    period?: boolean;
  };
};

interface CSVPreviewTableProps {
  data: CSVExpenseItem[];
  onUpdateItem: (id: string, updates: Partial<CSVExpenseItem>) => void;
  onImport: () => void;
  onCancel: () => void;
  onDeleteItem: (id: string) => void;
  isLoading: boolean;
}

export function CSVPreviewTable({
  data,
  onUpdateItem,
  onImport,
  onCancel,
  onDeleteItem,
  isLoading,
}: CSVPreviewTableProps) {
  const { categories, periods } = useBudget();
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  const pageSize = 50;
  const totalPages = Math.ceil(data.length / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const currentPageData = data.slice(start, end);

  const validItems = data.filter((item) => !item.hasError);
  const invalidItems = data.filter((item) => item.hasError);

  const goToNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const goToPrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const startEditing = (id: string) => {
    setEditingId(id);
  };

  const finishEditing = () => {
    setEditingId(null);
  };

  const formatAmount = (amount: string) => {
    try {
      // Remove currency symbol and thousands separators
      const cleanAmount = amount.replace(/[^\d.-]/g, "");
      const numAmount = Number(cleanAmount);
      if (isNaN(numAmount)) return amount;
      return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
      }).format(numAmount);
    } catch (e) {
      return amount;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Vista previa de importación</h3>
          <p className="text-sm text-muted-foreground">
            {data.length} registros encontrados.
            <span className="ml-2 font-medium text-green-600">
              {validItems.length} válidos
            </span>
            {invalidItems.length > 0 && (
              <span className="ml-2 font-medium text-red-600">
                {invalidItems.length} con errores
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>

          <Button
            onClick={onImport}
            disabled={invalidItems.length > 0 || isLoading || data.length === 0}
          >
            {isLoading ? "Importando..." : "Confirmar importación"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-muted z-10">
              <TableRow>
                <TableHead className="w-[50px]">Fila</TableHead>
                <TableHead className="w-[150px]">Categoría</TableHead>
                <TableHead className="w-[120px]">Fecha</TableHead>
                <TableHead className="w-[120px]">Medio de pago</TableHead>
                <TableHead className="w-[150px]">Periodo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-[100px] text-right">Monto</TableHead>
                <TableHead className="w-[80px] text-center">Estado</TableHead>
                <TableHead className="w-[120px] text-center">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPageData.map((item, index) => (
                <TableRow
                  key={item.id}
                  className={
                    item.hasError ? "bg-red-50 dark:bg-red-950/20" : ""
                  }
                >
                  <TableCell>{start + index + 1}</TableCell>
                  <TableCell
                    className={cn(item.errors.category ? "text-red-600" : "")}
                  >
                    {editingId === item.id ? (
                      <Select
                        value={item.category_id || ""}
                        onValueChange={(value) => {
                          onUpdateItem(item.id, {
                            category_id: value,
                            errors: {
                              ...item.errors,
                              category: false,
                            },
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div>
                        {item.category_id
                          ? categories.find((c) => c.id === item.category_id)
                              ?.name
                          : item.categoria}
                        {item.errors.category && (
                          <Badge variant="destructive" className="ml-2">
                            Error
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(item.errors.date ? "text-red-600" : "")}
                  >
                    {editingId === item.id ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !item.date && "text-muted-foreground"
                            )}
                          >
                            {item.date ? (
                              format(item.date, "dd/MM/yyyy", { locale: es })
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={item.date}
                            onSelect={(date) => {
                              if (date) {
                                onUpdateItem(item.id, {
                                  date,
                                  errors: {
                                    ...item.errors,
                                    date: false,
                                  },
                                });
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div>
                        {item.date && !isNaN(item.date.getTime())
                          ? format(item.date, "dd/MM/yyyy", { locale: es })
                          : item.fecha}
                        {item.errors.date && (
                          <Badge variant="destructive" className="ml-2">
                            Error
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      item.errors.payment_method ? "text-red-600" : ""
                    )}
                  >
                    {editingId === item.id ? (
                      <Select
                        value={item.payment_method || ""}
                        onValueChange={(value: PaymentMethod) => {
                          onUpdateItem(item.id, {
                            payment_method: value,
                            errors: {
                              ...item.errors,
                              payment_method: false,
                            },
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit">Crédito</SelectItem>
                          <SelectItem value="debit">Débito</SelectItem>
                          <SelectItem value="cash">Efectivo</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div>
                        {item.payment_method
                          ? item.payment_method === "credit"
                            ? "Crédito"
                            : item.payment_method === "debit"
                            ? "Débito"
                            : "Efectivo"
                          : item.medio}
                        {item.errors.payment_method && (
                          <Badge variant="destructive" className="ml-2">
                            Error
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(item.errors.period ? "text-red-600" : "")}
                  >
                    {editingId === item.id ? (
                      <Select
                        value={item.period_id || ""}
                        onValueChange={(value) => {
                          onUpdateItem(item.id, {
                            period_id: value,
                            errors: {
                              ...item.errors,
                              period: false,
                            },
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {periods.map((period) => (
                            <SelectItem key={period.id} value={period.id}>
                              {period.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div>
                        {item.period_id
                          ? periods.find((p) => p.id === item.period_id)?.name
                          : item.periodo || "Periodo activo"}
                        {item.errors.period && (
                          <Badge variant="destructive" className="ml-2">
                            Error
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.descripcion}
                    {item.evento && (
                      <span className="block text-xs text-muted-foreground">
                        Evento: {item.evento}
                      </span>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right",
                      item.errors.amount ? "text-red-600" : ""
                    )}
                  >
                    {formatAmount(item.monto)}
                    {item.errors.amount && (
                      <Badge variant="destructive" className="ml-2">
                        Error
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.hasError ? (
                      <Badge variant="destructive">Error</Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-300"
                      >
                        <Check className="h-3 w-3 mr-1" /> OK
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center space-x-1">
                      {editingId === item.id ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={finishEditing}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(item.id)}
                          disabled={!item.hasError}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteItem(item.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        {totalPages > 1 && (
          <CardFooter className="flex items-center justify-between border-t p-4">
            <div className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPrevPage}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextPage}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
