"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PaymentMethodFilterProps {
  title: string;
  selectedMethods: string[];
  onMethodsChange: (methods: string[]) => void;
  disabled?: boolean;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "credit", label: "Crédito" },
  { value: "debit", label: "Débito" },
];

export function PaymentMethodFilter({
  title,
  selectedMethods,
  onMethodsChange,
  disabled = false,
}: PaymentMethodFilterProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const handleMethodChange = (method: string, checked: boolean) => {
    let newMethods: string[];
    
    if (checked) {
      newMethods = [...selectedMethods, method];
    } else {
      newMethods = selectedMethods.filter((m) => m !== method);
    }

    // Prevent empty selection - at least one method must be selected
    if (newMethods.length === 0) {
      return;
    }

    onMethodsChange(newMethods);
  };

  const handleSelectAll = () => {
    onMethodsChange(PAYMENT_METHODS.map((m) => m.value));
  };

  const handleDeselectAll = () => {
    // Keep at least one method selected
    onMethodsChange([PAYMENT_METHODS[0].value]);
  };

  const allSelected = selectedMethods.length === PAYMENT_METHODS.length;
  const noneSelected = selectedMethods.length === 0;

  return (
    <Card className="w-full">
      <CardHeader 
        className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors" 
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>{title}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selectedMethods.length === PAYMENT_METHODS.length
                ? "Todos"
                : `${selectedMethods.length}/${PAYMENT_METHODS.length}`}
            </span>
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardTitle>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="space-y-3 pt-0">
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={disabled || allSelected}
            className="text-xs"
          >
            Todos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            disabled={disabled || selectedMethods.length <= 1}
            className="text-xs"
          >
            Limpiar
          </Button>
        </div>

        {/* Payment Method Checkboxes */}
        <div className="space-y-2">
          {PAYMENT_METHODS.map((method) => {
            const isChecked = selectedMethods.includes(method.value);
            const isLastSelected = selectedMethods.length === 1 && isChecked;

            return (
              <div key={method.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${title}-${method.value}`}
                  checked={isChecked}
                  onCheckedChange={(checked) =>
                    handleMethodChange(method.value, checked as boolean)
                  }
                  disabled={disabled || isLastSelected}
                />
                <Label
                  htmlFor={`${title}-${method.value}`}
                  className={`text-sm ${
                    disabled || isLastSelected
                      ? "text-muted-foreground"
                      : "cursor-pointer"
                  }`}
                >
                  {method.label}
                </Label>
              </div>
            );
          })}
        </div>
        </CardContent>
      )}
    </Card>
  );
}