"use client";

import { useState, useEffect } from "react";
import {
  Check,
  ChevronsUpDown,
  AlertCircle,
  Loader2,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CreditCard as CreditCardType,
  CREDIT_CARD_FRANCHISE_LABELS,
} from "@/types/credit-cards";

interface CreditCardSelectorProps {
  selectedCreditCard: CreditCardType | null;
  onCreditCardChange: (creditCard: CreditCardType | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  showNoCardOption?: boolean;
  showOnlyActive?: boolean; // New prop to control active/inactive filtering
}

export function CreditCardSelector({
  selectedCreditCard,
  onCreditCardChange,
  placeholder = "Seleccionar tarjeta de crédito...",
  className,
  disabled = false,
  required = false,
  error,
  showNoCardOption = true,
  showOnlyActive = true, // Default to showing only active cards
}: CreditCardSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [creditCards, setCreditCards] = useState<CreditCardType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch credit cards on component mount
  useEffect(() => {
    const fetchCreditCards = async () => {
      setIsLoading(true);
      setFetchError(null);

      try {
        const response = await fetch("/api/credit-cards");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setCreditCards(data.credit_cards || []);
      } catch (err) {
        console.error("Error fetching credit cards:", err);
        const errorMessage = "Error cargando tarjetas de crédito";
        setFetchError(errorMessage);
        setCreditCards([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreditCards();
  }, []);

  // Format credit card display text
  const formatCreditCardDisplay = (creditCard: CreditCardType): string => {
    const franchiseLabel = CREDIT_CARD_FRANCHISE_LABELS[creditCard.franchise];
    return `${creditCard.bank_name} - ${franchiseLabel} ****${creditCard.last_four_digits}`;
  };

  // Filter credit cards based on search and active status
  const filteredCreditCards = creditCards.filter((creditCard) => {
    const displayText = formatCreditCardDisplay(creditCard);
    const matchesSearch = displayText
      .toLowerCase()
      .includes(searchValue.toLowerCase());

    // If showOnlyActive is true, only show active cards, except for the currently selected card
    if (showOnlyActive) {
      return (
        matchesSearch &&
        (creditCard.is_active || creditCard.id === selectedCreditCard?.id)
      );
    }

    return matchesSearch;
  });

  const handleSelect = (creditCardId: string | null) => {
    if (creditCardId === null) {
      onCreditCardChange(null);
    } else {
      const creditCard = creditCards.find((cc) => cc.id === creditCardId);
      onCreditCardChange(creditCard || null);
    }
    setOpen(false);
    setSearchValue("");
  };

  const getDisplayValue = () => {
    if (selectedCreditCard) {
      return formatCreditCardDisplay(selectedCreditCard);
    }
    return placeholder;
  };

  const getButtonVariant = () => {
    if (error) return "destructive";
    if (required && !selectedCreditCard) return "outline";
    return "outline";
  };

  const getButtonClassName = () => {
    let baseClass = "w-full justify-between";
    if (error) {
      baseClass += " border-destructive text-destructive";
    } else if (required && !selectedCreditCard) {
      baseClass += " border-amber-300 text-amber-700";
    }
    return cn(baseClass, className);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Button
          variant="outline"
          role="combobox"
          className={getButtonClassName()}
          disabled
        >
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando tarjetas...
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="space-y-2">
        <Button
          variant="outline"
          role="combobox"
          className={cn("w-full justify-between text-destructive", className)}
          disabled
        >
          Error cargando tarjetas
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={getButtonVariant()}
            role="combobox"
            aria-expanded={open}
            className={getButtonClassName()}
            disabled={disabled}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            <span className="truncate">{getDisplayValue()}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar tarjetas..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>No se encontraron tarjetas.</CommandEmpty>
              <CommandGroup>
                {/* No card option */}
                {showNoCardOption && (
                  <CommandItem
                    key="no-card"
                    value="no-card"
                    onSelect={() => handleSelect(null)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCreditCard === null
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1">
                      <span className="text-muted-foreground">
                        Sin tarjeta de crédito
                      </span>
                    </div>
                  </CommandItem>
                )}

                {/* Credit card options */}
                {filteredCreditCards
                  .sort((a, b) =>
                    formatCreditCardDisplay(a).localeCompare(
                      formatCreditCardDisplay(b),
                      "es",
                      { sensitivity: "base" }
                    )
                  )
                  .map((creditCard) => (
                    <CommandItem
                      key={creditCard.id}
                      value={creditCard.id}
                      onSelect={() => handleSelect(creditCard.id)}
                      className={cn(!creditCard.is_active && "opacity-60")}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCreditCard?.id === creditCard.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              !creditCard.is_active && "text-muted-foreground"
                            )}
                          >
                            {formatCreditCardDisplay(creditCard)}
                          </span>
                          {!creditCard.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Inactiva
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {CREDIT_CARD_FRANCHISE_LABELS[creditCard.franchise]}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Required field indicator */}
      {required && !selectedCreditCard && !error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Seleccione una tarjeta de crédito si desea asociarla al gasto
          </AlertDescription>
        </Alert>
      )}

      {/* No credit cards available */}
      {creditCards.length === 0 && !isLoading && !fetchError && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay tarjetas de crédito registradas. Puede crear una nueva en la
            sección de Tarjetas de Crédito.
          </AlertDescription>
        </Alert>
      )}

      {/* Selected credit card info */}
      {selectedCreditCard && (
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Tarjeta seleccionada:</span>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  !selectedCreditCard.is_active && "text-muted-foreground"
                )}
              >
                {formatCreditCardDisplay(selectedCreditCard)}
              </span>
              {!selectedCreditCard.is_active && (
                <Badge variant="secondary" className="text-xs">
                  Inactiva
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Validation utility function
export function validateCreditCard(
  selectedCreditCard: CreditCardType | null,
  required: boolean = false
): { isValid: boolean; error?: string } {
  if (required && !selectedCreditCard) {
    return {
      isValid: false,
      error: "Debe seleccionar una tarjeta de crédito",
    };
  }

  return { isValid: true };
}

// Hook for managing credit card selection state
export function useCreditCardSelection() {
  const [selectedCreditCard, setSelectedCreditCard] =
    useState<CreditCardType | null>(null);
  const [creditCards, setCreditCards] = useState<CreditCardType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch credit cards when hook is used
  useEffect(() => {
    const fetchCreditCards = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/credit-cards");
        if (!response.ok) {
          throw new Error("Failed to fetch credit cards");
        }

        const data = await response.json();
        setCreditCards(data.credit_cards || []);
      } catch (err) {
        console.error("Error fetching credit cards:", err);
        setError("Error cargando tarjetas de crédito");
        setCreditCards([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreditCards();
  }, []);

  const validation = validateCreditCard(selectedCreditCard, false);

  return {
    selectedCreditCard,
    setSelectedCreditCard,
    creditCards,
    isLoading,
    error,
    validation,
  };
}
