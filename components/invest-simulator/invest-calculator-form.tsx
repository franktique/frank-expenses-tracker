'use client';

import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SUPPORTED_CURRENCIES,
  COMPOUNDING_FREQUENCIES,
  type CurrencyCode,
  type CompoundingFrequency,
} from '@/types/invest-simulator';

export interface InvestmentFormData {
  initialAmount: number;
  monthlyContribution: number;
  termMonths: number;
  annualRate: number;
  compoundingFrequency: CompoundingFrequency;
  currency: CurrencyCode;
}

interface InvestCalculatorFormProps {
  data: InvestmentFormData;
  onChange: (data: InvestmentFormData) => void;
}

export function InvestCalculatorForm({
  data,
  onChange,
}: InvestCalculatorFormProps) {
  const handleChange = (
    field: keyof InvestmentFormData,
    value: number | string
  ) => {
    onChange({ ...data, [field]: value });
  };

  const incrementValue = (field: keyof InvestmentFormData, step: number) => {
    const currentValue = data[field] as number;
    const newValue = Math.max(0, currentValue + step);
    handleChange(field, newValue);
  };

  const formatCurrencyInput = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const parseCurrencyInput = (value: string): number => {
    const cleaned = value.replace(/[^\d]/g, '');
    return parseInt(cleaned) || 0;
  };

  return (
    <div className="space-y-6 rounded-lg bg-purple-50 p-6 dark:bg-purple-950/20">
      <h3 className="text-lg font-medium text-purple-900 dark:text-purple-100">
        Configura tu inversión
      </h3>

      {/* Monto Inicial */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">
          Imagina que empiezas con
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {SUPPORTED_CURRENCIES[data.currency].symbol}
          </span>
          <Input
            type="text"
            value={formatCurrencyInput(data.initialAmount)}
            onChange={(e) =>
              handleChange('initialAmount', parseCurrencyInput(e.target.value))
            }
            className="h-auto border-0 bg-transparent p-0 text-2xl font-bold text-purple-900 focus-visible:ring-0 dark:text-purple-100"
          />
          <div className="flex gap-1">
            <Button
              type="button"
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700"
              onClick={() => incrementValue('initialAmount', -100000)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700"
              onClick={() => incrementValue('initialAmount', 100000)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Aporte Mensual */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">
          y cada mes pones
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {SUPPORTED_CURRENCIES[data.currency].symbol}
          </span>
          <Input
            type="text"
            value={formatCurrencyInput(data.monthlyContribution)}
            onChange={(e) =>
              handleChange(
                'monthlyContribution',
                parseCurrencyInput(e.target.value)
              )
            }
            className="h-auto border-0 bg-transparent p-0 text-2xl font-bold text-purple-900 focus-visible:ring-0 dark:text-purple-100"
          />
          <div className="flex gap-1">
            <Button
              type="button"
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700"
              onClick={() => incrementValue('monthlyContribution', -50000)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700"
              onClick={() => incrementValue('monthlyContribution', 50000)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Plazo */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">durante</Label>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={data.termMonths}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 0;
              handleChange('termMonths', Math.min(600, Math.max(0, value)));
            }}
            className="h-auto w-20 border-0 bg-transparent p-0 text-2xl font-bold text-purple-900 focus-visible:ring-0 dark:text-purple-100"
          />
          <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            meses
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700"
              onClick={() => incrementValue('termMonths', -1)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700"
              onClick={() => incrementValue('termMonths', 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tasa EA */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">
          con una tasa EA de
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={data.annualRate}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              handleChange('annualRate', Math.min(100, Math.max(0, value)));
            }}
            className="h-auto w-24 border-0 bg-transparent p-0 text-2xl font-bold text-purple-900 focus-visible:ring-0 dark:text-purple-100"
          />
          <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            %
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700"
              onClick={() => {
                const newRate = Math.max(0, data.annualRate - 0.25);
                handleChange('annualRate', Math.round(newRate * 100) / 100);
              }}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700"
              onClick={() => {
                const newRate = Math.min(100, data.annualRate + 0.25);
                handleChange('annualRate', Math.round(newRate * 100) / 100);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Opciones adicionales */}
      <div className="grid grid-cols-2 gap-4 border-t border-purple-200 pt-4 dark:border-purple-800">
        {/* Frecuencia de capitalización */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Capitalización
          </Label>
          <Select
            value={data.compoundingFrequency}
            onValueChange={(value: CompoundingFrequency) =>
              handleChange('compoundingFrequency', value)
            }
          >
            <SelectTrigger className="bg-white dark:bg-gray-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(COMPOUNDING_FREQUENCIES).map(([key, freq]) => (
                <SelectItem key={key} value={key}>
                  {freq.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Moneda */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Moneda</Label>
          <Select
            value={data.currency}
            onValueChange={(value: CurrencyCode) =>
              handleChange('currency', value)
            }
          >
            <SelectTrigger className="bg-white dark:bg-gray-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SUPPORTED_CURRENCIES).map(([key, curr]) => (
                <SelectItem key={key} value={key}>
                  {curr.symbol} {curr.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
