"use client";

import { useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ValidationData {
  categoryId?: string;
  fundId?: string;
  expenseCount?: number;
  remainingFundRelationships?: number;
  affectedFunds?: string[];
  hasActiveExpenses?: boolean;
  categoryName?: string;
  fundName?: string;
}

interface CategoryFundErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  errors?: string[];
  warnings?: string[];
  validationData?: ValidationData;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  showForceOption?: boolean;
  isDestructive?: boolean;
}

export function CategoryFundErrorDialog({
  open,
  onOpenChange,
  title,
  errors = [],
  warnings = [],
  validationData,
  onConfirm,
  onCancel,
  confirmText = "Continuar",
  cancelText = "Cancelar",
  showForceOption = false,
  isDestructive = false,
}: CategoryFundErrorDialogProps) {
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {hasErrors ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <Info className="h-5 w-5 text-amber-500" />
            )}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Error Messages */}
              {hasErrors && (
                <Card className="border-destructive/20 bg-destructive/5">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Errores encontrados:
                      </h4>
                      <ul className="text-sm space-y-1">
                        {errors.map((error, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-destructive">•</span>
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Warning Messages */}
              {hasWarnings && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-amber-700 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Advertencias:
                      </h4>
                      <ul className="text-sm space-y-1">
                        {warnings.map((warning, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-amber-600">•</span>
                            <span className="text-amber-700">{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Validation Data Summary */}
              {validationData && (
                <Card className="border-muted bg-muted/20">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">
                        Información adicional:
                      </h4>
                      <div className="text-sm space-y-1">
                        {validationData.categoryName && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              Categoría:
                            </span>
                            <Badge variant="outline">
                              {validationData.categoryName}
                            </Badge>
                          </div>
                        )}
                        {validationData.fundName && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              Fondo:
                            </span>
                            <Badge variant="outline">
                              {validationData.fundName}
                            </Badge>
                          </div>
                        )}
                        {validationData.expenseCount !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              Gastos registrados:
                            </span>
                            <Badge
                              variant={
                                validationData.expenseCount > 0
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {validationData.expenseCount}
                            </Badge>
                          </div>
                        )}
                        {validationData.remainingFundRelationships !==
                          undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              Relaciones restantes:
                            </span>
                            <Badge
                              variant={
                                validationData.remainingFundRelationships === 0
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {validationData.remainingFundRelationships}
                            </Badge>
                          </div>
                        )}
                        {validationData.affectedFunds &&
                          validationData.affectedFunds.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-muted-foreground text-sm">
                                Fondos afectados:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {validationData.affectedFunds.map(
                                  (fund, index) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {fund}
                                    </Badge>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Force Option Information */}
              {showForceOption && !hasErrors && (
                <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                  <p>
                    Puedes continuar con esta operación, pero ten en cuenta las
                    advertencias mostradas arriba.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {cancelText}
          </AlertDialogCancel>
          {(!hasErrors || (hasWarnings && showForceOption)) && onConfirm && (
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                isDestructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
            >
              {confirmText}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Utility function to create error dialog props from API response
export function createErrorDialogProps(
  apiError: any,
  title: string = "Error de validación"
): Partial<CategoryFundErrorDialogProps> {
  // Handle confirmation required as warnings, not errors
  const isConfirmationRequired =
    apiError.error === "Confirmation required" ||
    apiError.details === "Confirmation required" ||
    (Array.isArray(apiError.details) &&
      apiError.details.includes("Confirmation required"));

  let errors: string[] = [];
  let warnings: string[] = [];

  if (isConfirmationRequired) {
    // Treat confirmation required as warnings
    warnings = Array.isArray(apiError.warnings)
      ? apiError.warnings
      : apiError.warnings
      ? [apiError.warnings]
      : [];
  } else {
    // Normal error handling
    errors = Array.isArray(apiError.details)
      ? apiError.details
      : apiError.details
      ? [apiError.details]
      : [apiError.error || "Error desconocido"];

    warnings = Array.isArray(apiError.warnings)
      ? apiError.warnings
      : apiError.warnings
      ? [apiError.warnings]
      : [];
  }

  return {
    title,
    errors,
    warnings,
    validationData: apiError.validation_data,
    showForceOption: apiError.can_force || isConfirmationRequired,
    isDestructive: apiError.can_force || false,
  };
}

// Hook for managing error dialog state
export function useCategoryFundErrorDialog() {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    props: Partial<CategoryFundErrorDialogProps>;
    resolve?: (value: void | PromiseLike<void>) => void;
    reject?: (reason?: any) => void;
  }>({
    open: false,
    props: {},
  });

  const showError = (
    apiError: any,
    title: string = "Error de validación",
    onConfirm?: () => void | Promise<void>
  ): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const props = createErrorDialogProps(apiError, title);

      const handleConfirm = async () => {
        try {
          if (onConfirm) {
            await onConfirm();
          }
          setDialogState({
            open: false,
            props: {},
            resolve: undefined,
            reject: undefined,
          });
          resolve();
        } catch (error) {
          setDialogState({
            open: false,
            props: {},
            resolve: undefined,
            reject: undefined,
          });
          reject(error);
        }
      };

      const handleCancel = () => {
        setDialogState({
          open: false,
          props: {},
          resolve: undefined,
          reject: undefined,
        });
        reject(new Error("User cancelled operation"));
      };

      setDialogState({
        open: true,
        props: {
          ...props,
          onConfirm: handleConfirm,
          onCancel: handleCancel,
        },
        resolve,
        reject,
      });
    });
  };

  const hideError = () => {
    // Only reject if there's a pending promise and it hasn't been resolved yet
    if (dialogState.reject && dialogState.open) {
      dialogState.reject(new Error("Dialog closed"));
    }
    setDialogState({
      open: false,
      props: {},
      resolve: undefined,
      reject: undefined,
    });
  };

  return {
    dialogState,
    showError,
    hideError,
  };
}
