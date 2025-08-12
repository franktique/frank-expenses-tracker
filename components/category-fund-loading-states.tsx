"use client";

import { useState } from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  message?: string;
}

export function CategoryFundLoadingSpinner({
  className,
  size = "md",
  message = "Cargando...",
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}

interface OperationLoadingCardProps {
  title: string;
  description?: string;
  progress?: number;
  steps?: string[];
  currentStep?: number;
  className?: string;
}

export function CategoryFundOperationLoading({
  title,
  description,
  progress,
  steps = [],
  currentStep = 0,
  className,
}: OperationLoadingCardProps) {
  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div>
              <h3 className="font-medium">{title}</h3>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>

          {progress !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {steps.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Pasos:</h4>
              <div className="space-y-1">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {index < currentStep ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : index === currentStep ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted" />
                    )}
                    <span
                      className={cn(
                        index <= currentStep
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ButtonLoadingStateProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  disabled?: boolean;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  onClick?: () => void;
}

export function CategoryFundLoadingButton({
  isLoading,
  children,
  loadingText,
  disabled,
  variant = "default",
  size = "default",
  className,
  onClick,
}: ButtonLoadingStateProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || isLoading}
      onClick={onClick}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isLoading ? loadingText || "Cargando..." : children}
    </Button>
  );
}

interface ValidationStatusProps {
  status: "idle" | "validating" | "valid" | "invalid" | "warning";
  message?: string;
  className?: string;
}

export function CategoryFundValidationStatus({
  status,
  message,
  className,
}: ValidationStatusProps) {
  const statusConfig = {
    idle: {
      icon: null,
      color: "text-muted-foreground",
      bgColor: "bg-muted/20",
      borderColor: "border-muted",
    },
    validating: {
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/20",
    },
    valid: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    invalid: {
      icon: <AlertCircle className="h-4 w-4" />,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-destructive/20",
    },
    warning: {
      icon: <AlertCircle className="h-4 w-4" />,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
  };

  const config = statusConfig[status];

  if (status === "idle" && !message) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-md border text-sm",
        config.color,
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      {config.icon}
      {message && <span>{message}</span>}
    </div>
  );
}

// Hook for managing loading states in category-fund operations
export function useCategoryFundLoadingState() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );
  const [validationStates, setValidationStates] = useState<
    Record<string, ValidationStatusProps["status"]>
  >({});
  const [messages, setMessages] = useState<Record<string, string>>({});

  const setLoading = (key: string, loading: boolean, message?: string) => {
    setLoadingStates((prev) => ({ ...prev, [key]: loading }));
    if (message) {
      setMessages((prev) => ({ ...prev, [key]: message }));
    }
  };

  const setValidation = (
    key: string,
    status: ValidationStatusProps["status"],
    message?: string
  ) => {
    setValidationStates((prev) => ({ ...prev, [key]: status }));
    if (message) {
      setMessages((prev) => ({ ...prev, [key]: message }));
    }
  };

  const isLoading = (key: string) => loadingStates[key] || false;
  const getValidationStatus = (key: string) => validationStates[key] || "idle";
  const getMessage = (key: string) => messages[key];

  const clearState = (key: string) => {
    setLoadingStates((prev) => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
    setValidationStates((prev) => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
    setMessages((prev) => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  };

  const clearAllStates = () => {
    setLoadingStates({});
    setValidationStates({});
    setMessages({});
  };

  return {
    setLoading,
    setValidation,
    isLoading,
    getValidationStatus,
    getMessage,
    clearState,
    clearAllStates,
  };
}
