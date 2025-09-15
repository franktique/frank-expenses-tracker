"use client";

import { useState } from "react";
import { Calendar, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DateUtils } from "@/types/funds";

interface RecurringDateInputProps {
  value?: number | null;
  onChange: (date: number | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function RecurringDateInput({
  value,
  onChange,
  label = "Día recurrente",
  placeholder = "Selecciona un día del mes",
  disabled = false,
  className = "",
}: RecurringDateInputProps) {
  const [isCustom, setIsCustom] = useState(false);

  // Common recurring date options
  const commonOptions = [
    { value: 1, label: "1er día del mes" },
    { value: 5, label: "5to día del mes" },
    { value: 10, label: "10mo día del mes" },
    { value: 15, label: "15to día del mes" },
    { value: 20, label: "20vo día del mes" },
    { value: 25, label: "25to día del mes" },
    { value: 31, label: "Último día del mes" },
  ];

  const handleCommonSelect = (selectedValue: string) => {
    const dateValue = parseInt(selectedValue);
    onChange(dateValue);
    setIsCustom(false);
  };

  const handleCustomInput = (inputValue: string) => {
    if (inputValue === "") {
      onChange(null);
      return;
    }

    const numValue = parseInt(inputValue);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 31) {
      onChange(numValue);
    }
  };

  const handleClear = () => {
    onChange(null);
    setIsCustom(false);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Label htmlFor="recurring-date" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {label}
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                El día del mes cuando típicamente ocurre este gasto. 
                Se usará como fecha por defecto al crear presupuestos.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex gap-2">
        <Select
          value={value?.toString() || ""}
          onValueChange={handleCommonSelect}
          disabled={disabled}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {commonOptions.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
            <SelectItem value="custom">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Personalizado...
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {isCustom || (value && !commonOptions.some(opt => opt.value === value)) ? (
          <div className="flex gap-2 flex-1">
            <Input
              type="number"
              min="1"
              max="31"
              placeholder="1-31"
              value={value || ""}
              onChange={(e) => handleCustomInput(e.target.value)}
              disabled={disabled}
              className="w-20"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
            >
              Limpiar
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCustom(true)}
            disabled={disabled}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Personalizado
          </Button>
        )}
      </div>

      {value && (
        <div className="text-sm text-muted-foreground">
          Se usará como fecha: <strong>{DateUtils.formatRecurringDate(value)}</strong>
        </div>
      )}
    </div>
  );
}