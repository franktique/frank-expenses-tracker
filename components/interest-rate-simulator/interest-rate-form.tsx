"use client";

import { Minus, Plus, HelpCircle } from "lucide-react";
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
import { RATE_TYPES, type RateType } from "@/types/interest-rate-simulator";

export interface InterestRateFormData {
  inputRate: number; // As percentage (e.g., 12 for 12%)
  inputRateType: RateType;
}

interface InterestRateFormProps {
  data: InterestRateFormData;
  onChange: (data: InterestRateFormData) => void;
}

export function InterestRateForm({ data, onChange }: InterestRateFormProps) {
  const handleRateChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 1000) {
      onChange({ ...data, inputRate: numValue });
    } else if (value === "" || value === ".") {
      onChange({ ...data, inputRate: 0 });
    }
  };

  const handleRateTypeChange = (value: RateType) => {
    onChange({ ...data, inputRateType: value });
  };

  const incrementRate = (step: number) => {
    const newValue = Math.max(0, Math.min(1000, data.inputRate + step));
    onChange({ ...data, inputRate: Math.round(newValue * 100) / 100 });
  };

  const formatRateDisplay = (value: number): string => {
    // Format with up to 4 decimal places, removing trailing zeros
    return value.toFixed(4).replace(/\.?0+$/, "");
  };

  return (
    <div className="space-y-6 p-6 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-100 dark:border-purple-900">
      {/* Rate Input */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-lg font-semibold">Tasa de Interés</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Ingresa la tasa de interés que deseas convertir. Puede ser cualquier valor entre 0% y 1000%.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="number"
              value={formatRateDisplay(data.inputRate)}
              onChange={(e) => handleRateChange(e.target.value)}
              className="text-3xl font-bold h-16 text-center bg-white dark:bg-gray-950 border-purple-200 dark:border-purple-800 focus:border-purple-500"
              min={0}
              max={1000}
              step={0.01}
            />
            <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">%</span>
          </div>

          <div className="flex flex-col gap-1">
            <Button
              variant="default"
              size="icon"
              className="h-8 w-8 rounded-full bg-purple-600 hover:bg-purple-700"
              onClick={() => incrementRate(1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="h-8 w-8 rounded-full bg-purple-600 hover:bg-purple-700"
              onClick={() => incrementRate(-1)}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs px-2"
              onClick={() => incrementRate(0.1)}
            >
              +0.1
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs px-2"
              onClick={() => incrementRate(-0.1)}
            >
              -0.1
            </Button>
          </div>
        </div>
      </div>

      {/* Rate Type Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-lg font-semibold">Tipo de Tasa</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Selecciona el tipo de tasa que estás ingresando. La calculadora convertirá automáticamente a todos los demás tipos.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Select value={data.inputRateType} onValueChange={handleRateTypeChange}>
          <SelectTrigger className="w-full h-12 text-base bg-white dark:bg-gray-950 border-purple-200 dark:border-purple-800">
            <SelectValue placeholder="Selecciona el tipo de tasa" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RATE_TYPES).map(([key, rateType]) => (
              <SelectItem key={key} value={key} className="py-3">
                <div className="flex flex-col">
                  <span className="font-medium">{rateType.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {rateType.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Selected type description */}
        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-md">
          <p className="text-sm text-purple-700 dark:text-purple-300">
            <span className="font-semibold">{RATE_TYPES[data.inputRateType].label}:</span>{" "}
            {RATE_TYPES[data.inputRateType].description}
          </p>
        </div>
      </div>

      {/* Quick presets */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Tasas comunes:</Label>
        <div className="flex flex-wrap gap-2">
          {[5, 8, 10, 12, 15, 18, 20, 24, 30].map((rate) => (
            <Button
              key={rate}
              variant={data.inputRate === rate ? "default" : "outline"}
              size="sm"
              className={
                data.inputRate === rate
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "hover:bg-purple-50 dark:hover:bg-purple-950"
              }
              onClick={() => onChange({ ...data, inputRate: rate })}
            >
              {rate}%
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
