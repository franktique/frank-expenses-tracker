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
  type CurrencyCode,
  type TargetIncomeFormData,
} from '@/types/invest-simulator';

interface InvestTargetIncomeFormProps {
  data: TargetIncomeFormData;
  onChange: (data: TargetIncomeFormData) => void;
}

export function InvestTargetIncomeForm({
  data,
  onChange,
}: InvestTargetIncomeFormProps) {
  const handleChange = (
    field: keyof TargetIncomeFormData,
    value: number | string
  ) => {
    onChange({ ...data, [field]: value });
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
        Configura tu renta objetivo
      </h3>

      {/* Tasa EA */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">
          Con una tasa EA de
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

      {/* Ingreso mensual deseado */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">
          Quiero recibir cada mes
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {SUPPORTED_CURRENCIES[data.currency].symbol}
          </span>
          <Input
            type="text"
            value={formatCurrencyInput(data.targetMonthlyIncome)}
            onChange={(e) =>
              handleChange(
                'targetMonthlyIncome',
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
              onClick={() =>
                handleChange(
                  'targetMonthlyIncome',
                  Math.max(0, data.targetMonthlyIncome - 50000)
                )
              }
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700"
              onClick={() =>
                handleChange(
                  'targetMonthlyIncome',
                  data.targetMonthlyIncome + 50000
                )
              }
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Moneda */}
      <div className="border-t border-purple-200 pt-4 dark:border-purple-800">
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
