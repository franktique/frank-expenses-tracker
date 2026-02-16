'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TIPO_GASTO_VALUES, TIPO_GASTO_LABELS, TipoGasto } from '@/types/funds';
import { Label } from '@/components/ui/label';

interface TipoGastoSelectProps {
  value?: TipoGasto;
  onValueChange: (value: TipoGasto) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export function TipoGastoSelect({
  value,
  onValueChange,
  label = 'Tipo de Gasto',
  placeholder = 'Selecciona el tipo de gasto',
  disabled = false,
  required = false,
}: TipoGastoSelectProps) {
  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </Label>
      )}
      <Select
        value={value || ''}
        onValueChange={(val) => onValueChange(val as TipoGasto)}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TIPO_GASTO_VALUES.FIJO}>
            {TIPO_GASTO_LABELS.F} (Fijo)
          </SelectItem>
          <SelectItem value={TIPO_GASTO_VALUES.VARIABLE}>
            {TIPO_GASTO_LABELS.V} (Variable)
          </SelectItem>
          <SelectItem value={TIPO_GASTO_VALUES.SEMI_FIJO}>
            {TIPO_GASTO_LABELS.SF} (Semi Fijo)
          </SelectItem>
          <SelectItem value={TIPO_GASTO_VALUES.EVENTUAL}>
            {TIPO_GASTO_LABELS.E} (Eventual)
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
