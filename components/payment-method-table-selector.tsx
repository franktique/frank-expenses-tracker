"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { MinimalPaymentMethodSelector } from "@/components/minimal-payment-method-selector";
import { PaymentMethodBadges } from "@/components/payment-method-badges";
import { Edit3, AlertCircle } from "lucide-react";

interface PaymentMethodTableSelectorProps {
  selectedMethods: string[];
  onSelectionChange: (methods: string[]) => void;
  disabled?: boolean;
  hasUnsavedChanges?: boolean;
  validationError?: string;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
}

export function PaymentMethodTableSelector({
  selectedMethods,
  onSelectionChange,
  disabled = false,
  hasUnsavedChanges = false,
  validationError,
  onValidationChange,
}: PaymentMethodTableSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectionChange = (methods: string[]) => {
    try {
      onSelectionChange(methods);
      setIsOpen(false);
    } catch (error) {
      console.error("Error changing payment method selection:", error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <PaymentMethodBadges selectedMethods={selectedMethods} />
        {validationError && (
          <div className="text-xs text-red-600 mt-1">{validationError}</div>
        )}
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className={
              hasUnsavedChanges ? "text-orange-600 hover:text-orange-700" : ""
            }
            title={
              disabled
                ? "Edición deshabilitada"
                : "Editar métodos de pago para este agrupador"
            }
          >
            <Edit3 className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <MinimalPaymentMethodSelector
            selectedMethods={selectedMethods}
            onSelectionChange={handleSelectionChange}
            disabled={disabled}
            className="border-0 shadow-none"
          />
        </PopoverContent>
      </Popover>

      {hasUnsavedChanges && (
        <div
          className="flex items-center"
          title="Tienes cambios sin guardar en los métodos de pago. Haz clic en 'Guardar Cambios' para aplicar los cambios."
        >
          <AlertCircle className="w-4 h-4 text-orange-500" />
        </div>
      )}
    </div>
  );
}
